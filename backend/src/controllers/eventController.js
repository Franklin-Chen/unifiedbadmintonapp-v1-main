const db = require('../config/db');
const { checkGroupMembership, checkGroupAdmin } = require('../utils/groupUtils');
const { keysToCamel } = require('../utils/caseConverter'); // Import converter

// createEvent is protected by isGroupAdmin middleware
exports.createEvent = async (req, res, next) => {
    const { groupId } = req.params;
    const creatorId = req.user.userId;
    // Expect camelCase input from frontend now
    const { name, dateTime, location, courtDetails, suggestedCost, maxPlayers, skillLevel, description, dropDeadlineHours } = req.body;

    // Validation logic using camelCase vars
    let deadline = null;
    if (dropDeadlineHours !== undefined && dropDeadlineHours !== null && dropDeadlineHours !== '') {
        deadline = parseInt(dropDeadlineHours, 10);
        if (isNaN(deadline) || deadline < 0) {
            return res.status(400).json({ error: 'Drop Deadline must be a non-negative number of hours (or leave blank).' });
        }
    }
    let parsedDateTime;
    try {
        parsedDateTime = new Date(dateTime);
        if (isNaN(parsedDateTime.getTime())) throw new Error('Invalid date/time format.');
        if (parsedDateTime <= new Date()) return res.status(400).json({ error: 'Event date and time must be in the future.' });
    } catch (e) {
        return res.status(400).json({ error: 'Invalid date/time format provided.' });
    }

    try {
        // Insert using snake_case column names
        const result = await db.query(
            `INSERT INTO events (group_id, creator_id, name, date_time, location, court_details, suggested_cost, max_players, skill_level, description, drop_deadline_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [groupId, creatorId, name, parsedDateTime, location, courtDetails, suggestedCost, maxPlayers, skillLevel, description, deadline]
        );
        // Convert result keys to camelCase
        res.status(201).json(keysToCamel(result.rows[0]));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};

// getGroupEvents is accessible by members
exports.getGroupEvents = async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    try {
        const { isMember } = await checkGroupMembership(groupId, userId);
        if (!isMember) {
            const groupExists = await db.query('SELECT 1 FROM groups WHERE id = $1', [groupId]);
            if (groupExists.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
            return res.status(403).json({ error: 'Forbidden: You must be a member to view group events' });
        }

        // Select using snake_case aliases for clarity before conversion
        const result = await db.query(
            `SELECT
                e.id as event_id, e.name, e.date_time, e.location, e.suggested_cost, e.max_players,
                (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as current_players,
                (SELECT COUNT(*) FROM waitlist_entries w WHERE w.event_id = e.id) as waitlist_count
             FROM events e
             WHERE e.group_id = $1 AND e.date_time >= NOW()
             ORDER BY e.date_time ASC`,
            [groupId]
        );
        // Convert results array keys to camelCase
        res.status(200).json(keysToCamel(result.rows));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};

// getEventDetails is accessible by members
exports.getEventDetails = async (req, res, next) => {
    const { eventId } = req.params;
    const userId = req.user.userId;
    try {
        // Fetch event details (snake_case)
        const eventResult = await db.query(
            `SELECT e.*, g.id as group_id, u.id as creator_user_id, u.name as creator_name
             FROM events e
             JOIN groups g ON e.group_id = g.id
             JOIN users u ON e.creator_id = u.id
             WHERE e.id = $1`,
            [eventId]
        );
        if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        const eventData = eventResult.rows[0];

        const membership = await checkGroupMembership(eventData.group_id, userId);
        if (!membership.isMember) return res.status(403).json({ error: 'Forbidden: You must be a member of the group to view this event' });

        // Fetch registrations (snake_case)
        const registrationsResult = await db.query(
            `SELECT r.id as registration_id, r.paid, u.id as user_id, u.name
             FROM registrations r JOIN users u ON r.user_id = u.id
             WHERE r.event_id = $1 ORDER BY r.registration_time ASC`,
            [eventId]
        );
        // Fetch waitlist (snake_case)
        const waitlistResult = await db.query(
            `SELECT w.id as waitlist_entry_id, w.waitlist_time, u.id as user_id, u.name
             FROM waitlist_entries w JOIN users u ON w.user_id = u.id
             WHERE w.event_id = $1 ORDER BY w.waitlist_time ASC`,
            [eventId]
        );

        // Construct the response object using camelCase keys where appropriate
        const response = {
            // Manually map snake_case from eventData to camelCase
            eventId: eventData.id,
            groupId: eventData.group_id,
            name: eventData.name,
            dateTime: eventData.date_time,
            location: eventData.location,
            courtDetails: eventData.court_details,
            suggestedCost: eventData.suggested_cost,
            maxPlayers: eventData.max_players,
            skillLevel: eventData.skill_level,
            description: eventData.description,
            dropDeadlineHours: eventData.drop_deadline_hours,
            creator: { userId: eventData.creator_user_id, name: eventData.creator_name },
            // Convert nested arrays
            registrations: keysToCamel(registrationsResult.rows),
            waitlist: keysToCamel(waitlistResult.rows),
            currentPlayers: registrationsResult.rows.length,
            waitlistCount: waitlistResult.rows.length,
            currentUserRole: membership.role
        };

        res.status(200).json(response); // Already camelCased during construction
    } catch (err) {
        next(err); // Pass error to central handler
    }
};

// updateEvent is protected by isEventAdmin middleware
exports.updateEvent = async (req, res, next) => {
    const { eventId } = req.params;
    const {
        name, dateTime, location, courtDetails,
        suggestedCost, maxPlayers, skillLevel, description,
        dropDeadlineHours
    } = req.body;

    try {
        // Optional: Explicitly check if event exists.
        // While isEventAdmin middleware implies existence and authorization,
        // an explicit check here can provide a clearer 404 if the event ID is simply wrong.
        const existingEvent = await db.query('SELECT id FROM events WHERE id = $1', [eventId]);
        if (existingEvent.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        const fieldsToUpdate = [];
        const values = [];
        let queryIndex = 1;

        // Name
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ error: 'Event name cannot be empty.' });
            }
            fieldsToUpdate.push(`name = $${queryIndex++}`);
            values.push(name.trim());
        }

        // DateTime
        if (dateTime !== undefined) {
            if (!dateTime) { // Handles null or empty string explicitly if sent
                return res.status(400).json({ error: 'Event date and time cannot be empty if provided for update.' });
            }
            try {
                const parsedDateTimeUpdate = new Date(dateTime);
                if (isNaN(parsedDateTimeUpdate.getTime())) {
                    throw new Error('Invalid date/time format.');
                }
                // Optional: Add future date validation if required by business logic for updates
                if (parsedDateTimeUpdate <= new Date()) {
                    return res.status(400).json({ error: 'Event date and time must be in the future.' });
                }
                fieldsToUpdate.push(`date_time = $${queryIndex++}`);
                values.push(parsedDateTimeUpdate);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid date/time format provided for event update.' });
            }
        }

        // Location
        if (location !== undefined) {
            fieldsToUpdate.push(`location = $${queryIndex++}`);
            values.push(location); // Allows null or empty string if schema permits
        }

        // CourtDetails
        if (courtDetails !== undefined) {
            fieldsToUpdate.push(`court_details = $${queryIndex++}`);
            values.push(courtDetails);
        }

        // SuggestedCost
        if (suggestedCost !== undefined) {
            let costValue = null;
            if (suggestedCost !== null && String(suggestedCost).trim() !== '') {
                costValue = parseFloat(suggestedCost);
                if (isNaN(costValue) || costValue < 0) {
                    return res.status(400).json({ error: 'Suggested cost must be a non-negative number or empty/null.' });
                }
            }
            fieldsToUpdate.push(`suggested_cost = $${queryIndex++}`);
            values.push(costValue);
        }

        // MaxPlayers
        if (maxPlayers !== undefined) {
            let numPlayersValue = null;
            if (maxPlayers !== null && String(maxPlayers).trim() !== '') {
                numPlayersValue = parseInt(maxPlayers, 10);
                if (isNaN(numPlayersValue) || numPlayersValue < 0) { // Max players can be 0 for unlimited, adjust if needed
                    return res.status(400).json({ error: 'Max players must be a non-negative integer or empty/null.' });
                }
            }
            fieldsToUpdate.push(`max_players = $${queryIndex++}`);
            values.push(numPlayersValue);
        }

        // SkillLevel
        if (skillLevel !== undefined) {
            fieldsToUpdate.push(`skill_level = $${queryIndex++}`);
            values.push(skillLevel);
        }

        // Description
        if (description !== undefined) {
            fieldsToUpdate.push(`description = $${queryIndex++}`);
            values.push(description);
        }

        // DropDeadlineHours
        let validatedDeadline = null;
        if (dropDeadlineHours !== undefined) { 
            if (dropDeadlineHours === null || dropDeadlineHours === '') {
                validatedDeadline = null;
            } else {
                validatedDeadline = parseInt(dropDeadlineHours, 10);
                if (isNaN(validatedDeadline) || validatedDeadline < 0) {
                    return res.status(400).json({ error: 'Drop Deadline must be a non-negative number of hours (or null/blank).' });
                }
            }
            fieldsToUpdate.push(`drop_deadline_hours = $${queryIndex++}`);
            values.push(validatedDeadline);
        }

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ error: 'No fields provided for update or no changes detected.' });
        }

        // Add updated_at timestamp
        fieldsToUpdate.push(`updated_at = NOW()`);

        values.push(eventId);

        const updateQuery = `
            UPDATE events
            SET ${fieldsToUpdate.join(', ')}
            WHERE id = $${queryIndex}
            RETURNING *`;

        const result = await db.query(updateQuery, values);

        if (result.rowCount === 0) {
            // This case should ideally be caught by the initial check or if the event was deleted concurrently.
            return res.status(404).json({ error: 'Event not found or no changes applied.' });
        }
        // Convert result keys to camelCase
        res.status(200).json(keysToCamel(result.rows[0]));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};

// deleteEvent is protected by isEventAdmin middleware
exports.deleteEvent = async (req, res, next) => {
    const { eventId } = req.params;
    try {
        const deleteResult = await db.query('DELETE FROM events WHERE id = $1 RETURNING id', [eventId]);
        if (deleteResult.rowCount === 0) return res.status(404).json({ error: 'Event not found.' });
        res.status(200).json(keysToCamel({ message: 'Event cancelled successfully' })); // Convert response
    } catch (err) {
        next(err); // Pass error to central handler
    }
};