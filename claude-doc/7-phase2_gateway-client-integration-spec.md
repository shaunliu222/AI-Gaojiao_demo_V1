# Phase 2: Gateway 标准客户端接入规范与二次开发指南

## 一、架构总览：客户端接入的标准路径

基于源码分析，Gateway 提供 **两条标准接入路径**，所有现有客户端（CLI / WebUI / macOS / iOS / Android / SDK）都通过其中之一接入：

```
                           ┌──────────────────────────────────────────┐
                           │            Gateway Server                │
                           │            (端口 18789)                  │
┌───────────┐              │                                          │
│  CLI      │──── WS ─────▶│  路径 A: WebSocket 控制面协议             │
│  WebUI    │──── WS ─────▶│  (JSON-RPC over WebSocket)               │
│  macOS    │──── WS ─────▶│  ─ 全功能：120+ 方法，实时事件推送        │
│  iOS      │──── WS ─────▶│  ─ 有状态连接                            │
│  Android  │──── WS ─────▶│  ─ 设备配对 / 在线状态 / 双向通信        │
├───────────┤              │                                          │
│  SDK/API  │── HTTP ─────▶│  路径 B: HTTP REST API（OpenAI 兼容）     │
│  curl     │── HTTP ─────▶│  ─ 精简：chat/models/embeddings/responses │
│  任意HTTP │── HTTP ─────▶│  ─ 无状态请求                            │
│  客户端   │              │  ─ SSE 流式响应                           │
└───────────┘              └──────────────────────────────────────────┘
```

---

## 二、路径 A：WebSocket 控制面协议（完整版）

### 2.1 协议版本与帧格式

**源码位置**: `src/gateway/protocol/schema/frames.ts`, `src/gateway/protocol/schema/protocol-schemas.ts`

当前协议版本：**PROTOCOL_VERSION = 3**

所有通信基于 JSON 文本帧，有三种帧类型：

```typescript
// 请求帧 (客户端 → Gateway)
{
  "type": "req",
  "id": "unique-request-id",       // 客户端生成的唯一 ID，用于匹配响应
  "method": "chat.send",           // RPC 方法名
  "params": { ... }                // 方法参数
}

// 响应帧 (Gateway → 客户端)
{
  "type": "res",
  "id": "unique-request-id",       // 对应请求的 ID
  "ok": true,                      // 是否成功
  "payload": { ... },              // 成功时的返回数据
  "error": {                       // 失败时的错误信息
    "code": "INVALID_REQUEST",
    "message": "...",
    "details": { ... },
    "retryable": false,
    "retryAfterMs": 5000
  }
}

// 事件帧 (Gateway → 客户端, 服务端主动推送)
{
  "type": "event",
  "event": "chat",                 // 事件类型名
  "payload": { ... },              // 事件数据
  "seq": 42,                       // 事件序列号（用于检测丢失）
  "stateVersion": {                // 状态版本（用于增量同步）
    "presence": 7,
    "health": 3
  }
}
```

### 2.2 连接握手流程（核心）

**源码位置**: `src/gateway/server/ws-connection/message-handler.ts:295-400`

```
客户端                                          Gateway
  │                                               │
  │  1. 建立 WebSocket 连接                        │
  │  ──────── ws://127.0.0.1:18789 ──────────────▶│
  │                                               │
  │  2. Gateway 发送 Challenge (可选)              │
  │  ◀─── { type:"event", event:"connect.challenge", │
  │         payload: { nonce:"..." } } ────────────│
  │                                               │
  │  3. 客户端发送 Connect 请求                     │
  │  ──── { type:"req", id:"1",                    │
  │         method:"connect",                      │
  │         params: ConnectParams } ──────────────▶│
  │                                               │
  │       [Gateway 执行认证校验]                    │
  │       [角色/权限/Origin 检查]                   │
  │                                               │
  │  4. Gateway 返回 HelloOk                       │
  │  ◀─── { type:"res", id:"1", ok:true,          │
  │         payload: HelloOk } ────────────────────│
  │                                               │
  │  === 连接建立完成，可以收发 RPC ===             │
  │                                               │
  │  5. 客户端发送 RPC 请求                         │
  │  ──── { type:"req", id:"2",                    │
  │         method:"chat.send",                    │
  │         params:{...} } ───────────────────────▶│
  │                                               │
  │  6. Gateway 推送事件 + 返回响应                 │
  │  ◀─── { type:"event", event:"chat",           │
  │         payload:{state:"delta",...} } ─────────│
  │  ◀─── { type:"event", event:"chat",           │
  │         payload:{state:"final",...} } ─────────│
  │  ◀─── { type:"res", id:"2", ok:true } ────────│
```

