const express = require('express');
const groupController = require('../controllers/groupController');
const authenticateToken = require('../middleware/authMiddleware');
const eventController = require('../controllers/eventController');
// ***** Import Admin Middleware *****
const { isGroupAdmin } = require('../middleware/groupAdminMiddleware');
const router = express.Router();

// --- Group Management ---
router.post('/', authenticateToken, groupController.createGroup);
router.get('/', authenticateToken, groupController.getMyGroups);
router.get('/open', authenticateToken, groupController.getOpenGroups);
router.get('/:groupId', authenticateToken, groupController.getGroupDetails);
// ***** Apply Admin Middleware *****
router.put('/:groupId', authenticateToken, isGroupAdmin, groupController.editGroup);
router.get('/:groupId/invite-code', authenticateToken, isGroupAdmin, groupController.getInviteCode);

// --- Group Membership ---
router.post('/join-private', authenticateToken, groupController.joinPrivateGroup);
router.post('/:groupId/join', authenticateToken, groupController.joinOpenGroup);
router.delete('/:groupId/leave', authenticateToken, groupController.leaveGroup);
router.get('/:groupId/members', authenticateToken, groupController.getGroupMembers);
// ***** Apply Admin Middleware *****
router.delete('/:groupId/members/:userId', authenticateToken, isGroupAdmin, groupController.removeGroupMember);
router.post('/:groupId/members/:userId/promote', authenticateToken, isGroupAdmin, groupController.promoteMember); // New route
router.post('/:groupId/members/:userId/demote', authenticateToken, isGroupAdmin, groupController.demoteAdmin); // New route


// --- Events within Group ---
// ***** Apply Admin Middleware to Create *****
router.post('/:groupId/events', authenticateToken, isGroupAdmin, eventController.createEvent);
router.get('/:groupId/events', authenticateToken, eventController.getGroupEvents); // Any member can view

module.exports = router;