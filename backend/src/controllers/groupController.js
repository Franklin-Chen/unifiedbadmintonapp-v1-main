const db = require('../config/db');
const { generateInviteCode } = require('../utils/inviteCodeGenerator');
const { checkGroupMembership, checkGroupAdmin } = require('../utils/groupUtils');
const { keysToCamel } = require('../utils/caseConverter'); // Import converter

exports.createGroup = async (req, res, next) => {
    const { name, description, visibility } = req.body;
    const creatorId = req.user.userId;

    if (!name || !visibility || (visibility !== 'public' && visibility !== 'private')) {
        return res.status(400).json({ error: 'Missing required fields: name, visibility (must be "public" or "private")' });
    }

    let inviteCode = null;
    if (visibility === 'private') {
        inviteCode = generateInviteCode();
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const groupResult = await client.query(
            `INSERT INTO groups (name, description, visibility, invite_code, creator_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, // Return all columns
            [name, description, visibility, inviteCode, creatorId]
        );
        const newGroup = groupResult.rows[0];

        await client.query(
            'INSERT INTO group_memberships (user_id, group_id, role) VALUES ($1, $2, $3)',
            [creatorId, newGroup.id, 'admin']
        );

        await client.query('COMMIT');
        // Convert result keys to camelCase
        res.status(201).json(keysToCamel(newGroup));
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505' && err.constraint === 'groups_invite_code_key') {
            return res.status(500).json({ error: 'Failed to generate unique invite code. Please try again.' });
        }
        next(err);
    } finally {
        client.release();
    }
};

exports.getMyGroups = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            `SELECT g.id, g.name, g.description, g.visibility, gm.role as user_role -- Alias to snake_case for consistency before conversion
             FROM groups g
             JOIN group_memberships gm ON g.id = gm.group_id
             WHERE gm.user_id = $1
             ORDER BY g.name`,
            [userId]
        );
        // Convert results array keys to camelCase
        res.status(200).json(keysToCamel(result.rows));
    } catch (err) {
        next(err);
    }
};

exports.getOpenGroups = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT g.id, g.name, g.description,
             (SELECT COUNT(*) FROM group_memberships gm WHERE gm.group_id = g.id) as member_count
             FROM groups g
             WHERE g.visibility = 'public'
             ORDER BY g.name`
        );
        // Convert results array keys to camelCase
        res.status(200).json(keysToCamel(result.rows));
    } catch (err) {
        next(err);
    }
};

exports.getGroupDetails = async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user.userId;

    try {
        const groupResult = await db.query(
            `SELECT g.id, g.name, g.description, g.visibility, g.invite_code, g.creator_id,
              (SELECT COUNT(*) FROM group_memberships gm WHERE gm.group_id = g.id) as member_count
              FROM groups g WHERE g.id = $1`,
            [groupId]
        );
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }
        const group = groupResult.rows[0];

        const membership = await checkGroupMembership(groupId, userId);
        const isMember = membership.isMember;
        const currentUserRole = membership.role;

        if (group.visibility === 'private' && !isMember) {
            return res.status(403).json({ error: 'Forbidden: You are not a member of this private group' });
        }

        // Convert group object keys to camelCase
        const camelGroup = keysToCamel(group);

        // Add current user's role (already camelCase)
        camelGroup.currentUserRole = currentUserRole;

        // Only show invite code to admins (check camelCase key)
        if (camelGroup.currentUserRole !== 'admin') {
            delete camelGroup.inviteCode;
        }

        res.status(200).json(camelGroup);
    } catch (err) {
        next(err);
    }
};

// editGroup is protected by isGroupAdmin middleware
exports.editGroup = async (req, res, next) => {
    const { groupId } = req.params;
    const { name, description, visibility } = req.body; // Assume camelCase input

    if (!name && description === undefined && !visibility) {
        return res.status(400).json({ error: 'No fields provided for update.' });
    }
    if (visibility && visibility !== 'public' && visibility !== 'private') {
        return res.status(400).json({ error: 'Invalid visibility value.' });
    }

    try {
        // Middleware handles auth check
        const fieldsToUpdate = [];
        const values = [];
        let queryIndex = 1;

        if (name) { fieldsToUpdate.push(`name = $${queryIndex++}`); values.push(name); }
        if (description !== undefined) { fieldsToUpdate.push(`description = $${queryIndex++}`); values.push(description); }
        if (visibility) { fieldsToUpdate.push(`visibility = $${queryIndex++}`); values.push(visibility); }

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update.' });
        }

        values.push(groupId);

        const updateQuery = `
            UPDATE groups SET ${fieldsToUpdate.join(', ')}
            WHERE id = $${queryIndex}
            RETURNING id, name, description, visibility, invite_code, creator_id,
            (SELECT COUNT(*) FROM group_memberships gm WHERE gm.group_id = groups.id) as member_count
        `;

        const result = await db.query(updateQuery, values);
        const updatedGroup = result.rows[0];

        // Convert result keys to camelCase
        const camelGroup = keysToCamel(updatedGroup);
        camelGroup.currentUserRole = 'admin'; // Requester must be admin
        if (camelGroup.visibility !== 'private') {
            delete camelGroup.inviteCode;
        }

        res.status(200).json(camelGroup);

    } catch (err) {
        next(err);
    }
};