### 2.3 ConnectParams — 连接参数完整规范

**源码位置**: `src/gateway/protocol/schema/frames.ts:20-70`

```typescript
// 客户端握手时必须发送的参数
interface ConnectParams {
  // === 协议版本协商（必填） ===
  minProtocol: number;     // 客户端支持的最低协议版本（当前填 3）
  maxProtocol: number;     // 客户端支持的最高协议版本（当前填 3）

  // === 客户端身份标识（必填） ===
  client: {
    id: GatewayClientId;         // 客户端 ID（枚举值，见 2.4 节）
    version: string;             // 客户端版本号，如 "1.0.0"
    platform: string;            // 平台标识，如 "darwin" / "linux" / "ios" / "android"
    mode: GatewayClientMode;     // 客户端模式（枚举值，见 2.4 节）
    displayName?: string;        // 可选显示名，如 "John's MacBook"
    deviceFamily?: string;       // 可选设备系列，如 "iPhone15,2"
    modelIdentifier?: string;    // 可选设备型号
    instanceId?: string;         // 可选实例 ID（多实例区分）
  };

  // === 能力声明（可选） ===
  caps?: string[];               // 能力列表，如 ["tool-events"]
  commands?: string[];           // 支持的命令列表（node 角色用）
  permissions?: Record<string, boolean>;  // 权限声明
  pathEnv?: string;              // PATH 环境变量（node 角色用）

  // === 角色与权限（可选，有默认值） ===
  role?: "operator" | "node";    // 角色，默认 "operator"
  scopes?: string[];             // 权限范围列表

  // === 设备身份（可选，用于设备配对） ===
  device?: {
    id: string;                  // 设备唯一 ID
    publicKey: string;           // 设备公钥（Base64URL）
    signature: string;           // 签名
    signedAt: number;            // 签名时间戳
    nonce: string;               // 对应 challenge 中的 nonce
  };

  // === 认证凭据（可选，至少提供一种） ===
  auth?: {
    token?: string;              // Bearer Token
    bootstrapToken?: string;     // 初始配对引导 Token
    deviceToken?: string;        // 设备配对 Token
    password?: string;           // 密码
  };

  // === 其他（可选） ===
  locale?: string;               // 客户端 locale，如 "zh-CN"
  userAgent?: string;            // 用户代理字符串
}
```

### 2.4 客户端 ID 与 Mode 枚举值

**源码位置**: `src/gateway/protocol/client-info.ts:1-31`

**GatewayClientId**（必须使用以下值之一，否则握手被拒绝）：

| 枚举值 | 用途 | 典型 role | 典型 mode |
|--------|------|-----------|-----------|
| `"cli"` | 命令行工具 | operator | cli |
| `"openclaw-control-ui"` | 浏览器 Web 控制台 | operator | ui |
| `"openclaw-tui"` | 终端 UI | operator | ui |
| `"webchat-ui"` | Webchat 嵌入式 UI | operator | webchat |
| `"webchat"` | Webchat 通用 | operator | webchat |
| `"gateway-client"` | SDK/API 集成 | operator | backend |
| `"openclaw-macos"` | macOS 桌面 App | node | node |
| `"openclaw-ios"` | iOS App | node | node |
| `"openclaw-android"` | Android App | node | node |
| `"node-host"` | 通用节点主机 | node | node |
| `"openclaw-probe"` | 健康探针 | operator | probe |
| `"test"` | 测试专用 | - | test |
| `"fingerprint"` | 指纹标识 | - | - |

**GatewayClientMode**（必须使用以下值之一）：

