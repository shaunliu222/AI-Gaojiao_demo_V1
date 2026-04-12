# Phase 3: 后端研发第一批 -- 实施计划

> 目标：认证权限 + AI 网关代理 + 安全策略 + 模型管理，平台能登录、能聊天、能拦截
> 日期：2026-04-12

---

## 一、现状分析

### 已有代码（Phase 1 脚手架）

| 文件 | 内容 | Phase 3 动作 |
|------|------|-------------|
| `EduApplication.java` | 启动类 | 保持 |
| `common/R.java` | 统一响应 | 扩展（加分页包装） |
| `config/CorsConfig.java` | CORS | 保持 |
| `config/GlobalExceptionHandler.java` | 异常处理 | 扩展（加 Sa-Token 异常） |
| `config/SaTokenConfig.java` | 拦截器 | 扩展（加角色/权限校验） |
| `config/MyBatisPlusConfig.java` | 分页插件 | 扩展（加自动填充） |
| `controller/HealthController.java` | 健康检查 | 保持 |
| `controller/AuthController.java` | Mock 登录 | **重写**（接 DB） |
| `dto/LoginRequest.java` | 登录请求 | 保持 |
| `dto/LoginResponse.java` | 登录响应 | 保持 |

### 数据库表（init.sql 已定义）

Phase 3 涉及的表全部已在 init.sql 中定义，无需新建：
- 认证：`sys_user`, `sys_role`, `sys_user_role`, `sys_org`, `sys_user_org`
- 安全：`sec_keyword`, `sec_policy`, `sec_audit_log`, `sec_model_policy`
- 模型：`model_config`, `model_permission`, `model_usage_log`

### 前端 API 契约（从 request.ts 和 mock 层推导）

前端已实现的 API 调用：
- `POST /api/auth/login` → 返回 `{ token, username, name, role, avatar, permissions }`
- `GET /api/auth/userinfo` → 同上
- `POST /api/auth/logout`
- `GET /api/health`

前端使用 `localStorage` 存 token，请求头 `Authorization: Bearer <token>`。

---

## 二、实施清单（4 个模块，23 项任务）

### 模块 3.1: M10 认证与权限（8 项）

- [ ] **3.1.1 Entity 实体类**
  - `entity/SysUser.java` — 对应 sys_user 表
  - `entity/SysRole.java` — 对应 sys_role 表
  - `entity/SysUserRole.java` — 对应 sys_user_role 表
  - `entity/SysOrg.java` — 对应 sys_org 表
  - `entity/SysUserOrg.java` — 对应 sys_user_org 表
  - 使用 `@TableName`, `@TableId`, `@TableLogic` 注解

- [ ] **3.1.2 Mapper 接口**
  - `mapper/SysUserMapper.java` — 扩展 BaseMapper，加自定义查询（按角色查用户、关联角色信息）
  - `mapper/SysRoleMapper.java`
  - `mapper/SysUserRoleMapper.java`
  - `mapper/SysOrgMapper.java`
  - `mapper/SysUserOrgMapper.java`

- [ ] **3.1.3 Service 层**
  - `service/SysUserService.java` + `service/impl/SysUserServiceImpl.java`
    - 登录验证（密码 BCrypt 校验）
    - 用户 CRUD（含分页查询）
    - 用户关联角色/组织
  - `service/SysRoleService.java` + `service/impl/SysRoleServiceImpl.java`
    - 角色 CRUD
    - 角色权限分配
  - `service/SysOrgService.java` + `service/impl/SysOrgServiceImpl.java`
    - 组织 CRUD（树形结构）

- [ ] **3.1.4 DTO 层**
  - `dto/UserCreateRequest.java` — 创建用户请求
  - `dto/UserUpdateRequest.java` — 更新用户请求
  - `dto/UserPageResponse.java` — 分页用户列表项
  - `dto/RoleDTO.java` — 角色 DTO
  - `dto/OrgTreeDTO.java` — 组织树 DTO
  - `dto/PageRequest.java` — 通用分页请求

- [ ] **3.1.5 重写 AuthController**
  - `POST /api/auth/login` — 真实 DB 验证 + BCrypt + Sa-Token 登录
  - `GET /api/auth/userinfo` — 查 DB 返回用户 + 角色 + 权限
  - `POST /api/auth/logout` — Sa-Token 登出
  - 保持返回格式与前端现有契约一致（token, username, name, role, avatar, permissions）

- [ ] **3.1.6 用户管理 Controller**
  - `controller/SysUserController.java`
    - `GET /api/users` — 分页列表（搜索、按角色/组织筛选）
    - `GET /api/users/{id}` — 用户详情（含角色列表、组织列表）
    - `POST /api/users` — 创建用户（密码 BCrypt 加密）
    - `PUT /api/users/{id}` — 更新用户
    - `DELETE /api/users/{id}` — 逻辑删除
    - `POST /api/users/batch-import` — 批量导入（Excel 解析，后续可简化为 JSON）
    - `PUT /api/users/{id}/roles` — 分配角色
    - `PUT /api/users/{id}/orgs` — 分配组织

