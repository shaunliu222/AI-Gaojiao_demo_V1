# Gateway 组件深度分析

## 一、概述

你的理解基本正确，但需要更精确地描述：**Gateway 不仅仅是一个"接收客户端请求转发给 Agent"的简单代理**，它是整个 OpenClaw 系统的**核心枢纽（Hub）**，承担了协议适配、认证鉴权、会话管理、通道调度、插件运行时、定时任务、设备配对等全方位职责。

### 核心定位

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Gateway Server                               │
│                     (端口 18789 默认)                                │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ WebSocket│  │ HTTP API │  │ Control  │  │  MCP     │           │
│  │ 控制面板 │  │ (OpenAI  │  │ UI 静态  │  │ Loopback │           │
│  │ (WS协议) │  │ 兼容层)  │  │ 资源服务 │  │ Server   │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │              │                 │
│  ┌────┴──────────────┴──────────────┴──────────────┴─────┐         │
│  │              认证/鉴权/速率限制层                       │         │
│  │  (Token / Password / Tailscale / Device / TrustedProxy)│         │
│  └───────────────────────┬───────────────────────────────┘         │
│                          │                                          │
│  ┌───────────────────────┴───────────────────────────────┐         │
│  │              方法路由 & 请求分发                        │         │
│  │  (35+ RPC 方法: chat.send, agent.run, config.*, ...)  │         │
│  └──────────┬──────────┬──────────┬──────────────────────┘         │
│             │          │          │                                  │
│  ┌──────────┴──┐ ┌─────┴────┐ ┌──┴──────────┐                     │
│  │ Agent 引擎  │ │ Channel  │ │ Node 注册表 │                     │
│  │ (推理执行)  │ │ Manager  │ │ (设备管理)  │                     │
│  └─────────────┘ └──────────┘ └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 二、Gateway 的输入（入站接口）

Gateway 同时提供 **WebSocket** 和 **HTTP** 两种入站协议。

### 2.1 WebSocket 控制面协议（主协议）

**文件**: `src/gateway/client.ts`, `src/gateway/protocol/`

这是 Gateway 的核心通信协议，基于 JSON-RPC 风格的帧协议：

```typescript
// 连接参数 (ConnectParams)
type ConnectParams = {
  client: {
    id: string;           // 客户端唯一ID
    name: string;         // 客户端名称 (cli / control-ui / ios / android / ...)
    mode: string;         // 客户端模式 (cli / backend / control-ui / node)
    version: string;      // 客户端版本
    platform?: string;    // 平台 (darwin / linux / win32)
    displayName?: string; // 显示名
    deviceFamily?: string;
  };
  role: "operator" | "node";   // 角色
  scopes: OperatorScope[];     // 权限范围
  device?: DeviceIdentity;     // 设备身份
  auth?: { token/password/deviceToken };  // 认证凭据
};
```

**帧类型**：
| 帧类型 | 方向 | 说明 |
|--------|------|------|
| `connect` | 客户端→Gateway | 握手连接，携带认证信息 |
| `connect.challenge` | Gateway→客户端 | 挑战-应答认证 |
| `hello.ok` | Gateway→客户端 | 连接成功，返回支持的方法和功能列表 |
| `request` | 客户端→Gateway | RPC 请求（method + params） |
| `response` | Gateway→客户端 | RPC 响应（result 或 error） |
| `event` | Gateway→客户端 | 服务端推送事件 |

**客户端类型（谁在连接）**：

| 客户端名称 | 模式 | 角色 | 说明 |
|-----------|------|------|------|
| `cli` | cli | operator | 命令行工具 |
| `control-ui` | control-ui | operator | 浏览器 Web 控制台 |
| `ios` | node | node | iOS 移动端 |
| `android` | node | node | Android 移动端 |
| `macos` | node | node | macOS 桌面端 |
| `gateway-client` | backend | operator | SDK/API 集成客户端 |

### 2.2 HTTP REST API（OpenAI 兼容层）

**文件**: `src/gateway/server-runtime-state.ts`, `src/gateway/models-http.ts`, `src/gateway/embeddings-http.ts`, `src/gateway/openresponses-http.ts`

Gateway 提供 OpenAI 兼容的 HTTP 端点：

