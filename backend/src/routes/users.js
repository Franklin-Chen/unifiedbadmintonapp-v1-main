const express = require('express');
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// Route to update the currently logged-in user's profile
router.put('/me/profile', authenticateToken, userController.updateMyProfile);

module.exports = router;