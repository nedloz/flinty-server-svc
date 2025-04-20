const ServerMember = require('../collections/ServerMember');
const Server = require('../collections/Server');
const comparePermissions = require('../utils/checkPermission');


const getAllMembers = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const userId = req.user?.user_id;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id: serverId, user_id: userId });
        if (!user) throw { status: 403, message: 'User is not a server member' };

        const members = await ServerMember.find({ server_id: serverId });

        const sanitized = members.map(({ roles, ...rest }) => rest);

        res.status(200).json(sanitized);
    } catch (err) {
        next(err);
    }
};


const getMember = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const targetUserId = req.body.user_id;
        const requesterId = req.user?.user_id;

        if (!requesterId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        const requester = await ServerMember.findOne({ server_id: serverId, user_id: requesterId });
        if (!requester) throw { status: 403, message: 'You are not a member of this server' };

        const member = await ServerMember.findOne({
            server_id: serverId,
            user_id: targetUserId
        });

        if (!member) throw { status: 404, message: 'Member not found' };

        const isSelf = requesterId === targetUserId;
        const canViewRoles = comparePermissions(server, requester, 'view_roles');

        if (isSelf || canViewRoles) {
            return res.status(200).json(member);
        }

        throw { status: 403, message: 'Access denied' };
    } catch (err) {
        next(err);
    }
};


const kickMember = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const initiatorId = req.user?.user_id;
        const targetId = req.body.user_id;
        if (!initiatorId) throw { status: 401, message: 'Unauthorized' };
        if (!targetId) throw { status: 400, message: 'No target user_id provided' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        const initiator = await ServerMember.findOne({ server_id: serverId, user_id: initiatorId });
        if (!initiator) throw { status: 400, message: 'Initiator is not member'};
        
        const hasPermission = comparePermissions(server, initiator, "kick_members")
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        if (server.owner_id === targetId) {
            throw { status: 400, message: 'Cannot kick the server owner' };
        }

        const kicked = await ServerMember.findOneAndDelete({
            server_id: serverId,
            user_id: targetId
        });

        if (!kicked) {
            throw { status: 404, message: 'Target member not found' };
        }

        server.members_count = Math.max(0, server.members_count - 1);
        await server.save();

        res.status(200).json({ message: 'Member kicked' });
    } catch (err) {
        next(err);
    }
}