- [ ] **3.1.7 角色 & 组织 Controller**
  - `controller/SysRoleController.java`
    - `GET /api/roles` — 角色列表
    - `POST /api/roles` — 创建角色
    - `PUT /api/roles/{id}` — 更新角色
    - `DELETE /api/roles/{id}` — 删除角色
  - `controller/SysOrgController.java`
    - `GET /api/orgs/tree` — 组织树
    - `POST /api/orgs` — 创建组织
    - `PUT /api/orgs/{id}` — 更新组织
    - `DELETE /api/orgs/{id}` — 删除组织

- [ ] **3.1.8 权限拦截增强**
  - 扩展 `SaTokenConfig` — 加入 `StpUtil.checkRoleOr()` / `StpUtil.checkPermissionOr()`
  - `GlobalExceptionHandler` — 捕获 `NotLoginException`, `NotRoleException`, `NotPermissionException`
  - Sa-Token 权限数据加载：实现 `StpInterface` 接口，从 DB 加载用户角色和权限
  - 初始数据：密码改为 BCrypt 加密（更新 init.sql）

### 模块 3.2: M16 AI 网关代理（5 项）

- [ ] **3.2.1 OpenClaw 通信客户端**
  - `service/OpenClawClient.java` — WebClient 封装
    - `chatCompletion(request)` — 同步调用 `/v1/chat/completions`
    - `chatCompletionStream(request)` — SSE 流式调用
    - `listModels()` — 获取模型列表 `/v1/models`
    - `healthCheck()` — 健康检查 `/healthz`
  - 配置从 `application.yml` 的 `openclaw.gateway.url/token` 读取

- [ ] **3.2.2 会话管理 Entity/Mapper/Service**
  - 新增表 `ai_chat_session`（会话元数据，init.sql 中未定义，需新增）
    ```sql
    CREATE TABLE ai_chat_session (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES sys_user(id),
        agent_id VARCHAR(256),
        title VARCHAR(512),
        last_message TEXT,
        message_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    ```
  - `entity/AiChatSession.java`
  - `mapper/AiChatSessionMapper.java`
  - `service/AiChatSessionService.java`

- [ ] **3.2.3 聊天代理 Controller**
  - `controller/AiChatController.java`
    - `POST /api/ai/chat` — 同步聊天代理
      - Sa-Token 鉴权 → 安全检查（调 M15）→ 模型权限检查（调 M17）→ 转发 OpenClaw
    - `POST /api/ai/chat/stream` — SSE 流式代理（SseEmitter）
      - 相同链路，但流式返回
    - `GET /api/ai/sessions` — 当前用户会话列表
    - `DELETE /api/ai/sessions/{id}` — 删除会话

- [ ] **3.2.4 请求/响应 DTO**
  - `dto/ChatRequest.java` — model, messages[], stream, agentId
  - `dto/ChatMessage.java` — role, content
  - `dto/ChatResponse.java` — 对应 OpenAI chat completion 格式
  - `dto/ChatSessionDTO.java` — 会话列表项

- [ ] **3.2.5 SSE 流式转发实现**
  - 使用 Spring WebFlux `WebClient` 接收 OpenClaw SSE 响应
  - 通过 `SseEmitter` 或 `Flux<ServerSentEvent>` 转发给前端
  - 输出审核：流式结束后异步检查完整回复内容
  - 用量记录：流式结束后异步写入 `model_usage_log`

### 模块 3.3: M15 安全策略服务（5 项）

- [ ] **3.3.1 Entity/Mapper**
  - `entity/SecKeyword.java`, `entity/SecPolicy.java`, `entity/SecAuditLog.java`, `entity/SecModelPolicy.java`
  - `mapper/SecKeywordMapper.java`, `mapper/SecPolicyMapper.java`, `mapper/SecAuditLogMapper.java`, `mapper/SecModelPolicyMapper.java`

- [ ] **3.3.2 安全检查 Service**
  - `service/SecurityCheckService.java`
    - `checkInput(text, userId)` — 输入安全检查
      - Trie 树关键词匹配（从 DB 加载关键词构建）
      - 匹配到 → 根据 severity 决定 block/warn/replace
      - 写入审计日志
    - `checkOutput(text, sessionId)` — 输出安全检查
    - `reloadKeywords()` — 重新加载关键词到内存（增删改后调用）

