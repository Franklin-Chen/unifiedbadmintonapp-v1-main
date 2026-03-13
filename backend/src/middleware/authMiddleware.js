const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        console.log('Auth Middleware: No token provided');
        return res.status(401).json({ error: 'Authentication required: No token provided' }); // if there isn't any token
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Auth Middleware: Token verification failed:', err.message);
            // Differentiate between expired and invalid tokens
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Authentication required: Token expired' });
            }
            return res.status(403).json({ error: 'Authentication failed: Invalid token' }); // Forbidden if token is invalid
        }
        // Token is valid, attach user info (payload) to the request object
        // The payload should contain the user ID, e.g., { userId: '...' }
        req.user = user;
        console.log('Auth Middleware: Token verified for user:', user.userId);
        next(); // pass the execution off to whatever request the user intended
    });
};

module.exports = authenticateToken;