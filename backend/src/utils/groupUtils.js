const db = require('../config/db'); // Import db connection

// Helper function to check group membership and optionally role
const checkGroupMembership = async (groupId, userId, requiredRole = null) => {
    if (!groupId || !userId) return { isMember: false, role: null };
    try {
        const query = `SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2`;
        const result = await db.query(query, [groupId, userId]);

        if (result.rows.length === 0) {
            return { isMember: false, role: null }; // Not a member
        }

        const userRole = result.rows[0].role;
        const isMember = true;

        // If a specific role is required, check against it
        if (requiredRole && userRole !== requiredRole) {
            return { isMember: true, role: userRole, meetsRequirement: false }; // Is member, but not required role
        }

        return { isMember: true, role: userRole, meetsRequirement: true }; // Is member and meets role requirement (or no role required)

    } catch (err) {
        console.error("Error in checkGroupMembership:", err);
        throw new Error('Database error checking group membership.');
    }
};

// Helper function to check if user is specifically an admin (creator check removed as role exists)
const checkGroupAdmin = async (groupId, userId) => {
    const { isMember, role } = await checkGroupMembership(groupId, userId, 'admin');
    // For checkGroupAdmin, we just care if they are an admin member
    return { isMember: isMember, isAdmin: isMember && role === 'admin' };
};


module.exports = {
    checkGroupMembership,
    checkGroupAdmin
};