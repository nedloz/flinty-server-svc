## 📘 API Documentation: Guildy Core Backend

A lightweight Discord-like backend system built on Node.js + MongoDB with a full role-based access control system.

---

## 📦 Project Modules
- **Servers**: creation, editing, deletion, joining, banning
- **Members**: join/leave server, assign/remove roles
- **Roles**: permission management
- **Channels**: categories, text/audio channels, access logic

---

## 📁 Schemas

### 🔹 Server
```ts
{
  server_id: String,
  name: String,
  bio: String,
  owner_id: String,
  avatar_url: String,
  visibility: 'public' | 'private',
  members_count: Number,
  default_role_id: String,
  default_notifications_settings: {
    mute_all: Boolean,
    mute_new_users: Boolean,
    mute_all_except_mentions: Boolean
  },
  tags: [ { tag_name: String } ],
  banned_users: [ {
    user_id: String,
    reason: String,
    banned_at: Date
  } ],
  channels: Channel[],
  roles: Role[]
}
```

### 🔹 Channel
```ts
{
  channel_id: String,
  name: String,
  type: 'text' | 'category' | 'voise/video',
  category: String | null,
  position: Number,
  default_role_id: String | null
}
```

### 🔹 Role
```ts
{
  role_id: String,
  name: String,
  permissions: String[],
  is_absolute: Boolean
}
```

### 🔹 ServerMember
```ts
{
  server_id: String,
  user_id: String,
  joined_at: Date,
  roles: [ { role_id: String, channel_id: String | null } ]
}
```

---

## 🔐 Role-based Permissions

| Permission Key         | Description                              |
|------------------------|------------------------------------------|
| `manage_server`        | Edit server info                         |
| `manage_channels`      | Create/edit/delete channels              |
| `manage_roles`         | Edit roles                               |
| `assign_roles`         | Assign roles to members                  |
| `kick_members`         | Kick users from server                   |
| `ban_members`          | Ban users                                |
| `view_roles`           | View member roles                        |
| `view_channel`         | View a specific channel                  |
| `send_messages`        | Send messages in channel                 |

---

## 🌐 API Routes

### 🔹 Server
| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/servers/:server_id` | Get server info (must be member) |
| `PATCH`| `/servers/:server_id` | Update server info (`manage_server`) |
| `DELETE`| `/servers/:server_id` | Delete server (owner only) |
| `POST` | `/servers/:server_id/join` | Join server, assigns default roles |
| `POST` | `/servers/:server_id/leave` | Leave server |

### 🔹 Bans
| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/servers/:server_id/bans` | List banned users (`ban_members`) |
| `POST` | `/servers/:server_id/ban/:user_id` | Ban user (`ban_members`) |
| `PATCH`| `/servers/:server_id/ban/:user_id` | Update ban reason |
| `DELETE`| `/servers/:server_id/ban/:user_id` | Unban user |

### 🔹 Members
| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/servers/:server_id/members` | List members (hides roles) |
| `GET`  | `/servers/:server_id/members/:user_id` | Get member (only self or admin) |
| `POST` | `/servers/:server_id/roles/add` | Assign role (`assign_roles`) |
| `POST` | `/servers/:server_id/roles/remove` | Remove role (`assign_roles`) |

### 🔹 Roles
| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/servers/:server_id/roles` | Get all roles (`view_roles`) |
| `POST` | `/servers/:server_id/roles` | Create new role (`manage_roles`) |
| `PATCH`| `/servers/:server_id/roles/:role_id` | Update role permissions (`manage_roles`) |
| `DELETE`| `/servers/:server_id/roles/:role_id` | Delete role (`manage_roles`) |

### 🔹 Channels
| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/servers/:server_id/channels` | Get all visible channels (with sorting) |
| `GET`  | `/servers/:server_id/channels/:channel_id` | Get one channel if permitted |
| `POST` | `/servers/:server_id/channels` | Create channel (`manage_channels`) |
| `PATCH`| `/servers/:server_id/channels/:channel_id` | Update channel (`manage_channels`) |
| `DELETE`| `/servers/:server_id/channels/:channel_id` | Delete channel (`manage_channels`) |

---

> 💡 Все защищённые маршруты требуют JWT-пользователя и соблюдают роль + пермишены.

