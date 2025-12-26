# Discovery API Contract

**Cloud Functions**: Common/discovery, Common/counters

---

## 1. Get Platform Statistics

### Cloud Function: `common/stats`

### Request
```javascript
wx.cloud.callFunction({
  name: 'common/stats',
  data: {}
})
```

### Response
```javascript
{
  errcode: 0,
  errmsg: "success",
  data: {
    boxer_count: 1250,
    gym_count: 85
  }
}
```

### Behavior
- Reads from `counters` collection
- Updated atomically when profiles are created/deleted
- Used for dashboard display

### Error Responses
| errcode | errmsg |
|---------|--------|
| 4001 | "Failed to fetch statistics" |

---

## 2. Upload Image (Gym Icon)

### Cloud Function: `common/upload`

### Request
```javascript
// First: Choose file from device
wx.chooseImage({
  count: 1,
  sizeType: ['compressed'],
  sourceType: ['album', 'camera'],
  success: (res) => {
    const tempFilePath = res.tempFilePaths[0];

    // Then: Upload to cloud storage
    wx.cloud.uploadFile({
      cloudPath: `gym-icons/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
      filePath: tempFilePath
    }).then(res => {
      console.log('Uploaded:', res.fileID);
    });
  }
});
```

### Response
```javascript
{
  errMsg: "uploadFile:ok",
  fileID: "cloud://xxx.xxx/gym-icons/xxx.jpg",
  statusCode: 200
}
```

### Behavior
- Uploads to WeChat Cloud Storage
- Returns `fileID` for storage in gym profile
- File size limit: 10MB (WeChat limit)

### Error Responses
| errMsg | Description |
|--------|-------------|
| "uploadFile:fail" | Upload failed |
| "uploadFile:fail file size exceeds" | File too large |

---

## 3. Get User Location (Client-Side API)

### WeChat API: `wx.getLocation`

### Request
```javascript
wx.getLocation({
  type: 'gcj02',  // GCJ-02 coordinate system (China standard)
  success: (res) => {
    const { latitude, longitude } = res;
    // Store for distance-based filtering
  },
  fail: () => {
    // User denied location authorization
    // Disable distance-based features
  }
});
```

### Response
```javascript
{
  latitude: 39.9042,
  longitude: 116.4074,
  speed: 0,
  accuracy: 10,
  altitude: 0,
  verticalAccuracy: 0,
  horizontalAccuracy: 10
}
```

### Behavior
- Requires user authorization (FR-002)
- If denied, disable distance sorting (FR-003)
- Store location locally for subsequent queries

---

## 4. Choose Location (Map Picker)

### WeChat API: `wx.chooseLocation`

### Request
```javascript
wx.chooseLocation({
  success: (res) => {
    const { name, address, latitude, longitude } = res;
    // Use for gym profile creation
  }
});
```

### Response
```javascript
{
  name: "北京拳击俱乐部",
  address: "北京市朝阳区xxx",
  latitude: 39.9042,
  longitude: 116.4074,
  // Note: city not provided by chooseLocation, derive from reverse geocode
}
```

### Behavior
- Opens built-in map picker
- User can search or tap to select location
- Returns precise coordinates and address

---

## 5. Clear Filters (Client-Side Operation)

### No API Required - Reset Local State

```javascript
// Clear all filters
this.setData({
  filters: {
    city: null,
    age_min: null,
    age_max: null,
    weight_min: null,
    weight_max: null
  }
});

// Reload list with empty filters
this.loadBoxers({});
```

---

## Filter Combinations

### Boxer Filters
```javascript
// Filter by city only
{ city: "北京" }

// Filter by age range
{ age_min: 20, age_max: 35 }

// Filter by weight range
{ weight_min: 60, weight_max: 80 }

// Combine filters
{
  city: "北京",
  age_min: 25,
  age_max: 40,
  weight_min: 65,
  weight_max: 85
}

// Clear all filters
{}
```

### Gym Filters
```javascript
// Filter by city only
{ city: "北京" }

// Sort by distance (requires user location)
{
  city: "北京",
  sort: {
    by: "distance",
    user_location: { latitude: 39.9042, longitude: 116.4074 }
  }
}

// No filters (all gyms)
{}
```

---

## Related Requirements

- FR-002, FR-003: Location authorization and graceful degradation
- FR-026, FR-027: Platform counts display
- FR-028, FR-029: Gym filtering and distance sorting
- FR-030 to FR-034: Boxer filtering
- SC-004: Filter operations within 2 seconds
- SC-008: Distance accuracy within 100 meters
