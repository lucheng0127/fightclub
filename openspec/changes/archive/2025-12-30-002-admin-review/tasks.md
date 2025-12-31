# 002-admin-review 实现任务清单

## 1. 数据库与数据模型 (P0)

- [x] 1.1 创建 admins 集合（openid、superadmin、created_at、created_by）
- [x] 1.2 创建 gym_reviews 集合
- [x] 1.3 修改 gyms 集合结构（添加 status、reviewed_at、reviewed_by、reject_reason 字段）
- [ ] 1.4 编写数据迁移脚本（已有拳馆设置 status=approved）
- [ ] 1.5 初始化第一个超级管理员（通过云函数或直接数据库操作）

## 2. 管理员识别与登录 (P0)

- [x] 2.1 创建 admin-check 云函数（检查用户是否是管理员）
- [x] 2.2 修改 login 云函数（返回 is_admin、is_superadmin 标识）
- [x] 2.3 修改 role-select 页面（检查管理员身份，显示"我是管理员"选项）
- [x] 2.4 修改 auth 工具函数（保存管理员状态）

## 3. 管理员管理功能 (P1)

- [x] 3.1 创建 admin-list 云函数（获取管理员列表，仅超级管理员）
- [x] 3.2 创建 admin-add 云函数（添加管理员，仅超级管理员）
- [x] 3.3 创建 admin-remove 云函数（移除管理员，仅超级管理员）
- [x] 3.4 创建 admin-manage 页面（管理员列表、添加、删除）
- [x] 3.5 创建用户选择页面（user-select，支持昵称搜索）
- [x] 3.6 创建 user-list 云函数（获取用户列表，过滤管理员用户）
- [x] 3.7 移除 wechat-update 云函数（不再需要微信号功能）
- [x] 3.8 修改 admin-list/admin-add 支持昵称显示
- [x] 3.9 修改 login 云函数支持昵称保存
- [x] 3.10 修改 login 页面添加昵称输入（必填）
- [x] 3.11 移除所有 wechat_id 相关代码

## 4. 拳馆审核流程 (P0)

- [x] 4.1 修改 gym-create 云函数（创建 gym_reviews 记录，status=pending）
- [x] 4.2 创建 review-list 云函数（获取待审核列表）
- [x] 4.3 创建 review-detail 云函数（获取审核详情）
- [x] 4.4 创建 review-approve 云函数（审核通过）
- [x] 4.5 创建 review-reject 云函数（审核拒绝）
- [x] 4.6 创建 admin-dashboard 页面（入口：审核列表 + 管理员管理）
- [x] 4.7 创建 review-list 页面（待审核列表）
- [x] 4.8 创建 review-detail 页面（审核详情、通过/拒绝操作）

## 5. 拳馆状态检查 (P0)

- [x] 5.1 修改 gym-get 云函数（返回审核状态）
- [x] 5.2 修改 role-select 页面（拳馆角色检查审核状态）
- [x] 5.3 修改 dashboard 页面（显示审核状态提示）
- [x] 5.4 创建 gym-status 页面或组件（显示审核状态和拒绝原因）
- [x] 5.5 实现重新提交功能（被拒绝后可重新编辑提交）

## 6. 权限控制 (P1)

- [x] 6.1 所有 admin-* 云函数添加超级管理员权限检查
- [x] 6.2 所有 review-* 云函数添加管理员权限检查
- [x] 6.3 前端页面权限控制（非管理员无法访问管理页面）

## 7. 测试与验证 (P2)

- [ ] 7.1 测试拳馆提交后进入待审核状态
- [ ] 7.2 测试管理员查看和审核流程
- [ ] 7.3 测试超级管理员管理管理员功能
- [ ] 7.4 测试权限控制（普通用户无法访问管理功能）
- [ ] 7.5 测试审核通过后拳馆可正常使用
- [ ] 7.6 测试审核拒绝后拳馆收到提示并可重新提交

## 实现备注

### 已完成核心功能

**云函数 (14个)**：
- admin-check: 检查管理员状态
- admin-list: 获取管理员列表（超级管理员，支持昵称显示）
- admin-add: 添加管理员（超级管理员，支持保存昵称）
- admin-remove: 移除管理员（超级管理员）
- user-list: 获取用户列表（支持昵称搜索，过滤管理员用户）
- review-list: 获取审核列表（默认显示全部）
- review-detail: 获取审核详情
- review-approve: 审核通过
- review-reject: 审核拒绝
- gym-create (修改): 添加审核状态逻辑
- gym-get (修改): 返回审核状态
- gym-list (修改): 只显示已审核通过的拳馆
- gym-update (修改): 支持被拒绝后重新提交
- stats (修改): 只统计已审核通过的拳馆
- login (修改): 返回管理员状态，支持保存用户昵称

**页面 (8个)**：
- pages/auth/login (修改): 添加昵称输入界面（授权后必填）
- pages/admin/dashboard: 管理员面板（移除退出按钮）
- pages/admin/admin-manage: 管理员管理页面（显示昵称）
- pages/admin/user-select: 用户选择页面（支持昵称搜索）
- pages/admin/review-list: 审核列表（默认显示全部）
- pages/admin/review-detail: 审核详情
- pages/auth/role-select (修改): 添加管理员选项，使用 admin-placeholder.png 图标
- pages/gym/profile-create (修改): 显示审核中提示
- pages/gym/detail (修改): 检查审核状态
- pages/gym/profile-edit (修改): 重新提交后返回角色选择页面

**未完成功能**：
- 数据迁移脚本：已有拳馆设置 status=approved
- 超级管理员初始化：需要手动创建第一个超级管理员
- users 表 nickname 字段：用户首次登录时自动添加
