const mongoose = require('mongoose');

const ServerMemberSchema = new mongoose.Schema({
    server_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    joined_at: { type: Date, default: Date.now },
    roles: [
        {
            role_id: { type: String, required: true },
            channel_id: { type: String, default: null } // null = серверная роль
        }
    ]
});

module.exports = mongoose.model('ServerMember', ServerMemberSchema);
