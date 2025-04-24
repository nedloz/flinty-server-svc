const Server = require('../collections/Server');
const { v4: uuidv4 } = require('uuid');
const adminPermissions = require('../adminPermissions.json');
const ADMIN_PERMISSION_KEYS = adminPermissions.map(p => p.key);


const createChannel = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id } = req.params;
        const {
            name,
            type = 'text',
            category_id = null,
            position = null,
            default_role_id = null
        } = req.body;

        if (!userId) throw { status: 401, message: 'Unauthorized' };
        if (!name) throw { status: 400, message: 'Channel name is required' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id: userId });
        if (!user) throw { status: 403, message: 'User is not a member of the server' };

        const hasPermission = comparePermissions(server, user, 'manage_channels');
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        if (category_id) {
            const parent = server.channels.find(c => c.channel_id === category_id);
            if (!parent) throw { status: 400, message: 'Category not found' };
            if (parent.type !== 'category') throw { status: 400, message: 'Invalid category type' };
        }

        let safeDefaultRoleId = null;
        if (default_role_id) {
            const role = server.roles.find(r => r.role_id === default_role_id);
            const isSafe = role && !role.permissions?.some(p => ADMIN_PERMISSION_KEYS.includes(p));
            if (!isSafe) throw { status: 400, message: 'Invalid default role: cannot be an admin role' };
            safeDefaultRoleId = default_role_id;
        }

        const channel_id = uuidv4();
        const newPosition = Number.isInteger(position)
            ? position
            : server.channels.length;

        server.channels
            .filter(c => c.position >= newPosition)
            .forEach(c => c.position++);

        server.channels.push({
            channel_id,
            name,
            type,
            category: category_id,
            position: newPosition,
            default_role_id: safeDefaultRoleId
        });

        await server.save();
        res.status(201).json({ channel_id });
    } catch (err) {
        next(err);
    }
};

const getAllChannels = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id } = req.params;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id: userId });
        if (!user) throw { status: 403, message: 'Not a member of the server' };

        const allChannels = server.channels;

        const visibleChannels = allChannels.filter(channel => {
            if (channel.type === 'category') return false;
            return comparePermissions(server, user, 'view_channel', channel.channel_id);
        });

        const visibleCategoryIds = new Set(visibleChannels.map(c => c.category).filter(Boolean));

        const visibleCategories = allChannels.filter(channel =>
            channel.type === 'category' && visibleCategoryIds.has(channel.channel_id)
        );

        const result = [...visibleChannels, ...visibleCategories].sort((a, b) => a.position - b.position);

        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};


const getChannel = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id, channel_id } = req.params;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id: userId });
        if (!user) throw { status: 403, message: 'Not a member of the server' };

        const channel = server.channels.find(c => c.channel_id === channel_id);
        if (!channel) throw { status: 404, message: 'Channel not found' };

        const hasPermissionToView = comparePermissions(server, user, 'view_channel', channel.channel_id);
        if (!hasPermissionToView) {
            throw { status: 403, message: 'Missing permission: view_channel' };
        }

        res.status(200).json(channel);
    } catch (err) {
        next(err);
    }
};


const updateChannel = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id, channel_id } = req.params;
        const {
            name,
            position,
            category,
            default_role_id
        } = req.body;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id: userId });
        if (!user) throw { status: 403, message: 'User is not a member of the server' };

        const hasPermission = comparePermissions(server, user, 'manage_channels');
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        const channels = server.channels;
        const channel = channels.find(c => c.channel_id === channel_id);
        if (!channel) throw { status: 404, message: 'Channel not found' };

        if (name !== undefined) channel.name = name;

        // Проверка категории
        if (category !== undefined) {
            if (category !== null) {
                const targetCategory = channels.find(c => c.channel_id === category);
                if (!targetCategory) throw { status: 400, message: 'Target category not found' };
                if (targetCategory.type !== 'category') throw { status: 400, message: 'Target must be of type category' };
                if (category === channel.channel_id) throw { status: 400, message: 'Channel cannot be its own category' };
            }
            channel.category = category;
        }

        // Проверка default_role_id
        if (default_role_id !== undefined) {
            const role = server.roles.find(r => r.role_id === default_role_id);
            const isSafe = role && !role.permissions?.some(p => ADMIN_PERMISSION_KEYS.includes(p));
            if (!isSafe) throw { status: 400, message: 'Invalid default role: cannot be an admin role' };
            channel.default_role_id = default_role_id;
        }

        // Перемещение по позиции
        if (position !== undefined && Number.isInteger(position)) {
            const filtered = channels.filter(c => c.channel_id !== channel_id);
            filtered.splice(position, 0, channel);
            filtered.forEach((c, i) => c.position = i);
            server.channels = filtered;
        }

        await server.save();
        res.status(200).json({ message: 'Channel updated' });
    } catch (err) {
        next(err);
    }
};


const deleteChannel = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id, channel_id } = req.params;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id: userId });
        if (!user) throw { status: 403, message: 'User is not a server member' };

        const hasPermission = comparePermissions(server, user, 'manage_channels');
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        const index = server.channels.findIndex(c => c.channel_id === channel_id);
        if (index === -1) throw { status: 404, message: 'Channel not found' };

        const deletedChannel = server.channels[index];

        if (deletedChannel.type === 'category') {
            server.channels.forEach(c => {
                if (c.category === deletedChannel.channel_id) {
                    c.category = null;
                }
            });
        }

        server.channels.splice(index, 1);

        server.channels
            .sort((a, b) => a.position - b.position)
            .forEach((channel, i) => {
                channel.position = i;
            });

        await server.save();

        const members = await ServerMember.find({ server_id });
        const updatePromises = members.map(async member => {
            const originalLength = member.roles.length;

            member.roles = member.roles.filter(role => role.channel_id !== channel_id);

            if (member.roles.length !== originalLength) {
                return member.save();
            }
        });

        await Promise.all(updatePromises);

        res.status(200).json({ message: 'Channel deleted and related data cleaned' });
    } catch (err) {
        next(err);
    }
};




module.exports = {
    createChannel,
    getAllChannels,
    getChannel,
    updateChannel,
    deleteChannel
};
