<!--
Sync Impact Report:
- Version: 1.0.0 (initial ratification)
- Added principles: 6 core principles for WeChat Mini Program + Cloud Development
- Templates requiring updates:
  - ✅ plan-template.md (Constitution Check section updated)
  - ✅ spec-template.md (aligned with constitution principles)
  - ✅ tasks-template.md (aligned with constitution principles)
-->

# Fight Club Constitution

## Core Principles

### I. WeChat Mini Program + Cloud Development First

**技术栈优先原则**:
- 本项目以微信小程序 + 微信云开发作为第一技术选项
- 不允许在未明确需求的情况下引入外部服务和第三方后端
- 所有架构决策必须优先考虑微信生态系统能力
- 如需引入外部服务，必须先评估微信云开发原生替代方案

**理由**: 保持技术栈简洁，降低维护成本，充分利用微信生态优势，避免过度工程化。

### II. Business Correctness Above All

**业务正确性高于一切**:
- 功能实现必须符合业务需求和用户预期
- 代码正确性优先于代码优雅性
- 不允许为追求技术完美而牺牲业务逻辑正确性
- 所有异常情况必须有明确的业务处理规则

**理由**: 软件的最终价值是解决业务问题，技术手段服务于业务目标。

### III. OpenID Protection (NON-NEGOTIABLE)

**禁止暴露用户 OpenID**:
- OpenID 是用户敏感标识，严禁在任何前端、日志、错误信息中暴露
- 云函数返回给前端的数据不得包含原始 OpenID
- 如需前端关联用户数据，必须使用匿名化后的用户标识
- 数据库权限必须严格控制 OpenID 字段的访问

**理由**: OpenID 可用于关联用户身份，暴露会造成严重隐私安全问题。

### IV. Transaction Safety

**事务安全原则**:
- 不允许出现数据写入部分成功和部分失败的情况
- 多表操作必须使用数据库事务保证原子性
- 云函数操作必须实现适当的回滚机制
- 分布式场景必须考虑最终一致性补偿机制

**理由**: 数据一致性是系统可信度的基石，部分失败会导致数据不可用。

### V. Static Asset Management

**静态资源管理规范**:
- 需要使用图片等静态资源时，必须提示以下信息：
  - 资源类型（PNG/JPG/SVG 等）
  - 存放目录（如 `assets/images/`）
  - 文件命名规范
- 必须由开发者手动下载资源后再确认下一步
- 不允许自动从外部 URL 下载资源到项目

**理由**: 确保资源来源可控，避免版权问题，保持项目文件完整性。

### VI. Constitution Compliance

**宪法遵守原则**:
- 所有代码生成和修改必须遵守本宪法
- PR 评审必须检查宪法合规性
- 发现违宪代码必须拒绝或要求修正
- 宪法冲突时，业务正确性（原则 II）之外，其他原则同等重要

**理由**: 宪法是项目质量的一致性保障，所有参与者必须共同维护。

## Technology Stack Requirements

**Primary Stack**:
- 前端: 微信小程序框架 (WXML, WXSS, JavaScript/TypeScript)
- 后端: 微信云开发 (云函数、云数据库、云存储)
- 数据库: 微信云数据库 (类 MongoDB)

**External Services**:
- 仅在明确需求且微信云开发无法满足时引入
- 需文档记录引入理由和替代方案评估

## Development Workflow

**Code Generation**:
- 所有 AI 辅助生成的代码必须符合宪法原则
- 生成后必须人工审查宪法合规性
- 发现违宪内容立即修正

**Pull Request Review**:
- 检查是否使用了未经批准的外部服务
- 检查是否有 OpenID 泄露风险
- 检查事务安全是否得到保证
- 检查静态资源是否符合管理规范

**Complexity Justification**:
- 引入新依赖或复杂架构需文档说明理由
- 优先选择微信原生能力的简单方案

## Governance

**Constitution Authority**:
- 本宪法高于所有其他开发实践
- 所有 PR 和评审必须验证合规性
- 复杂性必须有明确业务理由支撑

**Amendment Process**:
- 宪法修改需要团队讨论批准
- 修改后需更新相关模板和文档
- 版本号遵循语义化版本规则

**Versioning Policy**:
- MAJOR: 原则移除或不兼容的重大变更
- MINOR: 新增原则或实质性扩展
- PATCH: 说明性修正、文字优化

**Version**: 1.0.0 | **Ratified**: 2025-12-26 | **Last Amended**: 2025-12-26