| 枚举值 | 说明 |
|--------|------|
| `"cli"` | 命令行模式 — 不跟踪在线状态 |
| `"ui"` | 控制台 UI 模式 |
| `"webchat"` | Webchat 模式 — 不继承外部投递路由 |
| `"backend"` | 后端 SDK 集成模式 |
| `"node"` | 设备节点模式 — 触发设备配对流程 |
| `"probe"` | 探针模式 |
| `"test"` | 测试模式 |

### 2.5 HelloOk — 连接成功响应

**源码位置**: `src/gateway/protocol/schema/frames.ts:72-126`

```typescript
interface HelloOk {
  type: "hello-ok";
  protocol: number;              // 协商后的协议版本

  server: {
    version: string;             // Gateway 版本号
    connId: string;              // 此连接的唯一 ID
  };

  features: {
    methods: string[];           // Gateway 支持的所有 RPC 方法列表
    events: string[];            // Gateway 支持的所有事件类型列表
  };

  snapshot: {                    // 当前状态快照
    presence: PresenceEntry[];   // 在线客户端列表
    health: any;                 // 健康状态
    stateVersion: { presence: number; health: number };
    uptimeMs: number;            // Gateway 运行时间
    configPath?: string;
    stateDir?: string;
    sessionDefaults?: {          // 默认会话配置
      defaultAgentId: string;
      mainKey: string;
      mainSessionKey: string;
    };
    authMode?: "none" | "token" | "password" | "trusted-proxy";
  };

  canvasHostUrl?: string;        // Canvas 主机 URL（如果可用）

  auth?: {                       // 设备配对成功时返回的 token
    deviceToken: string;
    role: string;
    scopes: string[];
    issuedAtMs?: number;
  };

  policy: {
    maxPayload: number;          // 最大消息大小（字节）
    maxBufferedBytes: number;    // 最大缓冲区大小
    tickIntervalMs: number;      // 心跳间隔（毫秒）
  };
}
```

### 2.6 核心 RPC 方法接口规范

**源码位置**: `src/gateway/server-methods-list.ts`, `src/gateway/protocol/schema/`

#### 2.6.1 chat.send — 发送消息给 Agent

```typescript
// 请求
{
  type: "req",
  id: "uuid",
  method: "chat.send",
  params: {
    sessionKey: string;           // 必填 — 目标会话，如 "main"
    message: string;              // 必填 — 消息文本
    idempotencyKey: string;       // 必填 — 幂等键（防重复提交）
    thinking?: string;            // 可选 — 思考模式，如 "low" / "high"
    deliver?: boolean;            // 可选 — 是否投递到外部渠道
    attachments?: unknown[];      // 可选 — 附件（图片等）
    timeoutMs?: number;           // 可选 — 超时时间
    originatingChannel?: string;  // 可选 — 来源渠道
  }
}

// 响应（异步事件推送）
// Gateway 通过 event 帧实时流式推送结果：
{ type: "event", event: "chat", payload: {
  runId: "uuid",
  sessionKey: "main",
  seq: 0,
  state: "delta",                // "delta" | "final" | "aborted" | "error"
  message: { role: "assistant", content: "Hello..." }
}}

// 最终 RPC 响应
{ type: "res", id: "uuid", ok: true, payload: { runId: "..." } }
```

#### 2.6.2 chat.history — 获取聊天历史

```typescript
// 请求
{ method: "chat.history", params: {
  sessionKey: string;           // 必填
  limit?: number;               // 可选，1-1000
  maxChars?: number;            // 可选，1-500000
}}

// 响应
{ ok: true, payload: { messages: [...] } }
```

#### 2.6.3 chat.abort — 中止正在执行的 Agent

```typescript
{ method: "chat.abort", params: {
  sessionKey: string;           // 必填
  runId?: string;               // 可选 — 指定中止哪个 run
}}
```

#### 2.6.4 sessions.list — 列出会话

```typescript
{ method: "sessions.list", params: {
  agentId?: string;             // 可选 — 筛选特定 Agent
  limit?: number;
  cursor?: string;
}}
```

#### 2.6.5 agents.list — 列出 Agent