const addRoleToMember = async (req, res, next) => {
    try {
        const initiatorId = req.user?.user_id;
        const { server_id } = req.params;
        const { user_id } = req.body;
        const { role_id, channel_id = null } = req.body;

        if (!initiatorId) throw { status: 401, message: 'Unauthorized' };
        if (!role_id) throw { status: 400, message: 'role_id is required' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const initiator = await ServerMember.findOne({ server_id, user_id: initiatorId });
        if (!initiator) throw { status: 403, message: 'You are not a member of the server' };

        const hasPermission = comparePermissions(server, initiator, 'assign_roles');
        if (!hasPermission) throw { status: 403, message: 'Access denied' };

        const role = server.roles.find(r => r.role_id === role_id);
        if (!role) throw { status: 404, message: 'Role not found' };

        if (role.is_absolute) {
            throw { status: 403, message: 'Cannot assign owner role' };
        }

        const member = await ServerMember.findOne({ server_id, user_id });
        if (!member) throw { status: 404, message: 'Target member not found' };

        const alreadyHas = member.roles.some(r => r.role_id === role_id && r.channel_id === channel_id);
        if (alreadyHas) throw { status: 400, message: 'Role already assigned' };

        member.roles.push({ role_id, channel_id });
        await member.save();

        res.status(200).json({ message: 'Role added' });
    } catch (err) {
        next(err);
    }
};


const removeRoleFromMember = async (req, res, next) => {
    try {
        const initiatorId = req.user?.user_id;
        const { server_id } = req.params;
        const { user_id: targetId, role_id, channel_id = null } = req.body;

        if (!initiatorId) throw { status: 401, message: 'Unauthorized' };
        if (!targetId) throw { status: 400, message: 'Target user_id is required' };
        if (!role_id) throw { status: 400, message: 'role_id is required' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const initiator = await ServerMember.findOne({ server_id, user_id: initiatorId });
        if (!initiator) throw { status: 403, message: 'You are not a member of the server' };

        const hasPermission = comparePermissions(server, initiator, 'assign_roles');
        if (!hasPermission) throw { status: 403, message: 'Access denied' };

        const role = server.roles.find(r => r.role_id === role_id);
        if (!role) throw { status: 404, message: 'Role not found' };

        if (role.is_absolute) {
            throw { status: 403, message: 'Cannot remove owner role' };
        }

        const target = await ServerMember.findOne({ server_id, user_id: targetId });
        if (!target) throw { status: 404, message: 'Target member not found' };

        const originalLength = target.roles.length;
        target.roles = target.roles.filter(
            r => !(r.role_id === role_id && r.channel_id === channel_id)
        );

        if (target.roles.length === originalLength) {
            throw { status: 404, message: 'Role not found on member' };
        }

        await target.save();

        res.status(200).json({ message: 'Role removed' });
    } catch (err) {
        next(err);
    }
};

const banMember = async (req, res, next) => {
    try {
        const initiatorId = req.user?.user_id;
        const { server_id, user_id: targetId } = req.params;
        const { reason = '' } = req.body;

        if (!initiatorId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        if (server.owner_id === targetId) {
            throw { status: 400, message: 'Cannot ban the server owner' };
        }

        const initiator = await ServerMember.findOne({ server_id, user_id: initiatorId });
        if (!initiator) throw { status: 403, message: 'You are not a member of this server' };

        const hasPermission = comparePermissions(server, initiator, 'ban_members');
        if (!hasPermission) throw { status: 403, message: 'Access denied' };

        const alreadyBanned = server.banned_users?.find(b => b.user_id === targetId);
        if (alreadyBanned) throw { status: 400, message: 'User is already banned' };

        const member = await ServerMember.findOneAndDelete({ server_id, user_id: targetId });
        if (!member) throw { status: 404, message: 'Member not found' };

        server.members_count = Math.max(0, server.members_count - 1);
        server.banned_users = [
            ...(server.banned_users || []),
            { user_id: targetId, reason, banned_at: new Date() }
        ];

        await server.save();

        res.status(200).json({ message: 'Member banned' });
    } catch (err) {
        next(err);
    }
};

const getBanList = async (req, res, next) => {
    try {
        const requesterId = req.user?.user_id;
        const { server_id } = req.params;

        if (!requesterId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const requester = await ServerMember.findOne({ server_id, user_id: requesterId });
        if (!requester) throw { status: 403, message: 'You are not a member of this server' };

        const hasPermission = comparePermissions(server, requester, 'ban_members');
        if (!hasPermission) throw { status: 403, message: 'Access denied' };

        res.status(200).json(server.banned_users || []);
    } catch (err) {
        next(err);
    }
};


const updateBanReason = async (req, res, next) => {
    try {
        const initiatorId = req.user?.user_id;
        const { server_id, user_id: targetId } = req.params;
        const { reason = '' } = req.body;

        if (!initiatorId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const initiator = await ServerMember.findOne({ server_id, user_id: initiatorId });
        if (!initiator) throw { status: 403, message: 'You are not a member of this server' };

        const hasPermission = comparePermissions(server, initiator, 'ban_members');
        if (!hasPermission) throw { status: 403, message: 'Access denied' };

        const ban = (server.banned_users || []).find(b => b.user_id === targetId);
        if (!ban) throw { status: 404, message: 'Ban not found' };

        ban.reason = reason;
        await server.save();

        res.status(200).json({ message: 'Ban reason updated' });
    } catch (err) {
        next(err);
    }
};

const unbanMember = async (req, res, next) => {
    try {
        const initiatorId = req.user?.user_id;
        const { server_id, user_id: targetId } = req.params;

        if (!initiatorId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const initiator = await ServerMember.findOne({ server_id, user_id: initiatorId });
        if (!initiator) throw { status: 403, message: 'You are not a member of this server' };

        const hasPermission = comparePermissions(server, initiator, 'ban_members');
        if (!hasPermission) throw { status: 403, message: 'Access denied' };

        const before = server.banned_users?.length || 0;
        server.banned_users = (server.banned_users || []).filter(b => b.user_id !== targetId);
        const after = server.banned_users.length;

        if (before === after) {
            throw { status: 404, message: 'Ban not found' };
        }

        await server.save();
        res.status(200).json({ message: 'User unbanned' });
    } catch (err) {
        next(err);
    }
};


module.exports = {
    getAllMembers,
    getMember,
    addRoleToMember,
    removeRoleFromMember,
    kickMember,
    banMember,
    unbanMember,
    updateBanReason,
    getBanList
};
