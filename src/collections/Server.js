const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');


const DefalutNotificationSettingsSchema = new mongoose.Schema({
    mute_all: { type: Boolean, default: false },
    mute_new_users: { type: Boolean, default: false },
    mute_all_except_mentions: { type: Boolean, default: false },
}, { _id: false });

const TagSchema = new mongoose.Schema({
    tag_name: { type: String, required: true }
}, { _id: false });

const BannedUserSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    reason: { type: String },
    banned_at: { type: Date, default: Date.now },
}, { _id: false });

const RoleSchema = new mongoose.Schema({
    role_id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    permissions: [{ type: String }],
    is_absolute: { type: Boolean, default: false },
}, { _id: false });

const ChannelSchema = new mongoose.Schema({
    channel_id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    type: { type: String,  enum: ['text', 'category', 'voise/video'], default: 'text'}, //  enum: ['text', 'category'] можно добавить после создания голосовых чатов и каналов
    category: { type: String, default: null },
    position: Number,
    default_role_id: { type: String, default: null }    
}, { _id: false });


const ServerSchema = new mongoose.Schema({
    server_id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    bio: { type: String },
    owner_id: { type: String, required: true },
    avatar_url: { type: String },
    created_at: { type: Date, default: Date.now },
    visibility: { type: String, enum: ['public', 'private'], default: 'public'},
    members_count: { type: Number, default: 0 },
    default_role_id: { type: String },
    default_notifications_settings: { type: DefalutNotificationSettingsSchema, default: () => ({}) },
    tags: [TagSchema],
    banned_users: [BannedUserSchema],
    channels: [ChannelSchema],
    roles: [RoleSchema], 
}, { timestamps: true });

module.exports = mongoose.model('Server', ServerSchema);