```typescript
{ method: "agents.list", params: {} }
// 响应 payload 包含 Agent 列表，每个 Agent 包含 id, name, model 等
```

#### 2.6.6 config.get — 获取配置

```typescript
{ method: "config.get", params: {
  key?: string;                 // 可选 — 获取特定配置项
}}
```

#### 2.6.7 health — 健康检查

```typescript
{ method: "health", params: {} }
// 响应包含完整的 Gateway 状态快照
```

### 2.7 Gateway 推送事件列表

**源码位置**: `src/gateway/server-methods-list.ts:128-149`

| 事件名 | 说明 | 典型用途 |
|--------|------|---------|
| `connect.challenge` | 握手挑战 | 设备认证 |
| `chat` | 聊天消息流 | **核心** — Agent 响应流式推送 |
| `session.message` | 会话消息更新 | UI 更新 |
| `session.tool` | 工具调用事件 | 工具状态展示 |
| `sessions.changed` | 会话列表变化 | 会话列表刷新 |
| `presence` | 在线状态变化 | 连接设备列表 |
| `tick` | 心跳 | 连接保活 |
| `health` | 健康状态变化 | 状态面板 |
| `shutdown` | Gateway 关闭 | 重连提示 |
| `talk.mode` | 语音模式变化 | 语音对话 |
| `node.pair.requested` | 设备配对请求 | 配对审批 |
| `node.pair.resolved` | 设备配对结果 | 配对结果 |
| `node.invoke.request` | 节点调用请求 | 远程操作 |
| `exec.approval.requested` | 执行审批请求 | 安全审批 |
| `exec.approval.resolved` | 执行审批结果 | 审批结果 |
| `cron` | 定时任务事件 | 定时任务状态 |
| `voicewake.changed` | 语音唤醒变化 | 语音功能 |

### 2.8 角色与权限系统

**源码位置**: `src/gateway/operator-scopes.ts`, `src/gateway/role-policy.ts`, `src/gateway/method-scopes.ts`

**角色模型**：

```
operator（操作者）
  │
  ├── operator.admin        — 完全管理权限（可访问所有方法）
  ├── operator.read         — 只读（health, status, models.list, sessions.list, ...）
  ├── operator.write        — 读写（chat.send, agent, send, sessions.send, ...）
  ├── operator.approvals    — 执行审批（exec.approval.*, plugin.approval.*）
  ├── operator.pairing      — 设备配对（device.pair.*, node.pair.*）
  └── operator.talk.secrets — 语音密钥

node（设备节点）
  │
  └── 只能调用 node.* 开头的方法：
      node.invoke.result, node.event, node.pending.drain,
      node.canvas.capability.refresh, node.pending.pull,
      node.pending.ack, skills.bins
```

**权限检查链路**（`server-methods.ts:39-66`）：

```
收到 RPC 请求
  │
  ├── 1. 角色检查：role === "node" 只能调 node.* 方法
  │                role === "operator" 不能调 node.* 方法
  │
  ├── 2. Admin 快速通过：scopes 包含 "operator.admin" → 跳过细粒度检查
  │
  └── 3. Scope 检查：method 属于哪个 scope 组？客户端是否声明了该 scope？
```

---

## 三、路径 B：HTTP REST API（OpenAI 兼容）

### 3.1 可用端点

**源码位置**: `src/gateway/server-runtime-state.ts`, `src/gateway/models-http.ts`, `src/gateway/embeddings-http.ts`, `src/gateway/openresponses-http.ts`

| 端点 | 方法 | 默认状态 | 配置项 |
|------|------|---------|--------|
| `POST /v1/chat/completions` | POST | **关闭** | `gateway.http.endpoints.chatCompletions.enabled: true` |
| `GET /v1/models` | GET | 跟随 chat | 同上 |
| `GET /v1/models/:id` | GET | 跟随 chat | 同上 |
| `POST /v1/embeddings` | POST | 自动 | 无需配置 |
| `POST /v1/responses` | POST | **关闭** | `gateway.http.endpoints.responses.enabled: true` |
| `GET /health` | GET | 始终开启 | 无 |

