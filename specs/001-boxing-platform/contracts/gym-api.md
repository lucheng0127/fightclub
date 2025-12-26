# Gym API Contract

**Cloud Functions**: `gym/create`, `gym/update`, `gym/get`, `gym/list`

---

## 1. Create Gym Profile

### Cloud Function: `gym/create`

### Request
```javascript
wx.cloud.callFunction({
  name: 'gym/create',
  data: {
    name: "北京拳击俱乐部",
    address: "北京市朝阳区xxx",
    location: {
      latitude: 39.9042,
      longitude: 116.4074
    },
    city: "北京",                 // Optional (derived from location)
    phone: "13800138000",
    icon_url: "cloud://xxx"       // Optional
  }
})
```

### Response
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    gym_id: "gym_abc123",
    user_id: "def456",
    profile: { /* full gym profile */ }
  }
}
```

### Validation
- Required: `name`, `address`, `location` (lat/lon), `phone`
- `location.latitude`: -90 to 90
- `location.longitude`: -180 to 180
- Optional: `city`, `icon_url`

### Error Responses
| errcode | errmsg |
|---------|--------|
| 3001 | "Missing required field" |
| 3002 | "Invalid location coordinates" |
| 3003 | "Gym profile already exists" |
| 3004 | "Transaction failed" |

### Transaction
Uses database transaction to atomically:
1. Create gym profile
2. Update user record (`has_gym_profile: true`)
3. Increment gym counter

---

## 2. Update Gym Profile

### Cloud Function: `gym/update`

### Request
```javascript
wx.cloud.callFunction({
  name: 'gym/update',
  data: {
    gym_id: "gym_abc123",
    updates: {
      name: "上海拳击俱乐部",
      address: "上海市xxx",
      location: {
        latitude: 31.2304,
        longitude: 121.4737
      },
      phone: "13900139000",
      icon_url: "cloud://yyy"
    }
  }
})
```

### Response
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    updated_profile: { /* full updated profile */ }
  }
}
```

### Validation
- All fields editable (unlike boxer profile)
- Only owner can update (verified via openid)

### Error Responses
| errcode | errmsg |
|---------|--------|
| 3011 | "Profile not found" |
| 3012 | "Not authorized to edit this profile" |
| 3013 | "Invalid location coordinates" |

---

## 3. Get Gym Profile

### Cloud Function: `gym/get`

### Request
```javascript
wx.cloud.callFunction({
  name: 'gym/get',
  data: {
    gym_id: "gym_abc123"
  }
})
```

### Response
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    gym_id: "gym_abc123",
    user_id: "def456",           // Anonymized ID
    name: "北京拳击俱乐部",
    address: "北京市朝阳区xxx",
    location: {
      latitude: 39.9042,
      longitude: 116.4074
    },
    city: "北京",
    phone: "13800138000",
    icon_url: "cloud://xxx",     // Or null
    boxer_count: 25,             // Number of associated boxers
    created_at: "2025-12-26T10:00:00Z",
    updated_at: "2025-12-26T10:00:00Z"
  }
}
```

### Error Responses
| errcode | errmsg |
|---------|--------|
| 3021 | "Gym not found" |

---

## 4. List Gyms (with Filters)

### Cloud Function: `gym/list`

### Request
```javascript
wx.cloud.callFunction({
  name: 'gym/list',
  data: {
    filters: {
      city: "北京"               // Optional: Filter by city
    },
    sort: {
      by: "distance",            // "distance" | "name"
      user_location: {           // Required if sorting by distance
        latitude: 39.9042,
        longitude: 116.4074
      }
    },
    pagination: {
      page: 1,
      limit: 20
    }
  }
})
```

### Response
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    gyms: [
      {
        gym_id: "gym_abc123",
        user_id: "def456",
        name: "北京拳击俱乐部",
        address: "北京市朝阳区xxx",
        city: "北京",
        distance: 1250,          // In meters (if sorted by distance)
        distance_display: "1.3km", // Human-readable
        icon_url: "cloud://xxx",
        boxer_count: 25
      },
      // ... more gyms
    ],
    total_count: 85,
    page: 1,
    limit: 20,
    has_more: true
  }
}
```

### Behavior
- If no filters, return all gyms (paginated)
- If sorting by distance, `user_location` is required
- If user location not available, sort by name
- Distance calculated using Haversine formula (±100m accuracy)

### Error Responses
| errcode | errmsg |
|---------|--------|
| 3031 | "Invalid filter parameters" |
| 3032 | "Invalid pagination parameters" |
| 3033 | "user_location required for distance sorting" |

---

## Related Requirements

- FR-020 to FR-025: Gym profile requirements
- FR-027, FR-028, FR-029: Gym discovery and filtering
- FR-036, FR-037: Profile viewing
- FR-039, FR-040: OpenID protection
- FR-041: Transaction safety
