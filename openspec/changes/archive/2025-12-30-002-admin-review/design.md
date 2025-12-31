# 002-admin-review 设计文档

## 架构概述

### 数据模型

#### admins 集合
```javascript
{
  _id: ObjectId,
  openid: String,        // 微信用户 OpenID
  superadmin: Boolean,   // true=超级管理员, false=管理员
  created_at: Date,
  created_by: String     // 创建者的 openid
}
```

#### gyms 集合修改
新增字段：
```javascript
{
  status: String,        // 'pending' | 'approved' | 'rejected'
  reviewed_at: Date,     // 审核时间
  reviewed_by: String,   // 审核管理员 openid
  reject_reason: String  // 拒绝原因（可选）
}
```

#### gym_reviews 集合
```javascript
{
  _id: ObjectId,
  gym_id: String,           // 关联的 gym_id
  user_id: String,          // 提交者匿名 ID
  name: String,             // 拳馆名称
  address: String,          // 地址
  location: { latitude, longitude },
  phone: String,
  icon_url: String,
  city: String,
  status: String,           // 'pending' | 'approved' | 'rejected'
  submitted_at: Date,
  reviewed_at: Date,
  reviewed_by: String,      // 审核管理员 openid
  reject_reason: String
}
```

## 工作流程

### 拳馆提交流程
```
用户提交拳馆资料
    ↓
gym-create 云函数
    ↓
创建 gym_reviews 记录（status=pending）
    ↓
创建 gyms 记录（status=pending）
    ↓
发送消息提醒给所有管理员
    ↓
提示用户"资料审核中"
```

### 审核流程
```
管理员进入审核界面
    ↓
查看待审核列表（gym_reviews where status=pending）
    ↓
查看拳馆详情
    ↓
选择 通过/拒绝
    ↓
更新 gym_reviews.status
    ↓
更新 gyms.status
    ↓
如果通过：用户可正常使用
如果拒绝：用户收到拒绝原因
```

## 技术决策

### 1. 消息提醒方案
使用微信小程序订阅消息（需用户订阅）或云函数调用微信模板消息。

**方案选择**：简化方案，审核列表实时刷新，暂不实现推送通知。

### 2. 管理员权限控制
- 超级管理员：可以添加/删除管理员，查看所有管理员列表
- 管理员：只能审核拳馆，不能管理其他管理员

### 3. 数据迁移策略
已有拳馆档案：
- 通过数据迁移脚本设置 status='approved'
- reviewed_at 设置为创建时间
- reviewed_by 设置为系统标识

### 4. OpenID 隐私保护
审核记录中存储 user_id（哈希值），不存储原始 OpenID。
reviewed_by 存储管理员 openid（仅内部使用）。

## 云函数设计

### admin-check
检查当前用户是否是管理员

### admin-list
获取管理员列表（仅超级管理员）

### admin-add
添加管理员（仅超级管理员）

### admin-remove
移除管理员（仅超级管理员）

### review-list
获取待审核列表

### review-approve
审核通过

### review-reject
审核拒绝

### gym-create（修改）
添加审核状态逻辑

### gym-get（修改）
检查审核状态，未审核时返回特殊状态

## 页面设计

### role-select 修改
- 检查用户是否是管理员
- 如果是管理员，显示"我是管理员"选项

### admin-dashboard
- 超级管理员：显示管理员管理入口 + 审核列表入口
- 管理员：只显示审核列表入口

### admin-manage
- 超级管理员专用
- 显示管理员列表
- 添加管理员（从用户列表选择）
- 移除管理员

### review-list
- 显示待审核拳馆列表
- 支持筛选（待审核/已通过/已拒绝）

### review-detail
- 显示拳馆详细信息
- 提供"通过"和"拒绝"按钮
- 拒绝时需填写原因
