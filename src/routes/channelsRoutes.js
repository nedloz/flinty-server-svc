const express = require('express');
const router = express.Router({ mergeParams: true });
const ChannelsController = require('../controllers/ChannelsController');

router.post('/', ChannelsController.createChannel);
router.get('/', ChannelsController.getAllChannels);
router.get('/:channel_id', ChannelsController.getChannel);
router.put('/:channel_id', ChannelsController.updateChannel);
router.delete('/:channel_id', ChannelsController.deleteChannel);

module.exports = router;

// 3. Каналы (Channels)
// POST /servers/:server_id/channels — создать канал
// GET /servers/:server_id/channels — список каналов
// GET /servers/:server_id/channels/:channel_id — инфа о канале
// PUT /servers/:server_id/channels/:channel_id — редактировать канал
// DELETE /servers/:server_id/channels/:channel_id — удалить канал