| 端点 | 方法 | 说明 | 配置项 |
|------|------|------|--------|
| `POST /v1/chat/completions` | POST | OpenAI Chat 兼容接口 | `gateway.http.endpoints.chatCompletions.enabled` |
| `GET /v1/models` | GET | 列出可用模型 | 同上 |
| `GET /v1/models/:id` | GET | 查询单个模型 | 同上 |
| `POST /v1/embeddings` | POST | Embeddings 生成 | 自动启用 |
| `POST /v1/responses` | POST | OpenResponses API | `gateway.http.endpoints.responses.enabled` |
| `POST /hooks/*` | POST | Webhook 回调入口 | 自动 |
| `GET /health` | GET | 健康检查 | 自动 |
| `/*` (控制台) | GET | Control UI 静态资源 | `gateway.controlUi.enabled` |

**HTTP 请求示例**（OpenAI 兼容）：
```json
POST /v1/chat/completions
Headers:
  Authorization: Bearer <token>
  x-openclaw-scopes: operator.write
  x-openclaw-message-channel: api

Body:
{
  "model": "openclaw",
  "messages": [{"role": "user", "content": "hello"}],
  "stream": true
}
```

### 2.3 MCP Loopback Server

**文件**: `src/gateway/mcp-http.ts`

Gateway 启动时会在 `127.0.0.1` 上额外创建一个 MCP (Model Context Protocol) HTTP 服务器，供本地 Agent 调用工具。

## 三、Gateway 的输出（出站流向）

### 3.1 Agent 执行引擎

**核心流程**：消息进入 → `chat.send` RPC → `dispatchInboundMessage()` → Agent 推理

```
客户端消息 ──→ chat.send 方法 ──→ 消息清洗/附件处理
                                       │
                                       ▼
                               dispatchInboundMessage()
                                       │
                                       ▼
                               Agent 推理引擎
                              (SessionManager / Pi)
                                       │
                                       ▼
                              ReplyDispatcher ──→ 广播回所有订阅的客户端
                                               ──→ Channel 渠道转发
```

**文件**: `src/gateway/server-methods/chat.ts`

关键步骤：
1. **消息清洗**: `stripEnvelopeFromMessage()` - 去除元信息封装
2. **附件处理**: `parseMessageWithAttachments()` - 解析图片/文件
3. **会话定位**: 根据 `sessionKey` 找到对应 Agent 的会话
4. **模型解析**: `resolveSessionModelRef()` - 确定使用哪个 LLM 模型
5. **调度执行**: `dispatchInboundMessage()` → Agent 推理
6. **结果回传**: 通过 WebSocket `event` 帧实时流式推送

### 3.2 Channel 消息渠道转发

**文件**: `src/gateway/server-channels.ts`

Gateway 管理所有消息渠道的生命周期：

```
Gateway ChannelManager
  │
  ├── Telegram 渠道
  ├── Discord 渠道
  ├── Slack 渠道
  ├── Signal 渠道
  ├── iMessage 渠道
  ├── WhatsApp Web 渠道
  ├── Matrix (插件)
  ├── Zalo (插件)
  └── ... (其他插件渠道)
```

每个渠道具有独立的：
- 启动/停止生命周期
- 退避重试策略（指数退避，最大 5 分钟，最多 10 次）
- 健康监控
- 账户管理（支持多账户）

### 3.3 Node 设备管理

**文件**: `src/gateway/node-registry.ts`

Gateway 维护一个 Node 注册表，管理所有连接的设备：

```typescript
class NodeRegistry {
  private nodesById: Map<string, NodeSession>;     // nodeId → 会话
  private nodesByConn: Map<string, string>;         // connId → nodeId
  private pendingInvokes: Map<string, PendingInvoke>; // 待处理的远程调用
}
```

Node 是指以 `role: "node"` 连接的客户端（iOS/Android/macOS），Gateway 可以：
- 远程调用 Node 上的命令（如截屏、执行操作）
- 推送通知到 Node
- 管理 Node 的能力声明（caps）和权限

## 四、Gateway 的 35+ RPC 方法

**文件**: `src/gateway/server-methods.ts`

所有 WebSocket RPC 方法按功能域组织：

