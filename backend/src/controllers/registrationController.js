const db = require('../config/db');
const { checkGroupMembership, checkGroupAdmin } = require('../utils/groupUtils');
const { keysToCamel } = require('../utils/caseConverter'); // Import converter

// Helper: isPastDropDeadline
const isPastDropDeadline = (event) => {
    // Expect event object with camelCase keys from controller logic
    if (event.dropDeadlineHours === null || event.dropDeadlineHours === undefined) return false;
    const eventTime = new Date(event.dateTime).getTime();
    const deadlineTime = eventTime - (event.dropDeadlineHours * 60 * 60 * 1000);
    return Date.now() > deadlineTime;
};
// Helper: promoteFromWaitlist
const promoteFromWaitlist = async (eventId, client) => {
    // Use the provided client for transaction consistency, or the default db pool if not in a transaction
    const queryRunner = client || db;
    try {
        // Select the first user from the waitlist for this event
        const waitlistResult = await queryRunner.query(
            `SELECT id, user_id FROM waitlist_entries 
             WHERE event_id = $1 
             ORDER BY waitlist_time ASC 
             LIMIT 1`,
            [eventId]
        );

        if (waitlistResult.rows.length > 0) {
            const { id: waitlistEntryId, user_id: promotedUserId } = waitlistResult.rows[0];

            // Insert the promoted user into registrations
            // Assuming 'paid' defaults to FALSE for promoted users, adjust if needed
            const registrationInsertResult = await queryRunner.query(
                `INSERT INTO registrations (event_id, user_id, registration_time, paid) 
                 VALUES ($1, $2, NOW(), FALSE) 
                 RETURNING id`,
                [eventId, promotedUserId]
            );

            if (registrationInsertResult.rowCount === 0) {
                // This should ideally not happen if the user_id is valid and event_id is valid
                console.error(`Failed to insert promoted user ${promotedUserId} into registrations for event ${eventId}.`);
                if (!client) throw new Error('Promotion failed: Could not insert into registrations.');
                return null; 
            }
            
            // Delete the user from the waitlist
            await queryRunner.query(
                'DELETE FROM waitlist_entries WHERE id = $1',
                [waitlistEntryId]
            );

            console.log(`User ${promotedUserId} (waitlist entry ${waitlistEntryId}) promoted to event ${eventId}. New registration ID: ${registrationInsertResult.rows[0].id}`);
            return promotedUserId; // Return the user_id of the promoted user
        }
        console.log(`No users on waitlist to promote for event ${eventId}.`);
        return null; // No one to promote
    } catch (error) {
        console.error(`Error in promoteFromWaitlist for event ${eventId}:`, error);
        if (client) {
            throw error; // Re-throw to be caught by the calling transaction block
        }
        return null; // Indicate promotion failed
    }
};
// Helper: checkEventGroupAdmin
const checkEventGroupAdmin = async (registrationId, requesterId) => {
    try {
        const result = await db.query(
            `SELECT g.admin_user_id
             FROM registrations r
             JOIN events e ON r.event_id = e.id
             JOIN groups g ON e.group_id = g.id
             WHERE r.id = $1`,
            [registrationId]
        );

        if (result.rows.length === 0) {
            // Registration or associated event/group not found
            return false;
        }

        const groupAdminId = result.rows[0].admin_user_id;
        return groupAdminId === requesterId;

    } catch (error) {
        console.error('Error in checkEventGroupAdmin:', error);
        // In case of an error, assume the user is not an admin for safety
        return false;
    }
};


