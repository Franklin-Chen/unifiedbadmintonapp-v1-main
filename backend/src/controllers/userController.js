const db = require('../config/db');
const { keysToCamel } = require('../utils/caseConverter'); // Import converter

exports.updateMyProfile = async (req, res, next) => {
    const userId = req.user.userId; // From auth middleware
    // Expect camelCase from request body now
    const { name, skillLevel } = req.body;

    // Basic validation
    if (!name && skillLevel === undefined) { // Check undefined for optional fields
        return res.status(400).json({ error: 'No fields provided for update.' });
    }

    // Build the update query dynamically
    const fieldsToUpdate = [];
    const values = [];
    let queryIndex = 1;

    if (name) {
        fieldsToUpdate.push(`name = $${queryIndex++}`);
        values.push(name);
    }
    if (skillLevel !== undefined) { // Use snake_case for column name
        fieldsToUpdate.push(`skill_level = $${queryIndex++}`);
        values.push(skillLevel);
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    values.push(userId); // Add userId for the WHERE clause

    const updateQuery = `
      UPDATE users
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${queryIndex}
      RETURNING id, name, email, skill_level
  `;

    try {
        const result = await db.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Convert result keys to camelCase
        res.status(200).json(keysToCamel(result.rows[0]));
    } catch (err) {
        next(err);
    }
};