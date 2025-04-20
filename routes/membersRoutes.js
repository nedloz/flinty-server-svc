const express = require('express');
const router = express.Router({ mergeParams: true });
const MembersController = require('../controllers/MembersController');

// Чтение (можно через :user_id)
router.get('/', MembersController.getAllMembers);
router.post('/get', MembersController.getMember);
router.patch('/roles/add', MembersController.addRoleToMember);
router.patch('/roles/remove', MembersController.removeRoleFromMember);
router.post('/ban', MembersController.banMember);
router.delete('/unban', MembersController.unbanMember);
router.patch('/ban-reason', MembersController.updateBanReason);
router.post('/kick', MembersController.kickMember);
router.get('/bans', MembersController.getBanList);
module.exports = router;
