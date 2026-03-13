const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const jwt = require('jsonwebtoken');
const { keysToCamel } = require('../utils/caseConverter'); // Import converter

exports.register = async (req, res, next) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields: name, email, password' });
    }

    try {
        // Check if email already exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert new user
        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [name, email, hashedPassword]
        );

        // Response keys are already simple, no conversion needed here, but consistency is good
        res.status(201).json(keysToCamel({
            message: 'User registered successfully',
            user_id: newUser.rows[0].id, // Use snake_case temporarily for consistency before conversion
        }));
    } catch (err) {
        next(err); // Pass error to the error handler
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Missing required fields: email, password' });
    }

    try {
        // Find user by email
        const result = await db.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            console.log(`Login attempt failed: Email not found - ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare password
        const match = await comparePassword(password, user.password_hash);
        if (!match) {
            console.log(`Login attempt failed: Incorrect password for email - ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const tokenPayload = { userId: user.id }; // Include necessary info in token
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' }); // Token expires in 1 day

        console.log(`Login successful for user: ${user.id}`);
        // Convert user object keys to camelCase for response
        res.status(200).json(keysToCamel({
            token,
            user_id: user.id, // Use snake_case temporarily
            name: user.name,
            email: user.email,
        }));
    } catch (err) {
        next(err);
    }
};

exports.getMe = async (req, res, next) => {
    // req.user is attached by the authenticateToken middleware
    const userId = req.user.userId;

    try {
        const result = await db.query('SELECT id, name, email, skill_level FROM users WHERE id = $1', [userId]);
        const userFromDb = result.rows[0];

        if (!userFromDb) {
            // This shouldn't happen if the token is valid, but good to check
            return res.status(404).json({ error: 'User not found' });
        }
        // Construct a response object that will result in `userId` after camelCasing,
        // consistent with the user object structure from the login response.
        // The `keysToCamel` utility will convert `user_id` to `userId` and `skill_level` to `skillLevel`.
        const userForResponse = {
            user_id: userFromDb.id,
            name: userFromDb.name,
            email: userFromDb.email,
            skill_level: userFromDb.skill_level
        };
        res.status(200).json(keysToCamel(userForResponse));
    } catch (err) {
        next(err);
    }
};