- [ ] **3.3.3 关键词管理 Controller**
  - `controller/SecKeywordController.java`
    - `GET /api/security/keywords` — 分页列表
    - `POST /api/security/keywords` — 添加关键词
    - `PUT /api/security/keywords/{id}` — 更新
    - `DELETE /api/security/keywords/{id}` — 删除
    - `POST /api/security/keywords/batch-import` — 批量导入
    - `PUT /api/security/keywords/{id}/status` — 启用/停用

- [ ] **3.3.4 安全策略 & 审计日志 Controller**
  - `controller/SecPolicyController.java`
    - `GET /api/security/policies` — 策略列表
    - `POST /api/security/policies` — 创建策略
    - `PUT /api/security/policies/{id}` — 更新策略
    - `DELETE /api/security/policies/{id}` — 删除策略
  - `controller/SecAuditLogController.java`
    - `GET /api/security/audit-logs` — 审计日志分页查询（按时间/用户/规则筛选）
  - `POST /api/security/check` — 内容安全检查（内部调用，被 AI 网关使用）

- [ ] **3.3.5 安全拦截集成**
  - AI 网关代理模块中集成安全检查：
    - 用户发送消息前 → `securityCheckService.checkInput()`
    - AI 回复后 → `securityCheckService.checkOutput()`
  - 拦截结果处理：block 时返回友好提示，warn 时标记但放行

### 模块 3.4: M17 模型管理服务（5 项）

- [ ] **3.4.1 Entity/Mapper**
  - `entity/ModelConfig.java`, `entity/ModelPermission.java`, `entity/ModelUsageLog.java`
  - `mapper/ModelConfigMapper.java`, `mapper/ModelPermissionMapper.java`, `mapper/ModelUsageLogMapper.java`

- [ ] **3.4.2 模型管理 Service**
  - `service/ModelService.java` + `service/impl/ModelServiceImpl.java`
    - 模型配置 CRUD（API Key 加密存储）
    - 模型权限检查（当前用户角色 → 可用模型列表）
    - 模型测试（调用 OpenClaw `/v1/models` 或直接测试模型 API）
    - 设为默认模型（互斥操作）
  - `service/ModelUsageService.java`
    - 异步记录用量日志
    - 用量统计查询（按时间/模型/用户聚合）

- [ ] **3.4.3 模型管理 Controller**
  - `controller/ModelController.java`
    - `GET /api/models` — 模型列表（Tab 筛选 capability）
    - `GET /api/models/{id}` — 模型详情
    - `POST /api/models` — 添加模型
    - `PUT /api/models/{id}` — 更新模型
    - `DELETE /api/models/{id}` — 移除模型
    - `PUT /api/models/{id}/status` — 启用/停用
    - `PUT /api/models/{id}/default` — 设为默认
    - `POST /api/models/{id}/test` — 测试连接

- [ ] **3.4.4 模型权限 Controller**
  - `controller/ModelPermissionController.java`
    - `GET /api/models/{id}/permissions` — 获取模型权限（角色列表）
    - `PUT /api/models/{id}/permissions` — 设置模型权限
    - `GET /api/models/available` — 当前用户可用模型列表
  - `controller/ModelUsageController.java`
    - `GET /api/models/usage` — 用量统计（支持时间范围、按模型/用户分组）

- [ ] **3.4.5 API Key 加密 & 模型安全策略**
  - `common/CryptoUtil.java` — AES 加密/解密工具（用于 API Key 存储）
  - 模型安全策略：`sec_model_policy` 表中配置 角色→模型 可用性
  - AI 网关代理中集成：请求前检查当前用户角色是否有权使用目标模型

---

## 三、公共基础设施（前置任务）

- [ ] **3.0.1 通用分页包装**
  - `common/PageResult.java` — 通用分页响应 `{ total, list, page, size }`
  - 配合 MyBatis-Plus 的 `IPage` 使用

- [ ] **3.0.2 MyBatis-Plus 自动填充**
  - `config/MetaObjectHandler` — 自动填充 `created_at`, `updated_at`

- [ ] **3.0.3 init.sql 更新**
  - 新增 `ai_chat_session` 表
  - 默认用户密码改为 BCrypt 加密值
  - 添加 `sys_permission` 表（存储权限标识，供 Sa-Token 加载）
  - 添加 `sys_role_permission` 表（角色-权限关联）
  - 初始权限数据

---

## 四、实施顺序

```
阶段 A: 公共基础（3.0.1 → 3.0.2 → 3.0.3）
    ↓
阶段 B: M10 认证权限（3.1.1 → 3.1.2 → 3.1.3 → 3.1.4 → 3.1.5 → 3.1.6 → 3.1.7 → 3.1.8）
    ↓
阶段 C: M17 模型管理（3.4.1 → 3.4.2 → 3.4.3 → 3.4.4 → 3.4.5）← 被 AI 网关依赖
    ↓
阶段 D: M15 安全策略（3.3.1 → 3.3.2 → 3.3.3 → 3.3.4 → 3.3.5）← 被 AI 网关依赖
    ↓
阶段 E: M16 AI 网关代理（3.2.1 → 3.2.2 → 3.2.3 → 3.2.4 → 3.2.5）← 依赖 M15 + M17
```

