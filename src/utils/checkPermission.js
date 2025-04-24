const comparePermissions = (server, user, permission, channelId = null) => {
    const applicableRoles = user.roles.filter(role => 
        role.channel_id === null || role.channel_id === channelId
    );

    for (const roleRef of applicableRoles) {
        const role = server.roles.find(r => r.role_id === roleRef.role_id);
        if (!role) continue;

        if (role.is_absolute) {
            return true;
        }

        if (Array.isArray(role.permissions) && role.permissions.includes(permission)) {
            return true;
        }
    }

    return false;
};

module.exports = comparePermissions;