exports.getGroupMembers = async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user.userId;

    try {
        const { isMember } = await checkGroupMembership(groupId, userId);
        if (!isMember) {
            const groupResult = await db.query('SELECT visibility FROM groups WHERE id = $1', [groupId]);
            if (groupResult.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
            return res.status(403).json({ error: 'Forbidden: You must be a member to view the member list' });
        }

        // Include role
        const result = await db.query(
            `SELECT u.id as user_id, u.name, gm.role -- Alias user_id for consistency
             FROM users u
             JOIN group_memberships gm ON u.id = gm.user_id
             WHERE gm.group_id = $1
             ORDER BY gm.role DESC, u.name ASC`,
            [groupId]
        );
        // Convert results array keys to camelCase
        res.status(200).json(keysToCamel(result.rows));
    } catch (err) {
        next(err);
    }
};

// removeGroupMember is protected by isGroupAdmin middleware
exports.removeGroupMember = async (req, res, next) => {
    const { groupId, userId: memberToRemoveId } = req.params;
    const requesterId = req.user.userId;
    try {
        // Middleware verified requester is admin
        const groupCreatorResult = await db.query('SELECT creator_id FROM groups WHERE id = $1', [groupId]);
        if (groupCreatorResult.rows.length > 0 && groupCreatorResult.rows[0].creator_id === memberToRemoveId) {
            return res.status(400).json({ error: 'Bad Request: Cannot remove the original group creator.' });
        }

        const deleteResult = await db.query(
            'DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2 RETURNING id',
            [groupId, memberToRemoveId]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }
        // Convert response keys
        res.status(200).json(keysToCamel({ message: 'Member removed successfully' }));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};

// promoteMember is protected by isGroupAdmin middleware
exports.promoteMember = async (req, res, next) => {
    const { groupId, userId: memberToPromoteId } = req.params;
    const requesterId = req.user.userId;

    if (memberToPromoteId === requesterId) {
        return res.status(400).json({ error: 'Cannot promote yourself.' });
    }

    try {
        const result = await db.query(
            "UPDATE group_memberships SET role = 'admin' WHERE group_id = $1 AND user_id = $2 AND role = 'member' RETURNING id",
            [groupId, memberToPromoteId]
        );
        if (result.rowCount === 0) {
            const exists = await checkGroupMembership(groupId, memberToPromoteId);
            if (!exists.isMember) return res.status(404).json({ error: 'User is not a member of this group.' });
            else return res.status(400).json({ error: 'User is already an admin or could not be found.' });
        }
        // Convert response keys
        res.status(200).json(keysToCamel({ message: 'User promoted to admin successfully.' }));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};

// demoteAdmin is protected by isGroupAdmin middleware
exports.demoteAdmin = async (req, res, next) => {
    const { groupId, userId: adminToDemoteId } = req.params;
    const requesterId = req.user.userId;

    if (adminToDemoteId === requesterId) {
        return res.status(400).json({ error: 'Cannot demote yourself.' });
    }

    try {
        const groupCreatorResult = await db.query('SELECT creator_id FROM groups WHERE id = $1', [groupId]);
        if (groupCreatorResult.rows.length > 0 && groupCreatorResult.rows[0].creator_id === adminToDemoteId) {
            return res.status(400).json({ error: 'Cannot demote the original group creator.' });
        }

        const result = await db.query(
            "UPDATE group_memberships SET role = 'member' WHERE group_id = $1 AND user_id = $2 AND role = 'admin' RETURNING id",
            [groupId, adminToDemoteId]
        );
        if (result.rowCount === 0) {
            const exists = await checkGroupMembership(groupId, adminToDemoteId);
            if (!exists.isMember) return res.status(404).json({ error: 'User is not a member of this group.' });
            else return res.status(400).json({ error: 'User is not an admin or could not be found.' });
        }
        // Convert response keys
        res.status(200).json(keysToCamel({ message: 'Admin demoted to member successfully.' }));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};


exports.joinOpenGroup = async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user.userId;

    try {
        const groupResult = await db.query('SELECT visibility FROM groups WHERE id = $1', [groupId]);
        if (groupResult.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
        if (groupResult.rows[0].visibility !== 'public') return res.status(400).json({ error: 'Bad Request: This group is private' });

        await db.query(
            'INSERT INTO group_memberships (user_id, group_id, role) VALUES ($1, $2, $3)',
            [userId, groupId, 'member']
        );
        // Convert response keys
        res.status(200).json(keysToCamel({
            message: 'Successfully joined group',
            group_id: groupId, // Use snake_case before conversion
            user_id: userId,
        }));
    } catch (err) {
        if (err.code === '23505' && err.constraint === 'group_memberships_user_id_group_id_key') {
            return res.status(409).json({ error: 'Conflict: Already a member of this group' });
        }
        next(err); // Pass error to central handler
    }
};

exports.joinPrivateGroup = async (req, res, next) => {
    const { inviteCode } = req.body; // Expect camelCase inviteCode
    const userId = req.user.userId;

    if (!inviteCode) return res.status(400).json({ error: 'Missing required field: inviteCode' });

    try {
        const groupResult = await db.query(
            'SELECT id FROM groups WHERE invite_code = $1 AND visibility = \'private\'',
            [inviteCode]
        );
        if (groupResult.rows.length === 0) return res.status(404).json({ error: 'Invalid or expired invite code' });
        const groupId = groupResult.rows[0].id;

        await db.query(
            'INSERT INTO group_memberships (user_id, group_id, role) VALUES ($1, $2, $3)',
            [userId, groupId, 'member']
        );
        // Convert response keys
        res.status(200).json(keysToCamel({
            message: 'Successfully joined group',
            group_id: groupId, // Use snake_case before conversion
            user_id: userId,
        }));
    } catch (err) {
        if (err.code === '23505' && err.constraint === 'group_memberships_user_id_group_id_key') {
            return res.status(409).json({ error: 'Conflict: Already a member of this group' });
        }
        next(err); // Pass error to central handler
    }
};

exports.leaveGroup = async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user.userId;

    try {
        const adminCheck = await db.query(
            `SELECT role,
             (SELECT COUNT(*) FROM group_memberships WHERE group_id = $1 AND role = 'admin') as admin_count
             FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
            [groupId, userId]
        );
        if (adminCheck.rows.length === 0) return res.status(404).json({ error: 'You are not a member of this group.' });

        const userRole = adminCheck.rows[0].role;
        const adminCount = parseInt(adminCheck.rows[0].admin_count, 10);
        if (userRole === 'admin' && adminCount <= 1) return res.status(400).json({ error: 'Cannot leave group as the last admin...' });

        const deleteResult = await db.query(
            'DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2 RETURNING id',
            [groupId, userId]
        );
        if (deleteResult.rowCount === 0) return res.status(404).json({ error: 'Could not leave group.' });
        // Convert response keys
        res.status(200).json(keysToCamel({ message: 'Successfully left group' }));
    } catch (err) {
        next(err); // Pass error to central handler
    }
};


// getInviteCode is protected by isGroupAdmin middleware
exports.getInviteCode = async (req, res, next) => {
    const { groupId } = req.params;
    try {
        // Middleware verified admin status
        const groupResult = await db.query(
            'SELECT invite_code, visibility FROM groups WHERE id = $1',
            [groupId]
        );
        const group = groupResult.rows[0]; // Existence checked by middleware
        if (group.visibility !== 'private') return res.status(400).json({ error: 'Bad Request: Invite codes are only for private groups' });

        let currentCode = group.invite_code;
        if (!currentCode) {
            console.warn(`Invite code missing for private group ${groupId}, generating new one.`);
            currentCode = generateInviteCode();
            await db.query('UPDATE groups SET invite_code = $1 WHERE id = $2', [currentCode, groupId]);
        }
        // Convert response keys
        res.status(200).json(keysToCamel({ invite_code: currentCode })); // Use snake_case before conversion
    } catch (err) {
        if (err.code === '23505' && err.constraint === 'groups_invite_code_key') {
            return res.status(500).json({ error: 'Failed to generate unique invite code during fetch. Please try again.' });
        }
        next(err); // Pass error to central handler
    }
};