### 3.2 认证方式

```
Authorization: Bearer <token>
```

或通过 Header 声明 scope：
```
x-openclaw-scopes: operator.write
```

### 3.3 Chat Completions 接口

**请求**：
```json
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer <token>
x-openclaw-scopes: operator.write

{
  "model": "openclaw",
  "messages": [
    {"role": "user", "content": "Hello, who are you?"}
  ],
  "stream": true
}
```

**响应（SSE 流）**：

源码中设置 SSE 头（`http-common.ts:102-108`）：
```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
```

```
data: {"id":"...","choices":[{"delta":{"role":"assistant","content":"I"}}]}

data: {"id":"...","choices":[{"delta":{"content":" am"}}]}

data: {"id":"...","choices":[{"delta":{"content":" an AI"}}]}

data: [DONE]
```

### 3.4 HTTP 安全头

**源码位置**: `src/gateway/http-common.ts:11-22`

所有 HTTP 响应自动附加：
```
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 四、各客户端的接入差异对比

基于源码中 `isWebchatClient()` / `isGatewayCliClient()` / `isOperatorUiClient()` 等函数的调用点，梳理各客户端在 Gateway 中的行为差异：

### 4.1 行为差异矩阵

| 行为维度 | CLI | Control UI | Webchat | macOS/iOS/Android | SDK/Backend |
|---------|-----|-----------|---------|-------------------|-------------|
| **接入协议** | WS | WS | WS | WS | WS 或 HTTP |
| **client.id** | `cli` | `openclaw-control-ui` | `webchat-ui` | `openclaw-{platform}` | `gateway-client` |
| **client.mode** | `cli` | `ui` | `webchat` | `node` | `backend` |
| **role** | `operator` | `operator` | `operator` | `node` | `operator` |
| **在线状态追踪** | **否** | 是 | 是 | 是 | 是 |
| **Origin 检查** | 否 | **是** | **是** | 否 | 否 |
| **外部投递继承** | 是 | 是 | **否** | N/A | 是 |
| **设备配对流程** | 否 | 否 | 否 | **是** | 否 |
| **APNs 推送** | 否 | 否 | 否 | **仅 iOS** | 否 |
| **前台命令排队** | N/A | N/A | N/A | **仅 iOS** | N/A |
| **可调用方法** | 全部 operator | 全部 operator | 全部 operator | 仅 node.* | 全部 operator |
| **默认 scopes** | admin+全部 | 取决于认证 | 取决于认证 | 配对授予 | 最小权限 |

### 4.2 关键行为差异的源码位置

**CLI 不跟踪在线状态**（`message-handler.ts:1128`）：
```typescript
const shouldTrackPresence = !isGatewayCliClient(connectParams.client);
```

**Webchat 不继承外部投递路由**（`server-methods/chat.ts:250-254`）：
```typescript
// Webchat clients never inherit external delivery routes
const canInheritDeliverableRoute = Boolean(
  !isFromWebchatClient && ...
);
```

**Browser 客户端强制 Origin 检查**（`message-handler.ts:445`）：
```typescript
if (enforceOriginCheckForAnyClient || isBrowserOperatorUi || isWebchat) {
  const originCheck = checkBrowserOrigin({...});
}
```

**Node 角色触发设备配对**（`message-handler.ts:1111-1126`）：
```typescript
if (role === "node") {
  const reconciliation = await reconcileNodePairingOnConnect({
    cfg: loadConfig(),
    connectParams,
    pairedNode: await getPairedNode(...),
    ...
  });
}
```

---

## 五、二次开发新客户端：完整接入指南

### 5.1 方案选择决策树

```
你的客户端需要什么？
  │
  ├── 只需要发消息 + 收回复？
  │     └── 选方案 1：HTTP API（零改动）
  │
  ├── 需要实时事件 + 会话管理 + 配置管理？
  │     └── 选方案 2：WebSocket operator 客户端（改 1 行）
  │
  └── 需要远程命令执行 + 截屏 + 设备管理？
        └── 选方案 3：WebSocket node 客户端（改 1 行 + 实现命令）
