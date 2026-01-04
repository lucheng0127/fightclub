# 设计文档: 拳馆负责人更换功能

## 架构设计

### 系统组件

1. **前端页面** (`pages/gym/owner-transfer/`)
   - 展示当前拳馆信息
   - 提供用户选择入口(复用 `admin/user-select` 页面)
   - 二次确认对话框
   - 转移结果提示

2. **云函数** (`gym-transfer`)
   - 验证当前用户权限
   - 验证接收人资格
   - 执行数据库事务转移
   - 发送通知消息

3. **数据库集合** (`gym_transfers`)
   - 记录所有转移操作历史
   - 支持审计和追溯

### 数据流程

```
用户发起转移
    ↓
前端验证 (检查是否为拳馆负责人)
    ↓
调用 user-list 云函数获取用户列表
    ↓
用户选择接收人
    ↓
二次确认对话框
    ↓
调用 gym-transfer 云函数
    ↓
云函数权限验证
    ↓
数据库事务操作:
  1. 更新 gyms.user_id
  2. 更新原用户 users.has_gym_profile = false
  3. 更新新用户 users.has_gym_profile = true
  4. 记录转移历史到 gym_transfers
    ↓
发送通知消息
    ↓
返回成功结果
```

## 数据模型

### gym_transfers 集合

```javascript
{
  _id: ObjectId,              // 主键
  transfer_id: String,        // 转移ID (前缀: transf_)
  gym_id: String,             // 拳馆ID
  gym_name: String,           // 拳馆名称(快照)
  from_user_id: String,       // 原负责人 OpenID
  from_user_hash: String,     // 原负责人匿名ID(用于前端显示)
  from_nickname: String,      // 原负责人昵称(快照)
  to_user_id: String,         // 新负责人 OpenID
  to_user_hash: String,       // 新负责人匿名ID(用于前端显示)
  to_nickname: String,        // 新负责人昵称(快照)
  transferred_at: Date,       // 转移时间
  gym_status: String          // 拳馆当时状态(快照)
}
```

## API 设计

### gym-transfer 云函数

**请求参数**:
```javascript
{
  target_user_id: string  // 接收人的匿名 user_id (hash后的ID)
}
```

**响应数据**:
```javascript
// 成功
{
  errcode: 0,
  errmsg: 'success',
  data: {
    transfer_id: string,
    gym_id: string,
    to_nickname: string
  }
}

// 失败
{
  errcode: number,
  errmsg: string
}
```

**错误码**:
- `8001`: 不是拳馆负责人
- `8002`: 接收人用户不存在
- `8003`: 接收人已拥有拳馆档案
- `8004`: 拳馆状态不允许转移(未审核通过)
- `8005`: 不能转移给自己
- `8006`: 数据库事务失败

## 技术考虑

### 事务安全

使用微信云数据库事务确保以下操作要么全部成功,要么全部回滚:

1. 更新 `gyms` 集合的 `user_id` 字段
2. 更新原负责人 `users` 记录的 `has_gym_profile` 和 `last_role`
3. 更新新负责人 `users` 记录的 `has_gym_profile` 和 `last_role`
4. 在 `gym_transfers` 集合插入转移记录

如果任何一步失败,整个操作回滚,保证数据一致性。

### OpenID 隐私保护

- 前端传递接收人的匿名 `user_id` (hash 后的值)
- 云函数内部查询获取真实 OpenID
- 所有返回给前端的数据使用匿名 ID
- `gym_transfers` 集合同时存储 OpenID(用于审计)和匿名 ID(用于前端展示)

### 权限验证

1. **发起人验证**: 检查当前用户是否为拳馆负责人
   - 查询 `gyms` 集合,验证 `user_id` 是否匹配当前用户 OpenID

2. **接收人验证**:
   - 根据匿名 `user_id` 反查真实 OpenID
   - 检查接收人是否已拥有拳馆档案
   - 检查接收人是否为发起人自己

3. **拳馆状态验证**:
   - 只有 `status = 'approved'` 的拳馆可以转移
   - `pending` 和 `rejected` 状态的拳馆不允许转移

### 通知机制

转移成功后发送两类通知:

1. **应用内消息** (存储在 `notifications` 集合):
   - 原负责人: "您已将拳馆 [拳馆名称] 转移给 [接收人昵称]"
   - 新负责人: "[原负责人昵称] 将拳馆 [拳馆名称] 转移给您"

2. **微信订阅消息** (可选):
   - 调用 `notification-send` 云函数
   - 需要用户已订阅相关消息模板

## 前端设计

### 页面流程

1. **进入转移页面**: 从拳馆主页面添加"转移拳馆"入口
2. **展示当前信息**: 显示拳馆名称、当前负责人信息
3. **选择接收人**: 点击"选择接收人"跳转到用户选择页面
4. **二次确认**: 显示选中用户信息,要求用户确认
5. **执行转移**: 调用云函数,显示加载状态
6. **结果反馈**: 成功/失败提示,成功后跳转到角色选择页面

### UI 组件

复用现有组件:
- 用户选择器 (复用 `admin/user-select` 页面逻辑)
- 确认对话框 (使用 `wx.showModal`)
- 加载提示 (使用 `wx.showLoading`)

## 依赖关系

### 依赖现有功能

- `user-list` 云函数: 获取平台用户列表
- `gym-get` 云函数: 获取拳馆信息验证权限
- `notification-send` 云函数: 发送通知消息
- `users` 集合: 用户角色标志
- `gyms` 集合: 拳馆档案

### 被依赖功能

无。此功能独立于现有功能,不影响其他模块。

## 测试策略

### 功能测试

1. 正常转移流程
2. 接收人已拥有拳馆
3. 尝试转移给自己
4. 未审核拳馆尝试转移
5. 非负责人尝试转移

### 事务测试

1. 模拟事务回滚场景
2. 并发转移请求
3. 网络中断后重试

### 边界测试

1. 用户列表为空
2. 接收人不存在
3. 拳馆不存在

### 安全测试

1. OpenID 不暴露
2. 权限验证正确
3. 恶意参数处理