exports.registerOrWaitlist = async (req, res, next) => {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Get event details, lock row
        const eventResult = await client.query(
            'SELECT group_id, max_players FROM events WHERE id = $1 FOR UPDATE',
            [eventId]
        );
        if (eventResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Event not found' });
        }
        const { group_id: groupId, max_players: maxPlayersDb } = eventResult.rows[0]; // Renamed maxPlayers to avoid conflict

        // Check membership
        const membershipResult = await client.query('SELECT 1 FROM group_memberships WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
        const isMember = membershipResult.rows.length > 0;
        if (!isMember) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Forbidden: You must be a member of the group to register/waitlist for this event' });
        }

        // Check if already registered or waitlisted
        const existingReg = await client.query('SELECT 1 FROM registrations WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
        if (existingReg.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Conflict: Already registered for this event' });
        }
        const existingWaitlist = await client.query('SELECT 1 FROM waitlist_entries WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
        if (existingWaitlist.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Conflict: Already on the waitlist for this event' });
        }

        const registrationCountResult = await client.query('SELECT COUNT(*) as count FROM registrations WHERE event_id = $1', [eventId]); // Use event_id
        const currentPlayers = parseInt(registrationCountResult.rows[0].count, 10);

        if (currentPlayers < maxPlayersDb) {
            // Register
            const registrationResult = await client.query(
                'INSERT INTO registrations (event_id, user_id) VALUES ($1, $2) RETURNING id, paid',
                [eventId, userId]
            );
            await client.query('COMMIT');
            // Convert response keys
            res.status(201).json({
                status: "registered",
                message: 'Successfully registered for event',
                registrationId: registrationResult.rows[0].id,
                eventId: eventId,
                userId: userId,
                paid: registrationResult.rows[0].paid,
            });
        } else {
            // Waitlist
            const waitlistResult = await client.query(
                'INSERT INTO waitlist_entries (event_id, user_id) VALUES ($1, $2) RETURNING id',
                [eventId, userId]
            );
            const positionResult = await client.query(
                'SELECT COUNT(*) as position FROM waitlist_entries WHERE event_id = $1 AND waitlist_time <= (SELECT waitlist_time FROM waitlist_entries WHERE id = $2)',
                [eventId, waitlistResult.rows[0].id]
            );
            await client.query('COMMIT');
            const position = parseInt(positionResult.rows[0].position, 10);
            res.status(201).json({
                status: "waitlisted",
                message: 'Event is full. Added to waitlist.',
                waitlistEntryId: waitlistResult.rows[0].id,
                eventId: eventId,
                userId: userId,
                waitlistPosition: position
            });
        }
    } catch (err) {
        await client.query('ROLLBACK');
        next(err); // Pass error to central handler
    } finally { client.release(); }
};

exports.getMyStatus = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        // Fetch using snake_case aliases
        const result = await db.query(
            `SELECT
                e.id as event_id, e.name as event_name, e.date_time, e.group_id, g.name as group_name,
                e.max_players,
                (SELECT COUNT(*) FROM registrations WHERE event_id = e.id) as current_players,
                (SELECT COUNT(*) FROM waitlist_entries WHERE event_id = e.id) as waitlist_count,
                r.id as registration_id, r.paid,
                w.id as waitlist_entry_id, w.waitlist_time,
                CASE WHEN r.id IS NOT NULL THEN 'registered' WHEN w.id IS NOT NULL THEN 'waitlisted' ELSE 'none' END as status
             FROM events e
             JOIN groups g ON e.group_id = g.id
             LEFT JOIN registrations r ON e.id = r.event_id AND r.user_id = $1
             LEFT JOIN waitlist_entries w ON e.id = w.event_id AND w.user_id = $1
             WHERE e.date_time >= NOW() AND (r.id IS NOT NULL OR w.id IS NOT NULL)
             ORDER BY e.date_time ASC`,
            [userId]
        );

        // Manually construct camelCase response
        const finalResults = await Promise.all(result.rows.map(async (row) => {
            let waitlistPosition = null;
            if (row.status === 'waitlisted') {
                const posResult = await db.query(
                    `SELECT COUNT(*) FROM waitlist_entries
                     WHERE event_id = $1 AND waitlist_time <= $2`,
                    [row.event_id, row.waitlist_time]
                );
                waitlistPosition = parseInt(posResult.rows[0].count, 10);
            }
            return {
                event: {
                    eventId: row.event_id, groupId: row.group_id, groupName: row.group_name, name: row.event_name,
                    dateTime: row.date_time, maxPlayers: row.max_players, currentPlayers: parseInt(row.current_players, 10),
                    waitlistCount: parseInt(row.waitlist_count, 10)
                },
                status: row.status, registrationId: row.registration_id, paid: row.paid,
                waitlistEntryId: row.waitlist_entry_id, waitlistPosition: waitlistPosition
            };
        }));
        res.status(200).json(finalResults); // Already camelCased
    } catch (err) {
        next(err); // Pass error to central handler
    }
};


