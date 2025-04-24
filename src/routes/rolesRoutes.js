const express = require('express');
const router = express.Router({ mergeParams: true });
const RolesController = require('../controllers/RolesController');

// Роли на сервере
router.post('/', RolesController.createRole);
router.get('/', RolesController.getAllRoles);
router.put('/:role_id', RolesController.updateRole);
router.delete('/:role_id', RolesController.deleteRole);

module.exports = router;



// 2. Роли (Roles)
// Нужно до работы с участниками и каналами
// POST /servers/:server_id/roles — создать роль
// GET /servers/:server_id/roles — получить роли
// PUT /servers/:server_id/roles/:role_id — редактировать роль
// DELETE /servers/:server_id/roles/:role_id — удалить роль
