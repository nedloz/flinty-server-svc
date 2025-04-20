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

module.exports = router;



// 1. Серверы (Server)
// POST /servers — создать сервер
// GET /servers/:server_id — получить профиль
// PUT /servers/:server_id — редактировать профиль
// DELETE /servers/:server_id — удалить сервер
// POST /servers/:server_id/join — присоединиться к серверу
// POST /servers/:server_id/leave — выйти с сервера
// GET /servers/:server_id/notifications/defaults — получить уведомления
// PUT /servers/:server_id/notifications/defaults — изменить уведомления




// 6. ACL-проверка (Permission Check)
// POST /servers/:server_id/permissions/check — внешний запрос на проверку прав
