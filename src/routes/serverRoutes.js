const express = require('express');
const router = express.Router();
const ServerController = require('../controllers/ServerController');

router.post('/', ServerController.createServer);
router.get('/:server_id', ServerController.getServer);
router.put('/:server_id', ServerController.updateServer);
router.delete('/:server_id', ServerController.deleteServer);

router.post('/:server_id/join', ServerController.joinServer);
router.post('/:server_id/leave', ServerController.leaveServer);

router.get('/:server_id/notifications/defaults', ServerController.getDefaultNotifications);
router.put('/:server_id/notifications/defaults', ServerController.updateDefaultNotifications);
router.post('/:server_id/permissions/check', ServerController.permissionCheck);


module.exports = router;
