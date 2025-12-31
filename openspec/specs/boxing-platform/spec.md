# boxing-platform Specification

## Purpose
TBD - created by archiving change 001-boxing-platform. Update Purpose after archive.
## Requirements
### Requirement: 用户授权与访问控制

系统 SHALL 在首次启动时请求用户信息（昵称、头像）和位置授权，并使用 OpenID 进行身份管理。

#### Scenario: 首次授权成功
- **WHEN** 新用户打开小程序并授予用户信息和位置权限
- **THEN** 系统获取用户 OpenID 并存储，引导用户选择角色

#### Scenario: 拒绝位置授权
- **WHEN** 用户拒绝位置授权
- **THEN** 用户仍可使用平台，但基于距离的功能被禁用

#### Scenario: OpenID 隐私保护
- **WHEN** 云函数返回数据给前端
- **THEN** 不得包含原始 OpenID，使用匿名化标识

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

### Requirement: 拳手档案创建

系统 SHALL 要求拳手填写身高、体重、性别、昵称、出生日期，可选填写战绩、城市、所属拳馆、联系电话。

#### Scenario: 完整必填字段提交
- **WHEN** 新拳手用户填写所有必填字段并提交
- **THEN** 档案创建成功，用户可查看主页面

#### Scenario: 必填字段验证
- **WHEN** 拳手提交时有必填字段为空
- **THEN** 提交按钮被禁用或显示验证错误信息

#### Scenario: 仅填必填字段
- **WHEN** 拳手只填写必填字段，跳过所有可选字段
- **THEN** 档案仍可成功创建

#### Scenario: 出生日期格式验证
- **WHEN** 拳手输入无效的出生日期格式
- **THEN** 显示格式验证错误

### Requirement: 拳手档案编辑

系统 SHALL 允许修改除性别和出生日期外的所有档案字段。

#### Scenario: 修改允许字段
- **WHEN** 拳手进入编辑模式修改身高、体重、昵称等允许的字段
- **THEN** 修改保存并立即对其他用户可见

#### Scenario: 性别和出生日期不可修改
- **WHEN** 拳手进入编辑模式
- **THEN** 性别和出生日期字段为只读或隐藏

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

### Requirement: 拳馆档案编辑

系统 SHALL 允许修改拳馆档案的所有字段。

#### Scenario: 编辑拳馆信息
- **WHEN** 拳馆查看自己的档案并编辑信息
- **THEN** 修改保存并反映在搜索结果中

### Requirement: 发现与筛选 - 拳手

系统 SHALL 显示平台拳手总数，并允许按城市、年龄范围、体重范围筛选拳手。

#### Scenario: 显示拳手总数
- **WHEN** 用户在主面板查看拳手列表
- **THEN** 显示平台上的拳手总数

#### Scenario: 按城市筛选拳手
- **WHEN** 用户应用城市筛选条件
- **THEN** 只显示该城市的拳手

#### Scenario: 按年龄和体重筛选
- **WHEN** 用户应用年龄范围和体重范围筛选条件
- **THEN** 只显示同时符合所有条件的拳手

#### Scenario: 清除所有筛选
- **WHEN** 用户清除所有筛选条件
- **THEN** 显示所有拳手

### Requirement: 发现与筛选 - 拳馆

系统 SHALL 显示平台拳馆总数，并允许按城市筛选和按距离排序拳馆。

#### Scenario: 显示拳馆总数
- **WHEN** 用户在主面板查看拳馆列表
- **THEN** 显示平台上的拳馆总数

#### Scenario: 按城市筛选拳馆
- **WHEN** 用户应用城市筛选条件
- **THEN** 只显示该城市的拳馆

#### Scenario: 按距离排序（已授权位置）
- **WHEN** 用户已授权位置信息并查看拳馆
- **THEN** 可按距离用户当前位置的距离排序

#### Scenario: 距离功能禁用（未授权位置）
- **WHEN** 用户未授权位置信息
- **THEN** 距离排序功能不可用

### Requirement: 档案详情查看

系统 SHALL 显示拳手或拳馆的完整档案信息，未填写的可选字段应被隐藏或标记为未提供。

#### Scenario: 查看拳手详情
- **WHEN** 用户从拳手列表中点击某个拳手
- **THEN** 打开详情页面显示该拳手的完整档案

#### Scenario: 未填写可选字段
- **WHEN** 拳手未填写战绩、电话、所属拳馆等可选字段
- **THEN** 这些字段被隐藏或显示为"未提供"

#### Scenario: 查看拳馆详情
- **WHEN** 用户查看拳馆详情且拳馆提供了图标
- **THEN** 图标显示在详情页面

#### Scenario: 拳馆地址导航
- **WHEN** 拳馆提供了地址和位置信息
- **THEN** 地址显示并可用于导航

#### Scenario: 自动计算年龄
- **WHEN** 用户查看拳手档案
- **THEN** 系统根据出生日期自动计算并显示年龄

### Requirement: 事务安全

系统 SHALL 确保所有多数据库写入操作使用事务保证原子性。

#### Scenario: 档案创建事务
- **WHEN** 创建带有关联的档案（如拳手关联拳馆）
- **THEN** 操作要么完全成功，要么完全回滚，不允许部分成功

### Requirement: 数据隐私

系统 SHALL NOT 在任何前端响应中暴露原始 OpenID，MUST 使用匿名化用户标识进行前端数据关联。

#### Scenario: API 响应不包含 OpenID
- **WHEN** 任何云函数返回数据给前端
- **THEN** 响应数据中不得包含原始 OpenID

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

