# Quickstart Guide: Boxing Platform Mini-Program

**Feature**: [spec.md](spec.md)
**Date**: 2025-12-26

## Overview

This guide helps developers get started with implementing the Boxing Platform Mini-Program using WeChat Mini Program + CloudBase.

---

## Prerequisites

1. **WeChat Developer Account**
   - Register at [mp.weixin.qq.com](https://mp.weixin.qq.com)
   - Complete authentication

2. **WeChat Developer Tools**
   - Download from [developers.weixin.qq.com](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
   - Install and login with your WeChat account

3. **CloudBase Environment**
   - Enable CloudBase in WeChat MP backend
   - Note your Environment ID

4. **Language Support**
   - App displays in Simplified Chinese only
   - No internationalization (i18n) framework needed

---

## Project Setup

### 1. Create New Mini Program

```bash
# Using WeChat Developer Tools:
# 1. Click "+" (New Project)
# 2. Select "Mini Program"
# 3. Choose "JavaScript" as language
# 4. Check "Use CloudBase"
# 5. Enter project name: "fightclub"
# 6. Select your CloudBase environment
```

### 2. Configure Project

**app.json**:
```json
{
  "pages": [
    "pages/auth/login/login",
    "pages/auth/role-select/role-select",
    "pages/boxer/profile-create/profile-create",
    "pages/boxer/profile-edit/profile-edit",
    "pages/boxer/list/list",
    "pages/boxer/detail/detail",
    "pages/gym/profile-create/profile-create",
    "pages/gym/profile-edit/profile-edit",
    "pages/gym/list/list",
    "pages/gym/detail/detail",
    "pages/common/dashboard/dashboard"
  ],
  "window": {
    "navigationBarTitleText": "FightClub",
    "navigationBarBackgroundColor": "#1a1a1a",
    "navigationBarTextStyle": "white"
  },
  "permission": {
    "scope.userLocation": {
      "desc": "您的位置信息将用于筛选附近的拳馆"
    }
  },
  "cloud": true,
  "sitemapLocation": "sitemap.json"
}
```

**app.js**:
```javascript
App({
  onLaunch() {
    // Initialize CloudBase
    if (!wx.cloud) {
      console.error('CloudBase not supported');
      return;
    }
    wx.cloud.init({
      env: 'your-env-id',  // Replace with your environment ID
      traceUser: true
    });
  }
});
```

---

## Cloud Functions Setup

### 1. Create Cloud Functions

```bash
# In WeChat Developer Tools:
# 1. Right-click "cloudfunctions" folder
# 2. Create Node.js cloud function
# 3. Enter function name: e.g., "auth/login"

# Directory structure:
cloudfunctions/
├── auth/
│   └── login/
│       ├── index.js
│       └── package.json
├── boxer/
│   ├── create/
│   ├── update/
│   ├── get/
│   └── list/
├── gym/
│   ├── create/
│   ├── update/
│   ├── get/
│   └── list/
└── common/
    ├── upload/
    ├── stats/
    └── counters/
```

### 2. Implement Cloud Function Example

**cloudfunctions/auth/login/index.js**:
```javascript
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// Hash function for anonymized user IDs
function hashOpenID(openid) {
  return crypto.createHash('sha256')
    .update(openid + 'fightclub-salt')
    .digest('hex')
    .substring(0, 16);
}

exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext();
  const user_id = hashOpenID(openid);

  try {
    // Check if user exists
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      // New user - create record
      await db.collection('users').add({
        data: {
          openid,
          created_at: new Date(),
          updated_at: new Date(),
          last_role: null,
          has_boxer_profile: false,
          has_gym_profile: false
        }
      });

      return {
        errcode: 0,
        errmsg: 'success',
        data: {
          user_id,
          roles: {
            has_boxer_profile: false,
            has_gym_profile: false
          },
          last_role: null,
          is_new_user: true
        }
      };
    }

    // Returning user
    const user = userRes.data[0];
    return {
      errcode: 0,
      errmsg: 'success',
      data: {
        user_id,
        roles: {
          has_boxer_profile: user.has_boxer_profile,
          has_gym_profile: user.has_gym_profile
        },
        last_role: user.last_role,
        is_new_user: false
      }
    };
  } catch (e) {
    console.error('Login error:', e);
    return {
      errcode: 1002,
      errmsg: 'Database error'
    };
  }
};
```

### 3. Deploy Cloud Functions

```bash
# In WeChat Developer Tools:
# 1. Right-click each cloud function folder
# 2. Select "Upload and Deploy: Cloud Installation Dependencies"
# 3. Wait for deployment to complete
```

---

## Database Setup

### 1. Create Collections

```bash
# In WeChat Developer Tools:
# 1. Open "Cloud" panel
# 2. Click "Database"
# 3. Create collections:
#    - users
#    - boxers
#    - gyms
#    - counters
```

### 2. Create Indexes

```javascript
// Using CloudBase console or cloud function:

// users collection
db.collection('users').createIndex({
  openid: 1
}, { unique: true });

// boxers collection
db.collection('boxers').createIndex({ user_id: 1 }, { unique: true });
db.collection('boxers').createIndex({ city: 1 });
db.collection('boxers').createIndex({
  location: '2dsphere'
});

// gyms collection
db.collection('gyms').createIndex({ user_id: 1 }, { unique: true });
db.collection('gyms').createIndex({ city: 1 });
db.collection('gyms').createIndex({
  location: '2dsphere'
});
```

### 3. Initialize Counters

```javascript
// Using CloudBase console:
// Insert into counters collection:

{
  _id: "boxer_count",
  count: 0
}

{
  _id: "gym_count",
  count: 0
}
```

---

## Frontend Page Example

### Boxer List Page

**pages/boxer/list/list.wxml**:
```xml
<view class="container">
  <!-- Filter Bar -->
  <view class="filter-bar">
    <input placeholder="筛选城市" bindinput="onCityInput" />
    <input placeholder="最小年龄" type="number" bindinput="onAgeMinInput" />
    <input placeholder="最大年龄" type="number" bindinput="onAgeMaxInput" />
    <button bindtap="applyFilters">筛选</button>
    <button bindtap="clearFilters">清除</button>
  </view>

  <!-- Stats -->
  <view class="stats">
    <text>共 {{totalCount}} 位拳手</text>
  </view>

  <!-- Boxer List -->
  <view class="boxer-list">
    <block wx:for="{{boxers}}" wx:key="boxer_id">
      <view class="boxer-card" bindtap="viewDetail" data-id="{{item.boxer_id}}">
        <text class="nickname">{{item.nickname}}</text>
        <text class="info">{{item.age}}岁 | {{item.height}}cm | {{item.weight}}kg</text>
        <text class="city">{{item.city}}</text>
        <text class="record" wx:if="{{item.record}}">{{item.record}}</text>
      </view>
    </block>
  </view>

  <!-- Load More -->
  <button wx:if="{{has_more}}" bindtap="loadMore">加载更多</button>
</view>
```

**pages/boxer/list/list.js**:
```javascript
Page({
  data: {
    boxers: [],
    filters: {},
    page: 1,
    limit: 20,
    total_count: 0,
    has_more: false
  },

  onLoad() {
    this.loadBoxers();
  },

  async loadBoxers() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'boxer/list',
        data: {
          filters: this.data.filters,
          pagination: {
            page: this.data.page,
            limit: this.data.limit
          }
        }
      });

      if (res.result.errcode === 0) {
        const newBoxers = this.data.page === 1
          ? res.result.data.boxers
          : [...this.data.boxers, ...res.result.data.boxers];

        this.setData({
          boxers: newBoxers,
          total_count: res.result.data.total_count,
          has_more: res.result.data.has_more
        });
      }
    } catch (e) {
      console.error('Load boxers error:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  applyFilters() {
    this.setData({
      page: 1,
      boxers: []
    });
    this.loadBoxers();
  },

  clearFilters() {
    this.setData({
      filters: {},
      page: 1,
      boxers: []
    });
    this.loadBoxers();
  },

  loadMore() {
    this.setData({
      page: this.data.page + 1
    });
    this.loadBoxers();
  },

  viewDetail(e) {
    const boxer_id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/boxer/detail/detail?id=${boxer_id}`
    });
  }
});
```

---

## Testing

### 1. Simulator Testing

```bash
# In WeChat Developer Tools:
# 1. Click "Compile" button
# 2. Test in simulator
# 3. Check console for errors
# 4. Verify Cloud Function logs
```

### 2. Real Device Testing

```bash
# 1. Click "Preview" button
# 2. Scan QR code with WeChat on your phone
# 3. Test all user flows
```

### 3. Cloud Function Logs

```bash
# In WeChat Developer Tools:
# 1. Open "Cloud" panel
# 2. Click "Cloud Functions"
# 3. Select function
# 4. View logs for debugging
```

---

## Static Assets (Constitution Principle V)

### Required Icons

| Icon | Type | Directory | Name |
|------|------|-----------|------|
| Logo | PNG | `miniprogram/images/` | `logo.png` |
| Boxer avatar placeholder | PNG | `miniprogram/images/` | `boxer-placeholder.png` |
| Gym icon placeholder | PNG | `miniprogram/images/` | `gym-placeholder.png` |
| Filter icon | PNG | `miniprogram/images/` | `icon-filter.png` |
| Location icon | PNG | `miniprogram/images/` | `icon-location.png` |
| Edit icon | PNG | `miniprogram/images/` | `icon-edit.png` |

**Action Required**: Manually download or create these icons and place in `miniprogram/images/` before development.

---

## Development Workflow

1. **Setup**: Follow steps above
2. **Implement**: One cloud function at a time
3. **Test**: Each function in simulator
4. **Deploy**: Cloud functions when ready
5. **Integrate**: Frontend pages with cloud functions
6. **Repeat**: For each user story

---

## Constitution Checklist

- [x] WeChat Mini Program + CloudBase only (Principle I)
- [x] OpenID never exposed to frontend (Principle III)
- [x] Database transactions for multi-entity writes (Principle IV)
- [x] Static assets documented for manual download (Principle V)

---

## Next Steps

1. Set up WeChat Developer Tools project
2. Create and deploy cloud functions per API contracts
3. Set up database collections and indexes
4. Implement frontend pages per user stories
5. Test on real device

---

## Troubleshooting

### Cloud Function Timeout
- Increase timeout in function configuration
- Optimize database queries with indexes

### OpenID Leaked in Response
- Review cloud function code
- Ensure raw openid never returned

### Transaction Failed
- Check CloudBase environment supports transactions
- Verify collections are in same database

### Distance Calculation Inaccurate
- Use GCJ-02 coordinate system (China standard)
- Implement Haversine formula correctly

---

## Resources

- [WeChat Mini Program Documentation](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [WeChat CloudBase Documentation](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [API Contracts](contracts/)
- [Data Model](data-model.md)