## 五、验收标准

1. **认证验证**：
   - `POST /api/auth/login` → 使用 DB 用户 + BCrypt → 返回 Sa-Token
   - 不同角色登录 → `permissions` 字段不同
   - 无 Token 访问 `/api/users` → 401

2. **聊天验证**：
   - 登录后 `POST /api/ai/chat/stream` → SSE 流式返回 AI 回复
   - 请求链路：鉴权 → 安全检查 → 模型权限 → 转发 OpenClaw

3. **安全验证**：
   - 添加关键词 "测试敏感词" → 发送含该词消息 → 被拦截 → 审计日志有记录

4. **模型管理验证**：
   - 添加模型配置 → 测试连接成功 → 启用
   - 不同角色 → 可用模型列表不同

## 六、新增文件清单（预估 ~45 个 Java 文件）

```
com.edu.ai/
├── common/
│   ├── R.java                    (已有，扩展)
│   ├── PageResult.java           (新增)
│   └── CryptoUtil.java           (新增)
├── config/
│   ├── CorsConfig.java           (已有)
│   ├── GlobalExceptionHandler.java (已有，扩展)
│   ├── SaTokenConfig.java        (已有，扩展)
│   ├── MyBatisPlusConfig.java    (已有，扩展)
│   └── StpInterfaceImpl.java     (新增 - Sa-Token 权限加载)
├── entity/
│   ├── SysUser.java              (新增)
│   ├── SysRole.java              (新增)
│   ├── SysUserRole.java          (新增)
│   ├── SysOrg.java               (新增)
│   ├── SysUserOrg.java           (新增)
│   ├── SecKeyword.java           (新增)
│   ├── SecPolicy.java            (新增)
│   ├── SecAuditLog.java          (新增)
│   ├── SecModelPolicy.java       (新增)
│   ├── ModelConfig.java          (新增)
│   ├── ModelPermission.java      (新增)
│   ├── ModelUsageLog.java        (新增)
│   └── AiChatSession.java        (新增)
├── mapper/
│   ├── SysUserMapper.java        (新增)
│   ├── SysRoleMapper.java        (新增)
│   ├── SysUserRoleMapper.java    (新增)
│   ├── SysOrgMapper.java         (新增)
│   ├── SysUserOrgMapper.java     (新增)
│   ├── SecKeywordMapper.java     (新增)
│   ├── SecPolicyMapper.java      (新增)
│   ├── SecAuditLogMapper.java    (新增)
│   ├── SecModelPolicyMapper.java (新增)
│   ├── ModelConfigMapper.java    (新增)
│   ├── ModelPermissionMapper.java(新增)
│   ├── ModelUsageLogMapper.java  (新增)
│   └── AiChatSessionMapper.java  (新增)
├── service/
│   ├── SysUserService.java       (新增)
│   ├── SysRoleService.java       (新增)
│   ├── SysOrgService.java        (新增)
│   ├── SecurityCheckService.java (新增)
│   ├── ModelService.java         (新增)
│   ├── ModelUsageService.java    (新增)
│   ├── OpenClawClient.java       (新增)
│   ├── AiChatSessionService.java (新增)
│   └── impl/
│       ├── SysUserServiceImpl.java    (新增)
│       ├── SysRoleServiceImpl.java    (新增)
│       ├── SysOrgServiceImpl.java     (新增)
│       ├── SecurityCheckServiceImpl.java (新增)
│       ├── ModelServiceImpl.java      (新增)
│       └── ModelUsageServiceImpl.java (新增)
├── controller/
│   ├── HealthController.java     (已有)
│   ├── AuthController.java       (已有，重写)
│   ├── SysUserController.java    (新增)
│   ├── SysRoleController.java    (新增)
│   ├── SysOrgController.java     (新增)
│   ├── AiChatController.java     (新增)
│   ├── SecKeywordController.java (新增)
│   ├── SecPolicyController.java  (新增)
│   ├── SecAuditLogController.java(新增)
│   ├── ModelController.java      (新增)
│   └── ModelPermissionController.java (新增)
└── dto/
    ├── LoginRequest.java         (已有)
    ├── LoginResponse.java        (已有)
    ├── UserCreateRequest.java    (新增)
    ├── UserUpdateRequest.java    (新增)
    ├── PageRequest.java          (新增)
    ├── ChatRequest.java          (新增)
    ├── ChatMessage.java          (新增)
    ├── ChatResponse.java         (新增)
    └── ChatSessionDTO.java       (新增)
```