```

### 5.2 方案 1：HTTP API 接入（零改动）

**适用场景**：聊天机器人、API 集成、自动化脚本

**步骤**：

1. 确保 Gateway 配置开启 HTTP 端点：
```yaml
gateway:
  http:
    endpoints:
      chatCompletions:
        enabled: true
```

2. 直接调用：
```bash
curl -X POST http://127.0.0.1:18789/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-openclaw-scopes: operator.write" \
  -d '{
    "model": "openclaw",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

**无需修改任何源码**。

### 5.3 方案 2：WebSocket Operator 客户端（推荐）

**适用场景**：自定义 UI、桌面客户端、Electron 应用

#### 步骤 1：注册客户端 ID（唯一的源码改动）

**文件**: `src/gateway/protocol/client-info.ts`

```typescript
export const GATEWAY_CLIENT_IDS = {
  // ... 现有的
  MY_CLIENT: "my-custom-client",  // ← 添加你的客户端 ID
} as const;
```

如果现有的 7 种 mode 不满足需求，在同一文件添加：
```typescript
export const GATEWAY_CLIENT_MODES = {
  // ... 现有的
  MY_MODE: "my-mode",  // ← 可选：添加自定义 mode
} as const;
```

#### 步骤 2：实现 WebSocket 连接

```javascript
// 伪代码 — 任何语言的 WebSocket 客户端均可
const ws = new WebSocket("ws://127.0.0.1:18789");

ws.onopen = () => {
  // 发送 connect 握手
  ws.send(JSON.stringify({
    type: "req",
    id: "connect-1",
    method: "connect",
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "my-custom-client",    // 与步骤 1 中注册的一致
        version: "1.0.0",
        platform: "web",           // 或 "darwin" / "linux" / "windows"
        mode: "ui",                // 选择合适的 mode
      },
      role: "operator",
      scopes: [
        "operator.admin",          // 或按需选择更细粒度的 scopes
        "operator.read",
        "operator.write",
      ],
      auth: {
        token: "YOUR_GATEWAY_TOKEN",  // Gateway 配置中的 token
      },
    },
  }));
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "res" && frame.ok) {
    // HelloOk — 连接成功
    console.log("Connected!", frame.payload.features.methods);
  }

  if (frame.type === "event" && frame.event === "chat") {
    // Agent 响应流
    const chatEvent = frame.payload;
    if (chatEvent.state === "delta") {
      process.stdout.write(chatEvent.message?.content ?? "");
    }
    if (chatEvent.state === "final") {
      console.log("\n--- Done ---");
    }
  }

  if (frame.type === "event" && frame.event === "tick") {
    // 心跳，不需要回复
  }
};
```

#### 步骤 3：发送消息

```javascript
function sendMessage(sessionKey, text) {
  ws.send(JSON.stringify({
    type: "req",
    id: crypto.randomUUID(),
    method: "chat.send",
    params: {
      sessionKey: sessionKey,           // "main" 或具体的 session key
      message: text,
      idempotencyKey: crypto.randomUUID(),
    },
  }));
}
```

#### 步骤 4：处理 Gateway 推送事件

```javascript
// 必须处理的核心事件
const EVENT_HANDLERS = {
  // Agent 响应流 — 最重要
  "chat": (payload) => {
    // payload: { runId, sessionKey, seq, state, message, usage }
    // state: "delta" → 增量文本
    // state: "final" → 完成
    // state: "error" → 出错
    // state: "aborted" → 被中止
  },

  // 心跳 — 用于检测连接健康
  "tick": (payload) => {
    // payload: { ts: timestamp }
    // 更新 lastTick，用于检测连接断开
  },

  // 关闭通知 — 需要重连
  "shutdown": (payload) => {
    // payload: { reason, restartExpectedMs }
    // 按 restartExpectedMs 延时后重连
  },

  // 在线状态变化 — 可选
  "presence": (payload) => { /* 更新在线设备列表 */ },

  // 会话变化 — 可选
  "sessions.changed": (payload) => { /* 刷新会话列表 */ },
};
```

### 5.4 方案 3：WebSocket Node 客户端

**适用场景**：嵌入式设备、自定义移动端、IoT

