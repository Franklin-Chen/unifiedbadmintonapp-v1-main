const db = require('../config/db'); // ***** Added DB Import *****
const { checkGroupAdmin } = require('../utils/groupUtils');

// Middleware to check if the authenticated user is an admin of the specified group
const isGroupAdmin = async (req, res, next) => {
    const userId = req.user?.userId; // Assumes authenticateToken middleware runs first
    // Group ID might be in params or body depending on the route
    const groupId = req.params.groupId || req.body.groupId;

    console.log(`[isGroupAdmin] Checking user ${userId} for admin role in group ${groupId} (Path: ${req.path})`); // Log entry

    if (!userId) {
        console.log('[isGroupAdmin] Failed: No userId found in req.user');
        return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!groupId) {
        console.error("[isGroupAdmin] Failed: groupId not found in request params or body for path:", req.path);
        return res.status(500).json({ error: 'Internal Server Error: Group context missing.' });
    }

    try {
        const { isMember, isAdmin } = await checkGroupAdmin(groupId, userId);
        console.log(`[isGroupAdmin] Check result for user ${userId} in group ${groupId}: isMember=${isMember}, isAdmin=${isAdmin}`); // Log result

        if (!isMember || !isAdmin) {
            console.warn(`[isGroupAdmin] Authorization failed: User ${userId} is not an admin for group ${groupId}`);
            return res.status(403).json({ error: 'Forbidden: Admin privileges required for this group.' });
        }

        console.log(`[isGroupAdmin] Authorization successful for user ${userId} in group ${groupId}`);
        next(); // Authorized
    } catch (err) {
        console.error(`[isGroupAdmin] Error during check for user ${userId} in group ${groupId}:`, err);
        next(err); // Pass error to central handler
    }
};

// Middleware factory to check admin status based on eventId or registrationId
const isEventAdmin = async (req, res, next) => {
    // ***** ADD LOG HERE *****
    console.log(`[isEventAdmin] Middleware entered for path: ${req.path}`);
    // ***********************

    const userId = req.user?.userId;
    const eventId = req.params.eventId;
    const registrationId = req.params.registrationId;
    let targetId = eventId || registrationId;
    let idType = eventId ? 'eventId' : (registrationId ? 'registrationId' : 'none');

    console.log(`[isEventAdmin] Checking user ${userId} for admin role via ${idType} ${targetId} (Path: ${req.path})`);

    if (!userId) {
        console.log('[isEventAdmin] Failed: No userId found in req.user');
        return res.status(401).json({ error: 'Authentication required.' });
    }

    let groupId;

    try {
        if (eventId) {
            console.log(`[isEventAdmin] Looking up group via eventId: ${eventId}`);
            const eventResult = await db.query('SELECT group_id FROM events WHERE id = $1', [eventId]);
            if (eventResult.rows.length === 0) {
                console.log(`[isEventAdmin] Failed: Event ${eventId} not found.`);
                return res.status(404).json({ error: 'Event not found.' });
            }
            groupId = eventResult.rows[0].group_id;
            console.log(`[isEventAdmin] Found groupId ${groupId} from event ${eventId}`);
        } else if (registrationId) {
            console.log(`[isEventAdmin] Looking up group via registrationId: ${registrationId}`);
            const regResult = await db.query('SELECT e.group_id FROM registrations r JOIN events e ON r.event_id = e.id WHERE r.id = $1', [registrationId]);
            if (regResult.rows.length === 0) {
                console.log(`[isEventAdmin] Failed: Registration ${registrationId} not found.`);
                return res.status(404).json({ error: 'Registration not found.' });
            }
            groupId = regResult.rows[0].group_id;
            console.log(`[isEventAdmin] Found groupId ${groupId} from registration ${registrationId}`);
        } else {
            console.error("[isEventAdmin] Failed: eventId or registrationId not found in request params for path:", req.path);
            return res.status(500).json({ error: 'Internal Server Error: Event/Registration context missing.' });
        }

        if (!groupId) {
            console.error("[isEventAdmin] Failed: Could not determine groupId for path:", req.path);
            return res.status(500).json({ error: 'Internal Server Error: Could not determine group context.' });
        }

        console.log(`[isEventAdmin] Checking admin status for user ${userId} in group ${groupId}`);
        const { isMember, isAdmin } = await checkGroupAdmin(groupId, userId);
        console.log(`[isEventAdmin] Check result: isMember=${isMember}, isAdmin=${isAdmin}`);

        if (!isMember || !isAdmin) {
            console.warn(`[isEventAdmin] Authorization failed: User ${userId} is not an admin for group ${groupId}`);
            return res.status(403).json({ error: 'Forbidden: Admin privileges required for this event\'s group.' });
        }

        console.log(`[isEventAdmin] Authorization successful for user ${userId} in group ${groupId}`);
        req.eventGroupId = groupId;
        next();

    } catch (err) {
        console.error(`[isEventAdmin] Error during check for user ${userId} via ${idType} ${targetId}:`, err);
        next(err);
    }
};


module.exports = { isGroupAdmin, isEventAdmin };