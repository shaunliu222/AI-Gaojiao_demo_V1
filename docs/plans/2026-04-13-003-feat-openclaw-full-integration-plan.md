---
title: "feat: OpenClaw full integration — session sync, config sync, edu MCP server"
type: feat
status: active
date: 2026-04-13
---

# OpenClaw 全链路集成

## Overview

打通 Web 平台与 OpenClaw Gateway 的完整链路：会话跨渠道同步、平台 Agent 配置写入 OpenClaw、开发教育 MCP Server（知识库检索 + 教务查询），实现用户在飞书/Web/微信与 AI Agent 对话时可调用平台资源和工具。

## Problem Frame

当前断裂点：
1. Web 对话通过 `/api/ai/chat/stream` 代理到 OpenClaw，飞书通过 OpenClaw Channel 插件直连 — 两条链路的会话不共享
2. 平台创建的 Agent/Skill/MCP 配置存在 DB 但不同步到 OpenClaw Runtime
3. OpenClaw Agent 无法访问平台的知识图谱、资源中心数据
4. 无权限感知 — Agent 不知道当前用户是谁、有什么权限

## Requirements Trace

- R1. 同一用户在 Web 和飞书与同一 Agent 的对话历史同步
- R2. 平台创建 Agent 后，OpenClaw 自动识别并路由到该 Agent
- R3. 教育 MCP Server 提供知识库检索和教务查询工具
- R4. Agent 调用知识库时根据用户权限返回公共 + 个人数据
- R5. 飞书/微信用户身份映射到平台用户（权限关联）

## Scope Boundaries

- NOT modifying OpenClaw 核心源码 — 通过 Extension/Plugin/MCP 扩展
- NOT implementing 微信 Channel（飞书优先，微信后续）
- NOT building full RAG pipeline — 用现有知识图谱检索 API

### Deferred to Separate Tasks

- 微信 Channel 集成: 飞书跑通后复制模式
- 向量检索（pgvector）: Phase 5 已规划，MCP 调用时加入
- Agent 自动测评: 后续

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
用户消息流:

飞书 ──→ OpenClaw Feishu Channel ──→ dispatchInboundMessage()
Web  ──→ Spring Boot /api/ai/chat ──→ OpenClaw HTTP API (/v1/chat/completions)
                                            │
                                            ▼
                                   OpenClaw Agent Runtime
                                   (sessionKey = agent:{id}:user:{userId})
                                            │
                                   ┌────────┼────────┐
                                   ▼        ▼        ▼
                              内置工具   MCP 工具   SubAgent
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                        edu-knowledge  edu-academic  edu-resource
                        MCP Server     MCP Server    MCP Server
                              │           │           │
                              ▼           ▼           ▼
                        Spring Boot API (with user token for permission)
                        /api/knowledge/query  /api/academic/*  /api/resources
```

## Key Technical Decisions

- **会话同步**: 统一 sessionKey 格式 `agent:{agentId}:user:{userId}`。Web 代理请求时在 header 中注入 `x-openclaw-session-key`，飞书 Channel 通过 userId 映射生成相同 key
- **配置同步**: 不修改 OpenClaw YAML — 通过 OpenClaw HTTP API 动态注册 Agent（`POST /v1/chat/completions` 的 model 参数支持 `openclaw/{agentId}`）
- **MCP Server**: 用 TypeScript 开发（@modelcontextprotocol/sdk），部署为独立 HTTP 服务，OpenClaw 通过 MCP HTTP transport 连接
- **权限传递**: MCP 工具调用时在 context 中携带 user token，MCP Server 用该 token 调用 Spring Boot API（已有 Sa-Token 鉴权）

## Output Structure

```
edu-platform/
├── edu-mcp-server/              # 教育 MCP Server (TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # MCP Server 入口
│       ├── tools/
│       │   ├── knowledge-search.ts   # 知识库检索工具
│       │   ├── academic-query.ts     # 教务查询工具
│       │   └── resource-search.ts    # 资源检索工具
│       └── utils/
│           └── api-client.ts    # 调用 Spring Boot API 的客户端
├── edu-backend/
│   └── src/main/java/com/edu/ai/
│       ├── controller/
│       │   └── AiChatController.java  # 修改: 注入 sessionKey
│       └── service/
│           └── OpenClawClient.java    # 修改: 支持 sessionKey header
└── edu-admin/
    └── src/pages/chat/index.tsx       # 修改: 传递 userId 生成 sessionKey
```

## Implementation Units

- [ ] **Unit 1: Web 对话注入 sessionKey 实现会话持久化**

**Goal:** Web 对话通过 sessionKey 关联用户身份，使同一用户的历史对话在 OpenClaw 中持续

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `edu-platform/edu-backend/src/main/java/com/edu/ai/service/OpenClawClient.java`
- Modify: `edu-platform/edu-backend/src/main/java/com/edu/ai/controller/AiChatController.java`
- Modify: `edu-platform/edu-admin/src/pages/chat/index.tsx`

**Approach:**
- OpenClawClient: chatCompletion/chatCompletionStream 方法增加 sessionKey 参数
- AiChatController: 从 Sa-Token 获取 userId，构造 sessionKey = `agent:main:user:{userId}`
- 前端 chatStream: 传递 agentId 用于 sessionKey 构造
- OpenClaw HTTP API 通过 `x-openclaw-session-key` header 接收

**Test scenarios:**
- Happy path: 用户 A 发送消息 → 关闭页面 → 重新打开 → 发送消息 → OpenClaw 保持上下文
- Happy path: 用户 A 和用户 B 同时对话 → 各自独立的会话
- Integration: Web 发消息后，检查 OpenClaw 的 session transcript 中有对应记录

**Verification:**
- 同一用户连续对话保持上下文

- [ ] **Unit 2: 飞书 Channel 用户身份映射**

**Goal:** 飞书用户 ID 映射到平台用户 ID，生成与 Web 相同的 sessionKey

**Requirements:** R1, R5

**Dependencies:** Unit 1

**Files:**
- Modify: `edu-platform/edu-backend/src/main/java/com/edu/ai/controller/AiChatController.java` (新增映射 API)
- Create: `edu-platform/edu-backend/src/main/java/com/edu/ai/service/UserMappingService.java`
- Modify: `edu-platform/sql/init.sql` (新增 user_channel_mapping 表)

**Approach:**
- 新表 `user_channel_mapping`: channel_type + channel_user_id + platform_user_id
- 首次绑定: 飞书用户发消息 → 后端 API 查映射 → 无映射则提示绑定（发送平台登录链接）
- 已绑定: 飞书 user_id → 查到 platform_user_id → 生成相同 sessionKey
- OpenClaw 飞书 Channel webhook 中注入 x-openclaw-session-key

**Test scenarios:**
- Happy path: 已绑定用户在飞书发消息 → sessionKey 与 Web 一致 → 上下文共享
- Edge case: 未绑定用户 → 收到"请先绑定平台账号"引导消息
- Happy path: 绑定后再发消息 → 正常对话

**Verification:**
- 飞书发消息和 Web 发消息共享同一对话上下文

- [ ] **Unit 3: 教育 MCP Server — 项目脚手架 + 知识库检索工具**

**Goal:** 创建 TypeScript MCP Server，注册知识库检索工具

**Requirements:** R3, R4

**Dependencies:** None

**Files:**
- Create: `edu-platform/edu-mcp-server/package.json`
- Create: `edu-platform/edu-mcp-server/tsconfig.json`
- Create: `edu-platform/edu-mcp-server/src/index.ts`
- Create: `edu-platform/edu-mcp-server/src/tools/knowledge-search.ts`
- Create: `edu-platform/edu-mcp-server/src/utils/api-client.ts`

**Approach:**
- 使用 `@modelcontextprotocol/sdk` 创建 MCP Server
- 注册工具 `search_knowledge`: 输入 question + graphId → 调用 Spring Boot `/api/knowledge/graphs/{id}/query` → 返回匹配节点和知识片段
- api-client: 封装对 Spring Boot API 的 HTTP 调用，携带 user token 做权限过滤
- 启动为 HTTP 服务（port 3100），OpenClaw 通过 MCP HTTP transport 连接

**Test scenarios:**
- Happy path: MCP 工具被调用 → search_knowledge({question: "排序算法"}) → 返回知识图谱匹配结果
- Error path: Spring Boot API 不可用 → 返回友好错误信息
- Integration: OpenClaw Agent 调用 search_knowledge → 结果注入到 AI 回复中

**Verification:**
- MCP Server 启动，tool list 返回 search_knowledge
- 调用工具返回知识图谱检索结果

- [ ] **Unit 4: MCP Server — 教务查询 + 资源检索工具**

**Goal:** 注册教务查询和资源检索两个 MCP 工具

**Requirements:** R3, R4

**Dependencies:** Unit 3

**Files:**
- Create: `edu-platform/edu-mcp-server/src/tools/academic-query.ts`
- Create: `edu-platform/edu-mcp-server/src/tools/resource-search.ts`
- Modify: `edu-platform/edu-mcp-server/src/index.ts`

**Approach:**
- `query_academic`: 输入 student_id + query_type (schedule/grade/course) → 调用平台 API → 返回教务数据（demo 阶段返回示例数据）
- `search_resources`: 输入 keyword + file_type → 调用 `/api/resources?keyword=xxx` → 返回资源列表
- 权限: 通过 context 中的 user token 透传到 Spring Boot API

**Test scenarios:**
- Happy path: query_academic({query_type: "schedule"}) → 返回课表数据
- Happy path: search_resources({keyword: "高等数学"}) → 返回匹配资源列表

**Verification:**
- 3 个 MCP 工具全部可用

- [ ] **Unit 5: OpenClaw 配置 MCP Server 连接**

**Goal:** 配置 OpenClaw 连接教育 MCP Server，Agent 可调用教育工具

**Requirements:** R2, R3

**Dependencies:** Unit 3, Unit 4

**Files:**
- Create: `openclaw-config/mcp-servers.yaml` (或修改 OpenClaw 现有配置)
- Modify: `edu-platform/DEPLOY.md` (启动说明)

**Approach:**
- 在 OpenClaw 配置中添加 MCP Server: `edu-mcp` → `http://localhost:3100`
- Agent 配置中引用 MCP Server: `mcpServers: ["edu-mcp"]`
- 测试: 对话中提问"帮我查一下排序算法" → Agent 调用 search_knowledge → 返回图谱结果

**Test scenarios:**
- Integration: "帮我查一下课表" → Agent 调用 query_academic → 返回课表
- Integration: "排序算法是什么" → Agent 调用 search_knowledge → 用知识片段回答

**Verification:**
- 在飞书/Web 对话中提问，Agent 自动调用 MCP 工具并在回答中使用结果

- [ ] **Unit 6: 端到端集成测试 + 文档更新**

**Goal:** 全链路测试和部署文档

**Requirements:** R1-R5

**Dependencies:** Unit 1-5

**Files:**
- Modify: `edu-platform/DEPLOY.md`
- Modify: `edu-platform/docker-compose.yml` (添加 edu-mcp-server 服务)

**Approach:**
- 测试场景: Web 登录 → 对话 → 飞书同一问题 → 验证上下文同步
- 测试场景: 提问知识图谱问题 → Agent 调用 MCP → 正确回答
- docker-compose 添加 edu-mcp-server 容器

**Test scenarios:**
- E2E: admin 在 Web 提问"排序算法" → Agent 调用知识库 → 回答包含图谱知识
- E2E: teacher 在飞书提问同一问题 → 如果已绑定，上下文延续
- E2E: student 提问 → 只能访问公共知识 + 自己的私有数据

**Verification:**
- 全链路跑通，DEPLOY.md 更新

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| OpenClaw 不支持 x-openclaw-session-key HTTP header | 验证源码 — 如不支持，通过 model 参数传递 session 信息 |
| 飞书 Channel 插件的 webhook 回调不经过 Spring Boot | 在 OpenClaw 飞书插件配置中添加 webhook preprocessing |
| MCP Server 与 OpenClaw 的 HTTP transport 兼容性 | 使用官方 @modelcontextprotocol/sdk，遵循标准协议 |
| 用户权限透传到 MCP 工具 | MCP tool context 中携带 token，工具函数内调 API 时传递 |

## Sources & References

- OpenClaw Channel 架构: `claude-doc/8-Agent_Channels_Plugins三者关系分析.md`
- OpenClaw Gateway: `claude-doc/5-Gateway组件深度分析.md`
- MCP 规划: `claude-doc/12-高教AI平台底层架构设计研究报告.md` (MCP Server 规划表)
- OpenClaw sessionKey: `claude-doc/5` line 360 — `agent:<agentId>:session:<sessionId>`
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
