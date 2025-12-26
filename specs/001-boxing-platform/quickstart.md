# 快速开始指南：拳击平台小程序

**功能**: [spec.md](spec.md)
**日期**: 2025-12-26

## 概述

本指南帮助开发者开始实现拳击平台小程序，使用微信小程序 + 云开发。

---

## 前置条件

1. **微信开发者账号**
   - 在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册
   - 完成认证

2. **微信开发者工具**
   - 从 [developers.weixin.qq.com](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 下载
   - 安装并使用微信账号登录

3. **云开发环境**
   - 在小程序后台开通云开发
   - 记录您的环境 ID

4. **语言支持**
   - 应用仅显示简体中文
   - 不需要国际化（i18n）框架

---

## 项目设置

### 1. 创建新的小程序

```bash
# 使用微信开发者工具：
# 1. 点击 "+"（新建项目）
# 2. 选择"小程序"
# 3. 选择"JavaScript"作为开发语言
# 4. 勾选"使用云开发"
# 5. 输入项目名称："fightclub"
# 6. 选择您的云开发环境
```

### 2. 配置项目

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
    // 初始化云开发
    if (!wx.cloud) {
      console.error('云开发不支持');
      return;
    }
    wx.cloud.init({
      env: 'your-env-id',  // 替换为您的环境 ID
      traceUser: true
    });
  }
});
```

---

## 云函数设置

### 1. 创建云函数

```bash
# 在微信开发者工具中：
# 1. 右键"cloudfunctions"文件夹
# 2. 创建 Node.js 云函数
# 3. 输入函数名称：例如 "auth/login"

# 目录结构：
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

### 2. 云函数实现示例

**cloudfunctions/auth/login/index.js**:
```javascript
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 匿名化用户 ID 的哈希函数
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
    // 检查用户是否存在
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      // 新用户 - 创建记录
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

    // 老用户
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
    console.error('登录错误:', e);
    return {
      errcode: 1002,
      errmsg: '数据库操作失败'
    };
  }
};
```

### 3. 部署云函数

```bash
# 在微信开发者工具中：
# 1. 右键每个云函数文件夹
# 2. 选择"上传并部署：云端安装依赖"
# 3. 等待部署完成
```

---

## 数据库设置

### 1. 创建集合

```bash
# 在微信开发者工具中：
# 1. 打开"云开发"面板
# 2. 点击"数据库"
# 3. 创建集合：
#    - users（用户表）
#    - boxers（拳手表）
#    - gyms（拳馆表）
#    - counters（计数器表）
```

### 2. 创建索引

```javascript
// 使用云开发控制台或云函数：

// users 集合
db.collection('users').createIndex({
  openid: 1
}, { unique: true });

// boxers 集合
db.collection('boxers').createIndex({ user_id: 1 }, { unique: true });
db.collection('boxers').createIndex({ city: 1 });
db.collection('boxers').createIndex({
  location: '2dsphere'
});

// gyms 集合
db.collection('gyms').createIndex({ user_id: 1 }, { unique: true });
db.collection('gyms').createIndex({ city: 1 });
db.collection('gyms').createIndex({
  location: '2dsphere'
});
```

### 3. 初始化计数器

```javascript
// 使用云开发控制台：
// 在 counters 集合中插入：

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

## 前端页面示例

### 拳手列表页

**pages/boxer/list/list.wxml**:
```xml
<view class="container">
  <!-- 筛选栏 -->
  <view class="filter-bar">
    <input placeholder="筛选城市" bindinput="onCityInput" />
    <input placeholder="最小年龄" type="number" bindinput="onAgeMinInput" />
    <input placeholder="最大年龄" type="number" bindinput="onAgeMaxInput" />
    <button bindtap="applyFilters">筛选</button>
    <button bindtap="clearFilters">清除</button>
  </view>

  <!-- 统计 -->
  <view class="stats">
    <text>共 {{totalCount}} 位拳手</text>
  </view>

  <!-- 拳手列表 -->
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

  <!-- 加载更多 -->
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
      console.error('加载拳手失败:', e);
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

## 测试步骤

### 1. 模拟器测试

```bash
# 在微信开发者工具中：
# 1. 点击"编译"按钮
# 2. 在模拟器中测试
# 3. 检查控制台是否有错误
# 4. 查看云函数日志
```

### 2. 真机测试

```bash
# 1. 点击"预览"按钮
# 2. 使用微信扫描二维码
# 3. 在真机上测试所有用户流程
```

### 3. 云函数日志查看

```bash
# 在微信开发者工具中：
# 1. 打开"云开发"面板
# 2. 点击"云函数"
# 3. 选择要查看的函数
# 4. 查看日志进行调试
```

### 4. 功能测试清单

#### 授权流程测试

- [ ] 新用户打开小程序 → 显示授权页面
- [ ] 点击"授权登录" → 弹出用户信息授权
- [ ] 同意授权 → 获取昵称和头像
- [ ] 位置授权请求 → 同意/拒绝均能正常处理
- [ ] 授权后跳转到角色选择页面

#### 角色选择测试

