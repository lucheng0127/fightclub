# Auth API Contract

**Cloud Function**: `auth/login`
**Purpose**: User authorization, role check, and session initialization

---

## Request

### Method
```javascript
wx.cloud.callFunction({
  name: 'auth/login',
  data: {}
})
```

### Request Body
Empty - Cloud function uses `cloud.getWXContext().openid` server-side.

---

## Response

### Success Response (200)
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    user_id: "abc123def456",      // Anonymized ID (NOT openid)
    roles: {
      has_boxer_profile: true,    // Whether user has boxer profile
      has_gym_profile: false      // Whether user has gym profile
    },
    last_role: "boxer",            // Last active role: "boxer" | "gym" | null
    is_new_user: false             // true if first time login
  }
}
```

### Error Responses

| errcode | errmsg | Description |
|---------|--------|-------------|
| 1001 | "Authorization failed" | WeChat authorization failed |
| 1002 | "Database error" | Failed to query/create user record |

---

## Behavior

1. **First-time user**:
   - Creates new `users` document with `openid`
   - Returns `is_new_user: true`, `last_role: null`
   - Frontend: Show role selection screen

2. **Returning user with one role**:
   - Returns existing roles and `last_role`
   - Frontend: Skip role selection, enter with existing role

3. **Returning user with both roles**:
   - Returns both roles true, `last_role` shows last used
   - Frontend: Show role selection with `last_role` as default

---

## OpenID Protection

- **NEVER** returns `openid` in response
- Frontend uses `user_id` (anonymized hash) for session
- Cloud function uses `openid` server-side for database queries

---

## Related Requirements

- FR-001: User info authorization
- FR-002: Location authorization (separate flow)
- FR-004: OpenID storage (server-side only)
- FR-005: Role selection support
- FR-006: Dual role support
- FR-007: Bypass role selection if single role
- FR-008: Remember last role