exports.cancelMyRegistrationOrWaitlist = async (req, res, next) => {
    const registrationId = req.params.registrationId;
    const waitlistEntryId = req.params.waitlistEntryId;
    const userId = req.user.userId;

    if (!registrationId && !waitlistEntryId) return res.status(400).json({ error: 'Missing registrationId or waitlistEntryId' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        let promotedUserId = null;
        let responseMessage = '';

        if (registrationId) {
            const regResult = await client.query(
                `SELECT r.user_id, e.id as event_id, e.date_time, e.drop_deadline_hours
                 FROM registrations r JOIN events e ON r.event_id = e.id WHERE r.id = $1`,
                [registrationId]
            );
            if (regResult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Registration not found' }); }
            const registration = regResult.rows[0];
            if (registration.user_id !== userId) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Forbidden: You can only cancel your own registration' }); }
            // Pass object with snake_case keys to helper
            const eventDetailsForDeadlineCheck = keysToCamel({
                date_time: registration.date_time,
                drop_deadline_hours: registration.drop_deadline_hours
            });
            if (isPastDropDeadline(eventDetailsForDeadlineCheck)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Cannot cancel registration after the drop deadline has passed.' });
            }
            await client.query('DELETE FROM registrations WHERE id = $1', [registrationId]);
            promotedUserId = await promoteFromWaitlist(registration.event_id, client);
            responseMessage = 'Registration cancelled successfully';
        } else { // waitlistEntryId
            const deleteResult = await client.query(
                'DELETE FROM waitlist_entries WHERE id = $1 AND user_id = $2 RETURNING id',
                [waitlistEntryId, userId]
            );
            if (deleteResult.rowCount === 0) {
                await client.query('ROLLBACK');
                const existsResult = await client.query('SELECT 1 FROM waitlist_entries WHERE id = $1', [waitlistEntryId]);
                if (existsResult.rows.length === 0) return res.status(404).json({ error: 'Waitlist entry not found' });
                else return res.status(403).json({ error: 'Forbidden: You can only leave your own waitlist entry' });
            }
            responseMessage = 'Successfully left waitlist';
        }

        await client.query('COMMIT');
        // Convert response keys
        res.status(200).json(keysToCamel({
            message: responseMessage,
            promoted_user_id: promotedUserId // Use snake_case before conversion
        }));

    } catch (err) {
        await client.query('ROLLBACK');
        next(err); // Pass error to central handler
    } finally { client.release(); }
};


// updatePaymentStatus is protected by isEventAdmin middleware
exports.updatePaymentStatus = async (req, res, next) => {
    const { registrationId } = req.params;
    const { paid } = req.body;
    try {
        // Middleware verified admin status
        const updateResult = await db.query(
            'UPDATE registrations SET paid = $1 WHERE id = $2 RETURNING id, paid',
            [paid, registrationId]
        );
        if (updateResult.rowCount === 0) return res.status(404).json({ error: 'Registration not found.' });
        // Convert response keys
        res.status(200).json(keysToCamel({
            message: 'Payment status updated successfully',
            registration_id: updateResult.rows[0].id, // Use snake_case before conversion
            paid: updateResult.rows[0].paid,
        }));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};

// removeRegistrationByCreator is protected by isEventAdmin middleware
exports.removeRegistrationByCreator = async (req, res, next) => {
    const { registrationId } = req.params;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        // Middleware verified admin status
        const regInfoResult = await client.query(
            `SELECT e.id as event_id, e.date_time, e.drop_deadline_hours
             FROM registrations r JOIN events e ON r.event_id = e.id WHERE r.id = $1`,
            [registrationId]
        );
        if (regInfoResult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Registration not found.' }); }
        const registrationInfo = regInfoResult.rows[0];

        const deleteResult = await client.query('DELETE FROM registrations WHERE id = $1 RETURNING id', [registrationId]);
        if (deleteResult.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Registration not found during deletion' }); }

        let promotedUserId = null;
        const eventDetailsForDeadlineCheck = keysToCamel({
            date_time: registrationInfo.date_time,
            drop_deadline_hours: registrationInfo.drop_deadline_hours
        });
        // Pass camelCased object to helper
        if (!isPastDropDeadline(eventDetailsForDeadlineCheck)) {
            promotedUserId = await promoteFromWaitlist(registrationInfo.event_id, client);
        }
        await client.query('COMMIT');
        // Convert response keys
        res.status(200).json(keysToCamel({
            message: 'Registration removed successfully',
            promoted_user_id: promotedUserId // Use snake_case before conversion
        }));
    } catch (err) {
        await client.query('ROLLBACK');
        next(err); // Pass error to central handler
    } finally { client.release(); }
};