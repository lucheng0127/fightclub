# gym-owner-transfer Specification

## Purpose
TBD - created by archiving change 004-gym-owner-transfer. Update Purpose after archive.
## Requirements
### Requirement: 拳馆负责人转移权限验证

系统 SHALL 验证只有当前拳馆负责人可以发起转移操作。

#### Scenario: 负责人验证成功
- **WHEN** 拳馆负责人发起转移请求
- **THEN** 系统验证 user_id 与当前用户 OpenID 匹配,允许继续操作

#### Scenario: 非负责人拒绝访问
- **WHEN** 非拳馆负责人尝试发起转移
- **THEN** 系统拒绝并提示"您不是该拳馆的负责人"

#### Scenario: 拳馆不存在
- **WHEN** 用户尝试转移不存在的拳馆
- **THEN** 系统拒绝并提示"拳馆不存在"

### Requirement: 接收人资格验证

系统 SHALL 验证接收人满足转移条件。

#### Scenario: 接收人不存在
- **WHEN** 选择的接收人 user_id 在系统中不存在
- **THEN** 系统拒绝并提示"接收人不存在"

#### Scenario: 接收人已拥有拳馆
- **WHEN** 接收人已经是拳馆负责人
- **THEN** 系统拒绝并提示"该用户已拥有拳馆档案,无法接收"

#### Scenario: 不能转移给自己
- **WHEN** 负责人尝试将拳馆转移给自己
- **THEN** 系统拒绝并提示"不能转移给自己"

### Requirement: 拳馆状态验证

系统 SHALL 只允许已审核通过的拳馆进行转移。

#### Scenario: 已审核拳馆可转移
- **WHEN** 拳馆状态为 approved
- **THEN** 系统允许执行转移操作

#### Scenario: 待审核拳馆不可转移
- **WHEN** 拳馆状态为 pending
- **THEN** 系统拒绝并提示"拳馆尚未通过审核,无法转移"

#### Scenario: 已拒绝拳馆不可转移
- **WHEN** 拳馆状态为 rejected
- **THEN** 系统拒绝并提示"拳馆未通过审核,无法转移"

### Requirement: 拳馆所有权转移

系统 SHALL 使用数据库事务将拳馆所有权从一个用户转移到另一个用户。

#### Scenario: 转移成功
- **WHEN** 所有验证通过,执行转移操作
- **THEN** 系统更新 gyms.user_id 为新负责人,更新原用户和新用户的角色标志,创建转移记录

#### Scenario: 原负责人失去拳馆角色
- **WHEN** 转移成功后
- **THEN** 原负责人的 users.has_gym_profile 更新为 false,last_role 更新为 boxer 或 null

#### Scenario: 新负责人获得拳馆角色
- **WHEN** 转移成功后
- **THEN** 新负责人的 users.has_gym_profile 更新为 true,last_role 更新为 gym

#### Scenario: 拳馆其他信息保持不变
- **WHEN** 转移成功后
- **THEN** 拳馆的名称、地址、状态、审核信息等其他字段保持不变

### Requirement: 转移事务安全

系统 SHALL 确保转移操作使用数据库事务保证原子性。

#### Scenario: 转移事务成功
- **WHEN** 执行转移操作
- **THEN** 更新 gyms.user_id、原用户角色、新用户角色、插入转移记录四个操作要么全部成功,要么全部回滚

#### Scenario: 转移事务失败回滚
- **WHEN** 转移过程中任何一步失败
- **THEN** 系统回滚所有已执行的操作,数据保持原状

### Requirement: 转移通知

系统 SHALL 在转移成功后通知原负责人和新负责人。

#### Scenario: 原负责人收到通知
- **WHEN** 转移成功
- **THEN** 原负责人收到应用内消息"您已将拳馆 [拳馆名称] 转移给 [接收人昵称]"

#### Scenario: 新负责人收到通知
- **WHEN** 转移成功
- **THEN** 新负责人收到应用内消息"[原负责人昵称] 将拳馆 [拳馆名称] 转移给您"

#### Scenario: 通知发送失败不影响转移
- **WHEN** 转移成功但通知发送失败
- **THEN** 系统记录错误日志,转移操作仍然有效

### Requirement: 转移历史记录

系统 SHALL 记录所有拳馆转移操作历史。

#### Scenario: 创建转移记录
- **WHEN** 执行转移操作
- **THEN** 系统在 gym_transfers 集合创建记录,包含转移ID、拳馆ID、原负责人、新负责人、转移时间

#### Scenario: 转移记录信息完整
- **WHEN** 创建转移记录
- **THEN** 记录包含原负责人和新负责人的昵称快照、拳馆名称快照、拳馆当时状态快照

### Requirement: 用户列表选择

系统 SHALL 允许负责人从平台用户列表中选择接收人。

#### Scenario: 查看用户列表
- **WHEN** 负责人进入用户选择页面
- **THEN** 显示所有已登录平台用户,包括昵称、创建时间、最后角色

#### Scenario: 搜索用户
- **WHEN** 负责人输入关键词搜索
- **THEN** 列表只显示昵称匹配的用户

#### Scenario: 选择接收人
- **WHEN** 负责人点击某个用户
- **THEN** 返回接收人的 user_id 和昵称,进入确认流程

### Requirement: 转移二次确认

系统 SHALL 要求负责人在转移前进行二次确认。

#### Scenario: 显示确认信息
- **WHEN** 负责人选择接收人后
- **THEN** 对话框显示拳馆名称、接收人昵称,提示"转移后您将失去该拳馆的所有权"

#### Scenario: 确认后执行转移
- **WHEN** 负责人点击确认按钮
- **THEN** 系统执行转移操作

#### Scenario: 取消转移
- **WHEN** 负责人点击取消按钮
- **THEN** 系统取消操作,返回转移页面

### Requirement: 数据隐私

系统 SHALL NOT 在任何前端响应中暴露原始 OpenID。

#### Scenario: 用户列表不暴露 OpenID
- **WHEN** 返回用户列表给前端
- **THEN** 列表中 user_id 使用匿名化哈希值,不包含原始 OpenID

#### Scenario: 转移记录不暴露 OpenID
- **WHEN** 返回转移记录给前端
- **THEN** 记录中的用户标识使用匿名化哈希值

#### Scenario: 云函数内部使用真实 OpenID
- **WHEN** 云函数执行转移操作
- **THEN** 内部查询和更新使用真实 OpenID,但不返回给前端

