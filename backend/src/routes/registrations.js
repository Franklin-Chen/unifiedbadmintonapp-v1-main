const express = require('express');
const registrationController = require('../controllers/registrationController');
const authenticateToken = require('../middleware/authMiddleware');
// ***** Import Admin Middleware *****
const { isEventAdmin } = require('../middleware/groupAdminMiddleware');
const router = express.Router();

router.get('/my-status', authenticateToken, registrationController.getMyStatus);

// ***** Apply Admin Middleware *****
router.patch('/:registrationId/payment', authenticateToken, isEventAdmin, registrationController.updatePaymentStatus);

// Cancel own registration (user action)
router.delete('/cancel/:registrationId', authenticateToken, registrationController.cancelMyRegistrationOrWaitlist);

// ***** Apply Admin Middleware *****
// Remove registration (event creator action)
router.delete('/remove/:registrationId', authenticateToken, isEventAdmin, registrationController.removeRegistrationByCreator);

// Leave waitlist (user action)
router.delete('/waitlist/:waitlistEntryId', authenticateToken, registrationController.cancelMyRegistrationOrWaitlist);


module.exports = router;