const crypto = require('crypto');

// Generates a simple 6-character alphanumeric code
// NOTE: For production, ensure this is sufficiently unique or implement
// a check-and-regenerate loop in the controller if a collision occurs (rare).
const generateInviteCode = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};

module.exports = { generateInviteCode };