与方案 2 类似，但：
- `role` 设为 `"node"`
- `mode` 设为 `"node"`
- 需要实现 `node.invoke.request` 事件的响应
- 需要声明支持的 `commands` 和 `caps`

```javascript
params: {
  client: {
    id: "my-custom-client",
    mode: "node",
    platform: "linux",
    ...
  },
  role: "node",
  caps: ["tool-events"],
  commands: ["system.notify", "canvas.snapshot"],  // 你的设备支持的命令
}
```

处理远程调用：
```javascript
if (frame.type === "event" && frame.event === "node.invoke.request") {
  const { requestId, command, params } = frame.payload;
  // 执行命令...
  ws.send(JSON.stringify({
    type: "req",
    id: crypto.randomUUID(),
    method: "node.invoke.result",
    params: {
      requestId,
      ok: true,
      payload: { /* 执行结果 */ },
    },
  }));
}
```

---

## 六、核心技术细节 Checklist

### 6.1 安全相关

| 项目 | 说明 | 源码位置 |
|------|------|---------|
| **明文连接限制** | 非 loopback 的 `ws://` 被拒绝，必须用 `wss://` | `client.ts:206-230` |
| **TLS 指纹绑定** | WSS 连接支持证书 SHA-256 Pin | `client.ts:235-250` |
| **Origin 检查** | Browser 类客户端必须通过 Origin 检查 | `message-handler.ts:445-471` |
| **速率限制** | 认证失败有速率限制保护 | `auth-rate-limit.ts` |
| **最大 Payload** | 预认证阶段有 payload 大小限制 | `message-handler.ts:301-308` |
| **未授权洪水保护** | 反复发送未授权请求会被断开 | `message-handler.ts:1367-1372` |

### 6.2 连接健康维护

| 项目 | 说明 | 源码位置 |
|------|------|---------|
| **tick 心跳** | Gateway 定期发送 `tick` 事件 | `HelloOk.policy.tickIntervalMs` |
| **序列号检测** | `event.seq` 递增，检测是否丢包 | `client.ts:168` |
| **watchdog** | 客户端应检测 tick 间隔，超时则重连 | `client.ts:176-178` |
| **graceful shutdown** | 收到 `shutdown` 事件后按提示延时重连 | `server-methods-list.ts:138` |

### 6.3 会话管理

| 项目 | 说明 |
|------|------|
| **sessionKey 格式** | 简写 `"main"` 或完整 `"agent:<agentId>:main"` |
| **多 Agent** | 通过 `agents.list` 列出，通过 sessionKey 中的 agentId 区分 |
| **会话创建** | `sessions.create` 或直接 `chat.send` 到新 sessionKey |
| **幂等键** | `chat.send` 的 `idempotencyKey` 必填，防止重复提交 |

### 6.4 错误处理

**错误码定义**（`src/gateway/protocol/schema/error-codes.ts`）：

| 错误码 | 说明 | 处理建议 |
|--------|------|---------|
| `INVALID_REQUEST` | 请求参数无效 | 修正参数后重试 |
| `UNAVAILABLE` | 服务暂时不可用 | 延时后重试 |
| `NOT_FOUND` | 资源不存在 | 检查 sessionKey / agentId |
| `RATE_LIMITED` | 被限流 | 按 `retryAfterMs` 等待 |
| `SESSION_BUSY` | 会话忙（Agent 正在执行） | 等待或调用 `chat.abort` |

---

## 七、完整的 RPC 方法参考索引

按功能域分组的全部 120+ 个方法（`server-methods-list.ts`）：

### 聊天核心
| 方法 | Scope | 说明 |
|------|-------|------|
| `chat.send` | write | 发送消息给 Agent |
| `chat.history` | read | 获取聊天历史 |
| `chat.abort` | write | 中止 Agent 执行 |
| `chat.inject` | write | 注入系统消息 |

### Agent 管理
| 方法 | Scope | 说明 |
|------|-------|------|
| `agent` | write | 直接执行 Agent 命令 |
| `agent.wait` | write | 等待 Agent 完成 |
| `agent.identity.get` | read | 获取 Agent 身份 |
| `send` | write | 发送消息（通用） |
| `wake` | write | 唤醒 Agent |

