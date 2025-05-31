const Server = require('../collections/Server');
const { v4: uuidv4 } = require('uuid');
const comparePermissions = require('../utils/checkPermission');
const ServerMember = require('../collections/ServerMember');


const createRole = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id } = req.params;
        const { name, permissions } = req.body;

        if (!userId) throw { status: 401, message: 'Unauthorized' };
        if (!name) throw { status: 400, message: 'Role name is required' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id: userId });
        if (!user) throw { status: 403, message: 'User is not a server member' };

        const hasPermission = comparePermissions(server, user, 'manage_roles');
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        const role_id = uuidv4();
        server.roles.push({
            role_id,
            name,
            permissions,
            is_absolute: false
        });

        await server.save();

        res.status(201).json({ role_id });
    } catch (err) {
        next(err);
    }
};

const getAllRoles = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id } = req.params;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id });
        if (!user) throw { status: 403, message: 'User is not a member of the server' };

        const hasPermission = comparePermissions(server, user, 'view_roles');
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        const visibleRoles = server.roles.filter(role => !role.is_absolute);

        res.status(200).json(visibleRoles);
    } catch (err) {
        next(err);
    }
};

const updateRole = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id, role_id } = req.params;
        const { name, permissions } = req.body;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const user = await ServerMember.findOne({ server_id, user_id });
        if (!user) throw { status: 403, message: 'User is not a member of the server' };

        const hasPermission = comparePermissions(server, user, 'manage_roles');
        if (!hasPermission) {
            throw { status: 403, message: 'Access denied' };
        }

        const role = server.roles.find(r => r.role_id === role_id);
        if (!role) throw { status: 404, message: 'Role not found' };

        if (role.is_absolute && server.owner_id !== userId) {
            throw { status: 403, message: 'Only the owner can update absolute roles' };
        }

        const userHasThisRole = user.roles.some(r =>
            r.channel_id === null && r.role_id === role_id
        );
        if (userHasThisRole) {
            throw { status: 403, message: 'You cannot edit your own role' };
        }

        // Обновляем
        if (name !== undefined) role.name = name;
        if (permissions !== undefined) role.permissions = permissions;

        await server.save();
        res.status(200).json({ message: 'Role updated' });
    } catch (err) {
        next(err);
    }
};


const deleteRole = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const { server_id, role_id } = req.params;

        if (!userId) throw { status: 401, message: 'Unauthorized' };

        const server = await Server.findOne({ server_id });
        if (!server) throw { status: 404, message: 'Server not found' };

        const roleIndex = server.roles.findIndex(r => r.role_id === role_id);
        if (roleIndex === -1) throw { status: 404, message: 'Role not found' };

        if (server.owner_id !== userId) {
            throw { status: 403, message: 'Only the owner can delete roles' };
        }

        if (server.roles[roleIndex].is_absolute) {
            throw { status: 403, message: 'Cannot delete absolute roles' };
        }

        server.roles.splice(roleIndex, 1);
        await server.save();
        res.status(200).json({ message: 'Role deleted' });
    } catch (err) {
        next(err);
    }
};




module.exports = {
    createRole,
    getAllRoles,
    updateRole,
    deleteRole,
}