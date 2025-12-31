# boxing-platform 规格变更

## MODIFIED Requirements

### Requirement: 拳馆档案创建

系统 SHALL 要求拳馆填写名称、地址及定位、联系电话，可选填写拳馆图标。提交后拳馆档案进入待审核状态，需经管理员审核通过后方可使用。

#### Scenario: 完整必填字段提交
- **WHEN** 新拳馆用户填写所有必填字段并提交
- **THEN** 档案创建成功，状态为"待审核"，用户收到"资料审核中"提示

#### Scenario: 跳过可选图标
- **WHEN** 拳馆填写必填字段但不上传图标
- **THEN** 档案仍可成功创建，状态为"待审核"

#### Scenario: 设置定位
- **WHEN** 拳馆需要设置位置
- **THEN** 可使用地图选点或基于地址自动定位

#### Scenario: 必填字段验证
- **WHEN** 拳馆提交时缺少名称、地址或电话
- **THEN** 验证错误阻止提交

#### Scenario: 拳馆待审核状态
- **WHEN** 拳馆档案提交后等待审核
- **THEN** 拳馆无法以拳馆身份进入，显示"资料审核中"提示

#### Scenario: 拳馆审核通过
- **WHEN** 管理员审核通过拳馆档案
- **THEN** 拳馆可正常以拳馆身份进入并使用所有功能

#### Scenario: 拳馆审核拒绝
- **WHEN** 管理员拒绝拳馆档案
- **THEN** 拳馆收到拒绝原因，可重新提交资料

### Requirement: 角色管理

系统 SHALL 支持单个用户账号同时拥有拳手和拳馆两种角色，并在用户仅有一种角色时自动进入。管理员用户在角色选择页面可看到"我是管理员"选项。

#### Scenario: 单角色自动进入
- **WHEN** 用户只有一种注册角色
- **THEN** 跳过角色选择，直接以该角色进入

#### Scenario: 双角色选择
- **WHEN** 用户同时拥有拳手和拳馆角色
- **THEN** 显示角色选择页面，用户可选择进入角色

#### Scenario: 记住上次角色
- **WHEN** 用户再次打开小程序
- **THEN** 提供上次使用的角色作为默认选项

#### Scenario: 管理员角色显示
- **WHEN** 用户是管理员或超级管理员
- **THEN** 角色选择页面显示"我是管理员"选项

#### Scenario: 管理员进入管理界面
- **WHEN** 管理员选择"我是管理员"角色
- **THEN** 进入管理员界面，可查看待审核列表

#### Scenario: 超级管理员权限
- **WHEN** 超级管理员进入管理界面
- **THEN** 可管理管理员账号并查看待审核列表

## ADDED Requirements

### Requirement: 管理员管理

系统 SHALL 支持超级管理员添加和移除管理员用户。管理员数据存储在 admins 集合中，包含 openid 和 superadmin 字段。

#### Scenario: 超级管理员添加管理员
- **WHEN** 超级管理员从已登录用户中选择用户并添加为管理员
- **THEN** 该用户在 admins 集合中创建记录，superadmin=false

#### Scenario: 超级管理员移除管理员
- **WHEN** 超级管理员移除某个管理员
- **THEN** 该管理员记录从 admins 集合中删除

#### Scenario: 超级管理员添加超级管理员
- **WHEN** 超级管理员添加用户并设置为超级管理员
- **THEN** 该用户在 admins 集合中创建记录，superadmin=true

#### Scenario: 管理员列表查看
- **WHEN** 超级管理员查看管理员列表
- **THEN** 显示所有管理员及其角色（超级管理员/管理员）

#### Scenario: 普通管理员无管理权限
- **WHEN** 普通管理员尝试访问管理员管理功能
- **THEN** 系统拒绝访问并提示权限不足

### Requirement: 拳馆审核

系统 SHALL 在拳馆提交资料后通知管理员审核。管理员和超级管理员可查看待审核列表、查看详情并决定通过或拒绝。

#### Scenario: 创建审核记录
- **WHEN** 拳馆提交档案资料
- **THEN** 系统在 gym_reviews 集合创建审核记录，status=pending

#### Scenario: 管理员查看待审核列表
- **WHEN** 管理员进入审核界面
- **THEN** 显示所有 status=pending 的拳馆审核记录

#### Scenario: 管理员查看拳馆详情
- **WHEN** 管理员点击待审核拳馆
- **THEN** 显示拳馆完整信息（名称、地址、电话、位置等）

#### Scenario: 管理员审核通过
- **WHEN** 管理员点击"通过"按钮
- **THEN** 更新 gym_reviews 和 gyms 的 status=approved，记录审核人和审核时间

#### Scenario: 管理员审核拒绝
- **WHEN** 管理员点击"拒绝"并填写拒绝原因
- **THEN** 更新 gym_reviews 和 gyms 的 status=rejected，记录拒绝原因

#### Scenario: 审核后拳馆状态
- **WHEN** 拳馆被审核通过/拒绝后
- **THEN** 拳馆用户可查看审核结果，通过后可正常使用，被拒绝可重新提交

### Requirement: 拳馆状态检查

系统 SHALL 在拳馆尝试进入或使用功能时检查其审核状态。

#### Scenario: 待审核状态
- **WHEN** 拳馆档案状态为 pending
- **THEN** 显示"资料审核中，请耐心等待"提示，不允许进入

#### Scenario: 已通过状态
- **WHEN** 拳馆档案状态为 approved
- **THEN** 拳馆可正常进入并使用所有功能

#### Scenario: 已拒绝状态
- **WHEN** 拳馆档案状态为 rejected
- **THEN** 显示"资料未通过审核"及拒绝原因，提供重新提交选项
