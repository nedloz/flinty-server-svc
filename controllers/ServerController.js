const Server = require('../collections/Server');
const ServerMember = require('../collections/ServerMember');
const { v4: uuidv4 } = require('uuid');
const comparePermissions = require('../utils/checkPermission');
const adminPermissions = require('../permissions/admin-permissions.json');
const ADMIN_PERMISSION_KEYS = adminPermissions.map(p => p.key);


const createServer = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) throw { status: 401, message: 'Unauthorized' };
    
        const { name, bio, avatar_url } = req.body;
        if (!name) throw { status: 400, message: 'Server name is required' };
    
        const serverId = uuidv4();
        const ownerRoleId = uuidv4();
        const defaultRoleId = uuidv4();
    
        const newServer = new Server({
          server_id: serverId,
          name,
          bio,
          avatar_url,
          owner_id: userId,
          default_role_id: defaultRoleId,
          roles: [
            {
              role_id: ownerRoleId,
              name: 'Owner',
              permissions: [],
              is_absolute: true,
            },
            {
              role_id: defaultRoleId,
              name: 'Default',
              permissions: [],
              is_absolute: false,
            },
          ]
        });

        const member = new ServerMember({
            server_id: serverId, 
            user_id: userId,
            joined_at: new Date(),
            roles: [{ role_id: ownerRoleId, channel_id: null }]
        });
        await member.save();
        newServer.members_count += 1;
    
        await newServer.save();
        res.status(201).json({ server_id: serverId });
    
      } catch (err) {
        next(err);
      }
};


const getServer = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const userId = req.user?.user_id;
        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        const isMember = await ServerMember.exists({ 
            server_id: serverId,
            user_id: userId
        })
        if (!isMember) throw { status: 403, message: 'Access denied' };

        res.status(200).json({
            server_id: server.server_id,
            name: server.name,
            bio: server.bio,
            avatar_url: server.avatar_url,
            owner_id: server.owner_id,
            members_count: server.members_count,
            default_notifications_settings: server.default_notifications_settings,
        });

    } catch (err) {
        next(err);
    }
};
  
const updateServer = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const userId = req.user?.user_id;
        const { name, bio, avatar_url, visibility, tags } = req.body;

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id: serverId, user_id: userId });
        if (!user) throw { status: 400, message: 'User is not member'};

        const hasPermission = comparePermissions(server, user, "manage_server");
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }
        
        if (name !== undefined) server.name = name;
        if (bio !== undefined) server.bio = bio;
        if (avatar_url !== undefined) server.avatar_url = avatar_url;
        if (visibility !== undefined) server.visibility = visibility;
        if (tags !== undefined) server.tags = tags;

        await server.save();
        res.status(200).json({ message: 'Server updated' });

    } catch (err) {
        next(err);  
    }
};


const getInitialRolesForNewMember = (server) => {
    const roles = [];

    if (server.default_role_id) {
        const defaultRole = server.roles.find(r => r.role_id === server.default_role_id);
        if (defaultRole) {
            roles.push({ role_id: server.default_role_id, channel_id: null });
        }
    }

    for (const channel of server.channels) {
        if (!channel.default_role_id) continue;

        const role = server.roles.find(r => r.role_id === channel.default_role_id);
        const isSafe = role && !role.permissions?.some(p => ADMIN_PERMISSION_KEYS.includes(p));
        if (isSafe) {
            roles.push({
                role_id: channel.default_role_id,
                channel_id: channel.channel_id
            });
        }
    }

    return roles;
};

const joinServer = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const userId = req.user?.user_id;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        const alreadyMember = await ServerMember.findOne({
            server_id: serverId,
            user_id: userId
        });
        if (alreadyMember) {
            throw { status: 400, message: 'Already a member' };
        }

        // 💡 Здесь можно будет добавить проверку инвайта, если нужно

        const initialRoles = getInitialRolesForNewMember(server);

        const member = new ServerMember({
            server_id: serverId,
            user_id: userId,
            roles: initialRoles
        });

        await member.save();
        server.members_count += 1;
        await server.save();

        res.status(200).json({ message: 'Joined successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteServer = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const userId = req.user?.user_id;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        if (server.owner_id !== userId) {
            throw { status: 403, message: 'Only the owner can delete this server' };
        }

        await Server.deleteOne({ server_id: serverId });
        await ServerMember.deleteMany({ server_id: serverId });

        res.status(200).json({ message: 'Server deleted along with all members' });
    } catch (err) {
        next(err);
    }

    // Удалить инвайты, связанные с сервером
    // Удалить сообщения, если они хранятся отдельно и завязаны на server_id
    // Удалить файлы, связанные с сервером (например, картинки)

};


const leaveServer = async (req, res, next) => {
    try {
        const serverId = req.params.server_id;
        const userId = req.user?.user_id;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        if (server.owner_id === userId) {
            throw { status: 400, message: 'Owner cannot leave their own server' };
        }

        const deleted = await ServerMember.findOneAndDelete({
            server_id: serverId,
            user_id: userId
        });

        if (!deleted) {
            throw { status: 404, message: 'Member not found' };
        }

        server.members_count = Math.max(0, server.members_count - 1);
        await server.save();

        res.status(200).json({ message: 'Left the server' });
    } catch (err) {
        next(err);
    }
};


const getDefaultNotifications = async (req, res, next) => {
    try {
        const server = await Server.findOne({ server_id: req.params.server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        res.status(200).json(server.default_notifications_settings);
    } catch (err) {
        next(err);
    }
};


const updateDefaultNotifications = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const serverId = req.params.server_id;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id: serverId });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id: serverId, user_id: userId });
        if (!user) throw { status: 400, message: 'User is not a server member' };

        const hasPermission = comparePermissions(server, user, 'manage_server');
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        server.default_notifications_settings = {
            ...server.default_notifications_settings,
            ...req.body
        };

        await server.save();
        res.status(200).json({ message: 'Notification settings updated' });
    } catch (err) {
        next(err);
    }
};


module.exports = {
    createServer,
    getServer,
    updateServer,
    deleteServer,
    joinServer,
    leaveServer,
    getDefaultNotifications,
    updateDefaultNotifications
}