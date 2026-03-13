const express = require('express');
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware'); // Import auth middleware
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe); // Protect this route

module.exports = router;