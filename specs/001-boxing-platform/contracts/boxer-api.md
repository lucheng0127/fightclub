# Boxer API Contract

**Cloud Functions**: `boxer/create`, `boxer/update`, `boxer/get`, `boxer/list`

---

## 1. Create Boxer Profile

### Cloud Function: `boxer/create`

### Request
```javascript
wx.cloud.callFunction({
  name: 'boxer/create',
  data: {
    nickname: "张三",
    gender: "male",
    birthdate: "1990-01-15",    // ISO date string
    height: 180,                // cm
    weight: 75,                 // kg
    city: "北京",               // Optional
    gym_id: "gym_123",          // Optional
    phone: "13800138000",       // Optional
    record_wins: 10,            // Optional
    record_losses: 2,           // Optional
    record_draws: 1             // Optional
  }
})
```

### Response
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    boxer_id: "boxer_abc123",
    user_id: "def456",
    profile: { /* full boxer profile */ }
  }
}
```

### Validation
- Required: `nickname`, `gender`, `birthdate`, `height`, `weight`
- `gender`: enum ["male", "female"]
- `height`: 100-250 cm
- `weight`: 30-200 kg
- `birthdate`: Must be past date
- Optional: `city`, `gym_id`, `phone`, `record_wins`, `record_losses`, `record_draws`

### Error Responses
| errcode | errmsg |
|---------|--------|
| 2001 | "Missing required field" |
| 2002 | "Invalid gender value" |
| 2003 | "Invalid height or weight" |
| 2004 | "Invalid birthdate" |
| 2005 | "Boxer profile already exists" |
| 2006 | "Referenced gym not found" |
| 2007 | "Transaction failed" |

### Transaction
Uses database transaction to atomically:
1. Create boxer profile
2. Update user record (`has_boxer_profile: true`)
3. Increment boxer counter

---

## 2. Update Boxer Profile

### Cloud Function: `boxer/update`

### Request
```javascript
wx.cloud.callFunction({
  name: 'boxer/update',
  data: {
    boxer_id: "boxer_abc123",
    updates: {
      nickname: "李四",          // Editable
      height: 182,               // Editable
      weight: 78,                // Editable
      city: "上海",              // Editable
      gym_id: "gym_456",         // Editable
      phone: "13900139000",      // Editable
      record_wins: 12,           // Editable
      record_losses: 3,          // Editable
      record_draws: 1            // Editable
      // gender: NOT ALLOWED (FR-018)
      // birthdate: NOT ALLOWED (FR-018)
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
- Reject if `gender` or `birthdate` in updates
- Only owner can update their profile (verified via openid)
- If `gym_id` provided, verify gym exists

### Error Responses
| errcode | errmsg |
|---------|--------|
| 2011 | "Cannot modify gender or birthdate" |
| 2012 | "Profile not found" |
| 2013 | "Not authorized to edit this profile" |
| 2014 | "Referenced gym not found" |

---

## 3. Get Boxer Profile

### Cloud Function: `boxer/get`

### Request
```javascript
wx.cloud.callFunction({
  name: 'boxer/get',
  data: {
    boxer_id: "boxer_abc123"
  }
})
```

### Response
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    boxer_id: "boxer_abc123",
    user_id: "def456",           // Anonymized ID
    nickname: "张三",
    gender: "male",
    age: 33,                     // Calculated from birthdate
    birthdate: "1990-01-15",
    height: 180,
    weight: 75,
    city: "北京",                // Or null if not provided
    gym: {                       // Or null if not associated
      gym_id: "gym_123",
      name: "北京拳击俱乐部"
    },
    phone: "13800138000",        // Or null if not provided
    record: "10胜2负1平",        // Or "未填写" if null
    created_at: "2025-12-26T10:00:00Z",
    updated_at: "2025-12-26T10:00:00Z"
  }
}
```

### Error Responses
| errcode | errmsg |
|---------|--------|
| 2021 | "Boxer not found" |

---

## 4. List Boxers (with Filters)

### Cloud Function: `boxer/list`

### Request
```javascript
wx.cloud.callFunction({
  name: 'boxer/list',
  data: {
    filters: {
      city: "北京",              // Optional: Filter by city
      age_min: 20,               // Optional: Minimum age
      age_max: 40,               // Optional: Maximum age
      weight_min: 60,            // Optional: Minimum weight (kg)
      weight_max: 90             // Optional: Maximum weight (kg)
    },
    pagination: {
      page: 1,                   // Page number (1-indexed)
      limit: 20                  // Items per page
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
    boxers: [
      {
        boxer_id: "boxer_abc123",
        user_id: "def456",
        nickname: "张三",
        gender: "male",
        age: 33,
        height: 180,
        weight: 75,
        city: "北京",
        gym_name: "北京拳击俱乐部", // Or null
        record: "10胜2负1平"       // Or "未填写"
      },
      // ... more boxers
    ],
    total_count: 1250,           // Total matching filters
    page: 1,
    limit: 20,
    has_more: true
  }
}
```

### Behavior
- If no filters, return all boxers (paginated)
- Age calculated from birthdate server-side
- Empty filters object = no filtering
- Returns summary data (not full profile) for list view

### Error Responses
| errcode | errmsg |
|---------|--------|
| 2031 | "Invalid filter parameters" |
| 2032 | "Invalid pagination parameters" |

---

## Related Requirements

- FR-009 to FR-019: Boxer profile requirements
- FR-026, FR-030 to FR-034: Discovery and filtering
- FR-035, FR-037, FR-038: Profile viewing
- FR-039, FR-040: OpenID protection
- FR-041: Transaction safety