### 多 Agent
| 方法 | Scope | 说明 |
|------|-------|------|
| `agents.list` | read | 列出所有 Agent |
| `agents.create` | write | 创建 Agent |
| `agents.update` | write | 更新 Agent |
| `agents.delete` | write | 删除 Agent |
| `agents.files.list/get/set` | read/write | Agent 文件管理 |

### 会话管理
| 方法 | Scope | 说明 |
|------|-------|------|
| `sessions.list` | read | 列出会话 |
| `sessions.preview` | read | 会话预览 |
| `sessions.create` | write | 创建会话 |
| `sessions.send` | write | 向会话发送消息 |
| `sessions.abort` | write | 中止会话 |
| `sessions.patch` | write | 修改会话属性 |
| `sessions.reset` | write | 重置会话 |
| `sessions.delete` | write | 删除会话 |
| `sessions.compact` | write | 压缩会话 |
| `sessions.subscribe/unsubscribe` | read | 订阅会话变化 |
| `sessions.messages.subscribe/unsubscribe` | read | 订阅会话消息 |

### 配置
| 方法 | Scope | 说明 |
|------|-------|------|
| `config.get` | read | 获取配置 |
| `config.set` | admin | 设置单项配置 |
| `config.apply` | admin | 应用完整配置 |
| `config.patch` | admin | 增量修改配置 |
| `config.schema` | read | 获取配置 schema |

### 模型与工具
| 方法 | Scope | 说明 |
|------|-------|------|
| `models.list` | read | 列出可用模型 |
| `tools.catalog` | read | 工具目录 |
| `tools.effective` | read | 生效的工具列表 |

### 定时任务
| 方法 | Scope | 说明 |
|------|-------|------|
| `cron.list` | read | 列出 Cron 任务 |
| `cron.add` | write | 添加任务 |
| `cron.update` | write | 更新任务 |
| `cron.remove` | write | 删除任务 |
| `cron.run` | write | 手动触发 |
| `cron.runs` | read | 运行历史 |

### 设备管理
| 方法 | Scope | 说明 |
|------|-------|------|
| `device.pair.list` | pairing | 列出配对设备 |
| `device.pair.approve/reject/remove` | pairing | 配对审批 |
| `device.token.rotate/revoke` | pairing | Token 管理 |
| `node.list` | read | 列出在线节点 |
| `node.invoke` | write | 远程调用节点 |
| `node.describe` | read | 节点详情 |

### 其他
| 方法 | Scope | 说明 |
|------|-------|------|
| `health` | read | 健康检查 |
| `skills.status/search/install/update` | read/write | 技能管理 |
| `talk.config/speak/mode` | write/secrets | 语音对话 |
| `tts.status/enable/disable/convert` | write | 文本转语音 |
| `channels.status/logout` | read/write | 渠道状态 |
| `wizard.start/next/cancel/status` | write | 引导向导 |
| `update.run` | admin | 执行更新 |
| `exec.approval.*` | approvals | 执行审批 |

---

## 八、参考实现：现有客户端源码位置

| 客户端 | 语言 | 源码位置 | 可参考点 |
|--------|------|---------|---------|
| CLI | TypeScript | `src/gateway/call.ts` + `src/gateway/client.ts` | 完整的 WS 客户端实现 |
| Control UI | TypeScript (Lit) | `ui/` 目录 | Web 端 WS 连接和事件处理 |
| macOS App | Swift | `apps/macos/` | 原生 WS 客户端 + 设备配对 |
| iOS App | Swift | `apps/ios/` | 移动端 node 角色 + APNs |
| Android App | Kotlin | `apps/android/` | 移动端 node 角色 |

`src/gateway/client.ts` 中的 `GatewayClient` 类是最完整的参考实现，涵盖了：
- WebSocket 连接管理（`start()` 方法, 行 196）
- Challenge 响应（设备签名）
- 自动重连与退避
- 请求/响应匹配（`request()` 方法）
- tick watchdog（连接健康检测）
- TLS 指纹校验