- [ ] 新用户显示"拳手"和"拳馆"两个选项
- [ ] 只有一个角色时直接进入（显示已有角色）
- [ ] 两个角色都有时默认选中上次使用的角色
- [ ] 选择角色后正确导航到对应页面

#### 导航流程测试

- [ ] 无拳手档案 → 导航到档案创建页
- [ ] 有拳手档案 → 导航到首页
- [ ] 首页显示正确的统计数据

---

## 发布步骤

### 1. 发布前检查

#### 代码审查

```bash
# 1. 检查所有 TODO 和 FIXME
# 2. 移除所有 console.log 和调试代码
# 3. 确认没有硬编码的测试数据
# 4. 检查 OpenID 不会暴露到前端
# 5. 确认所有多表写入使用事务
```

#### 性能检查

```bash
# 1. 使用性能工具检测页面加载时间
# 2. 检查云函数响应时间
# 3. 验证数据库查询有索引支持
# 4. 测试大量数据下的性能
```

#### 兼容性检查

```bash
# 1. 在 iOS 和 Android 真机上测试
# 2. 测试不同网络环境（WiFi/4G/5G）
# 3. 测试不同屏幕尺寸
```

### 2. 上传代码

```bash
# 在微信开发者工具中：
# 1. 点击"工具" → "上传代码"
# 2. 填写版本号和项目备注
# 3. 点击"上传"
```

### 3. 提交审核

```bash
# 在小程序管理后台：
# 1. 进入"版本管理"
# 2. 找到刚上传的版本
# 3. 点击"提交审核"
# 4. 填写审核信息：
#    - 功能页面：选择"工具/生活服务"
#    - 类目选择：体育 > 拳击/健身
#    - 功能描述：详细描述小程序功能
# 5. 上传截图（至少 2 张）
# 6. 提交审核
```

### 4. 审核等待

- 审核时间通常为 1-7 个工作日
- 关注审核进度通知
- 如有驳回，根据反馈修改后重新提交

### 5. 发布上线

```bash
# 审核通过后：
# 1. 在小程序管理后台点击"发布"
# 2. 填写版本更新说明
# 3. 确认发布
# 4. 小程序正式上线
```

---

## 版本管理建议

### 版本号规则

```
主版本号.次版本号.修订号

例如：1.0.0

- 主版本号：重大功能变更或架构调整
- 次版本号：新增功能
- 修订号：bug 修复或小改进
```

### 灰度发布

```bash
# 对于重要更新，建议使用灰度发布：
# 1. 先发布 5% - 10% 用户
# 2. 观察 1-2 天，确认无重大问题
# 3. 逐步扩大到 50%、100%
```

---

## 静态资源（宪法原则 V）

### 所需图标

| 图标 | 类型 | 目录 | 名称 |
|------|------|-----------|------|
| Logo | PNG | `miniprogram/images/` | `logo.png` |
| 拳手头像占位图 | PNG | `miniprogram/images/` | `boxer-placeholder.png` |
| 拳馆图标占位图 | PNG | `miniprogram/images/` | `gym-placeholder.png` |
| 筛选图标 | PNG | `miniprogram/images/` | `icon-filter.png` |
| 位置图标 | PNG | `miniprogram/images/` | `icon-location.png` |
| 编辑图标 | PNG | `miniprogram/images/` | `icon-edit.png` |

**注意**: 需要手动下载或创建这些图标并放置在 `miniprogram/images/` 目录中。

---

## 开发工作流程

1. **设置**: 按照上述步骤
2. **实现**: 一次实现一个云函数
3. **测试**: 在模拟器中测试每个功能
4. **部署**: 准备好后部署云函数
5. **集成**: 前端页面与云函数集成
6. **重复**: 对每个用户故事重复此流程

---

## 宪法检查清单

- [x] 仅使用微信小程序 + 云开发（原则 I）
- [x] OpenID 从不暴露给前端（原则 III）
- [x] 多实体写入使用数据库事务（原则 IV）
- [x] 静态资源已文档化供手动下载（原则 V）

---

## 后续步骤

1. 在微信开发者工具中设置项目
2. 根据 API 契约创建和部署云函数
3. 设置数据库集合和索引
4. 根据用户故事实现前端页面
5. 在真机上测试
6. 提交审核并发布

---

## 常见问题排查

### 云函数超时
- 在函数配置中增加超时时间
- 使用索引优化数据库查询

### OpenID 泄露到响应中
- 检查云函数代码
- 确保原始 openid 从不返回

### 事务失败
- 检查云开发环境是否支持事务
- 确认集合在同一个数据库中

### 距离计算不准确
- 使用 GCJ-02 坐标系（中国标准）
- 正确实现 Haversine 公式

### 云函数部署失败
- 检查 package.json 依赖是否正确
- 尝试"云端安装依赖"选项
- 查看部署日志获取错误信息

### 真机调试方法
```bash
# 1. 在开发者工具开启"真机调试"
# 2. 使用微信扫描预览二维码
# 3. 在手机上操作
# 4. 开发者工具会显示调试信息
```

---

## 资源链接

- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [API 契约](contracts/)
- [数据模型](data-model.md)
- [任务列表](tasks.md)