| 域 | 方法示例 | 说明 |
|----|---------|----|
| **connect** | `connect` | 握手连接 |
| **chat** | `chat.send`, `chat.history`, `chat.abort`, `chat.inject` | 聊天消息收发 |
| **agent** | `agent.run`, `agent.wait` | Agent 推理执行 |
| **agents** | `agents.list`, `agents.create`, `agents.update`, `agents.delete` | 多 Agent 管理 |
| **sessions** | `sessions.list`, `sessions.patch`, `sessions.preview` | 会话管理 |
| **config** | `config.get`, `config.set`, `config.patch`, `config.apply` | 配置管理 |
| **channels** | `channels.status`, `channels.logout` | 渠道状态 |
| **cron** | `cron.add`, `cron.list`, `cron.remove`, `cron.run` | 定时任务 |
| **devices** | `device.pair.approve/reject/list/remove` | 设备配对 |
| **nodes** | `node.invoke`, `node.status` | 远程节点调用 |
| **models** | `models.list`, `models.catalog` | 模型列表 |
| **skills** | `skills.list`, `skills.invoke` | 技能管理 |
| **tools** | `tools.catalog`, `tools.effective` | 工具目录 |
| **talk** | `talk.config`, `talk.speak` | 语音对话 |
| **tts** | `tts.generate` | 文本转语音 |
| **health** | `health` | 健康检查 |
| **logs** | `logs.chat` | 日志查询 |
| **push** | `push.subscribe` | 推送订阅 |
| **send** | `send` | 消息发送 |
| **usage** | `usage.summary` | 使用统计 |
| **update** | `update.check`, `update.run` | 自动更新 |
| **wizard** | `wizard.run` | 引导向导 |
| **doctor** | `doctor.run` | 诊断修复 |
| **web** | `web.*` | Web 提供者 |
| **exec-approvals** | `exec-approvals.get/set` | 执行审批 |
| **secrets** | `secrets.*` | 密钥管理 |

## 五、认证与鉴权体系

**文件**: `src/gateway/auth.ts`, `src/gateway/credentials.ts`

### 5.1 认证方式

```
认证方式决策树：

gateway.auth.mode 配置
  │
  ├── "none"           → 无认证（仅本地回环地址安全）
  ├── "token"          → Bearer Token 认证
  ├── "password"       → 密码认证
  ├── "trusted-proxy"  → 受信代理转发认证
  └── (auto)           → 有 token 用 token，有 password 用 password

额外认证方式：
  ├── Tailscale Whois  → Tailscale 网络身份认证
  ├── Device Token     → 设备配对 Token（移动端用）
  └── Bootstrap Token  → 初始配对引导 Token
```

### 5.2 权限范围（Scopes）

```typescript
type OperatorScope =
  | "operator.admin"      // 完全管理权限
  | "operator.read"       // 只读
  | "operator.write"      // 读写
  | "operator.approvals"  // 执行审批
  | "operator.config"     // 配置管理
  | ...
```

### 5.3 角色模型

- **operator**: CLI/Control UI/SDK 客户端，拥有操作权限
- **node**: 移动/桌面节点设备，拥有节点权限

### 5.4 安全防护

- **速率限制**: `AuthRateLimiter` 防止暴力破解
- **TLS 证书指纹绑定**: WSS 连接支持证书 Pin
- **明文连接拒绝**: 非回环地址必须使用 WSS（CWE-319 防护）
- **CORS/CSP**: Control UI 有完整的内容安全策略
- **控制面写入限流**: `controlPlaneRateLimit` 保护配置变更

## 六、完整请求流程示例

### 6.1 CLI 发送消息流程

```
1. CLI 执行 `openclaw send "Hello"`
   │
2. callGateway({ method: "chat.send", params: {...} })
   │  建立 WebSocket 连接
   │
3. GatewayClient.start()
   │  → ws://127.0.0.1:18789
   │  → 安全检查（仅允许 loopback 或 wss://）
   │
4. 收到 connect.challenge → 签名响应 → 发送 connect 帧
   │  携带: clientName="cli", role="operator", scopes=[...], auth={token:...}
   │
5. Gateway 认证: authorizeGatewayConnect()
   │  → token/password 验证
   │  → 速率限制检查
   │
6. 返回 hello.ok { features: { methods: [...] } }
   │
7. 发送 request: { method: "chat.send", params: { text: "Hello", sessionKey: "..." } }
   │
8. handleGatewayRequest()
   │  → authorizeGatewayMethod() 权限检查
   │  → chatHandlers["chat.send"]
   │
9. chat.send 处理:
   │  → stripEnvelopeFromMessage() 消息清洗
   │  → resolveSessionKeyForRun() 确定会话
   │  → dispatchInboundMessage() 调度到 Agent
   │
10. Agent 推理引擎执行
    │  → LLM API 调用
    │  → 工具调用（如需要）
    │
11. 结果通过 event 帧流式推回:
    │  event: { type: "chat.delta", payload: { text: "Hello! How can..." } }
    │  event: { type: "chat.done", payload: { ... } }
    │
12. 同时广播到所有订阅的客户端（Control UI 等）
```

### 6.2 HTTP OpenAI 兼容请求流程

