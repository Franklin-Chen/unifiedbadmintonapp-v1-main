const express = require('express');
const eventController = require('../controllers/eventController');
const registrationController = require('../controllers/registrationController');
const authenticateToken = require('../middleware/authMiddleware');
// ***** Import Admin Middleware *****
const { isEventAdmin } = require('../middleware/groupAdminMiddleware');
const router = express.Router();

router.get('/:eventId', authenticateToken, eventController.getEventDetails); // Membership checked internally
// ***** Apply Admin Middleware *****
router.put('/:eventId', authenticateToken, isEventAdmin, eventController.updateEvent);
router.delete('/:eventId', authenticateToken, isEventAdmin, eventController.deleteEvent);

// --- Event Registration ---
router.post('/:eventId/register', authenticateToken, registrationController.registerOrWaitlist); // Membership checked internally

module.exports = router;