```
1. POST /v1/chat/completions
   Headers: Authorization: Bearer <token>
   Body: { model: "openclaw", messages: [...] }
   │
2. HTTP 请求处理:
   │  → setDefaultSecurityHeaders()
   │  → authorizeHttpGatewayConnect() 认证
   │  → handleOpenAiChatCompletionsHttpRequest()
   │
3. 转换为内部 Agent 调用:
   │  → agentCommand({ message, sessionKey, ... })
   │
4. Agent 执行，结果以 SSE 流返回:
   │  → setSseHeaders() 设置 SSE 头
   │  → data: {"choices":[{"delta":{"content":"..."}}]}
   │  → data: [DONE]
```

## 七、核心子系统

### 7.1 会话管理

**文件**: `src/gateway/session-utils.ts`

- 会话存储在磁盘 JSONL 文件中（`~/.openclaw/sessions/`）
- 每个 Agent 可以有多个会话
- 支持会话恢复、归档、标题生成
- 使用 `sessionKey` 格式: `agent:<agentId>:session:<sessionId>`

### 7.2 配置热重载

**文件**: `src/gateway/config-reload.ts`

Gateway 支持运行时配置变更：
- 监听配置文件变化
- 动态重启受影响的 Channel
- 更新认证参数
- 刷新模型目录

### 7.3 Cron 定时任务

**文件**: `src/gateway/server-cron.ts`

支持基于 cron 表达式的定时任务调度，可定时触发 Agent 执行。

### 7.4 插件系统集成

**文件**: `src/gateway/server-plugin-bootstrap.ts`

Gateway 在启动时加载所有配置的插件：
- Channel 插件（消息渠道）
- Provider 插件（模型提供者）
- 注册插件的 Gateway 方法和 HTTP 路由

### 7.5 Boot 引导

**文件**: `src/gateway/boot.ts`

启动时自动执行 `BOOT.md` 文件中定义的引导指令。

## 八、Gateway 不是简单代理

对比你的理解 "接收不同的客户端，然后给到后端 Agent 执行"，实际上 Gateway 的角色远不止于此：

| 简单代理模型 | 实际 Gateway 角色 |
|-------------|------------------|
| 接收请求 | 多协议接入（WS + HTTP + MCP） |
| 转发给 Agent | 35+ 种 RPC 方法的路由分发 |
| 返回结果 | 实时广播到所有订阅客户端 |
| - | 完整的认证/鉴权/速率限制体系 |
| - | Channel 渠道的生命周期管理 |
| - | Node 设备注册与远程调用 |
| - | 配置管理与热重载 |
| - | 定时任务调度 |
| - | 插件系统运行时 |
| - | 会话持久化与归档 |
| - | TLS/安全加固 |
| - | 健康监控/可观测性 |
| - | 自动更新检查 |

### 更准确的类比

Gateway 更像是一个 **全功能的应用服务器/中枢**，类似于：
- Kubernetes API Server（提供统一的控制面板 API）
- Home Assistant Core（管理各种设备和自动化）
- VS Code Server（提供 IDE 后端能力）

它是整个 OpenClaw 系统的 **大脑和神经中枢**，不是简单的反向代理或消息中间件。

## 九、关键文件索引

| 文件 | 职责 |
|------|------|
| `server.impl.ts` | Gateway 主服务器实现（启动入口） |
| `server-methods.ts` | RPC 方法注册与请求分发 |
| `server-methods/*.ts` | 各功能域的具体方法实现 |
| `client.ts` | Gateway 客户端 SDK（连接和通信） |
| `call.ts` | 高层 Gateway 调用封装 |
| `auth.ts` | 认证逻辑 |
| `credentials.ts` | 凭据解析 |
| `protocol/` | 协议定义（schema、帧格式、类型） |
| `server-channels.ts` | 消息渠道管理器 |
| `node-registry.ts` | 设备节点注册表 |
| `session-utils.ts` | 会话工具函数 |
| `server-runtime-state.ts` | 运行时状态管理 |
| `server-ws-runtime.ts` | WebSocket 处理器挂载 |
| `config-reload.ts` | 配置热重载 |
| `server-cron.ts` | Cron 定时任务 |
| `boot.ts` | 启动引导 |
| `http-common.ts` | HTTP 通用工具（安全头、SSE等） |
| `server-http.ts` | HTTP 服务器创建 |
| `models-http.ts` | /v1/models 端点 |
| `embeddings-http.ts` | /v1/embeddings 端点 |
| `openresponses-http.ts` | /v1/responses 端点 |
| `mcp-http.ts` | MCP Loopback 服务 |
| `control-ui.ts` | Control UI 静态资源服务 |
