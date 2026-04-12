# Phase 1：客户端通信层深度分析报告

## 1. 概述

OpenClaw 采用**中心化 Gateway + 多客户端**架构。所有客户端（CLI、Web UI、macOS、iOS、Android）通过统一的 **WebSocket JSON-RPC** 协议与 Gateway 通信。Gateway 监听端口 **18789**（默认），协议版本当前为 **v3**。

### 1.1 客户端清单

| 客户端 | Client ID | Mode | 语言 | WebSocket 库 |
|--------|-----------|------|------|-------------|
| CLI | `cli` | `cli` | TypeScript (Node.js) | `ws` (npm) |
| Web UI (Control UI) | `openclaw-control-ui` | `webchat` | TypeScript (Browser) | 原生 `WebSocket` API |
| macOS App | `openclaw-macos` | `node` | Swift | `OpenClawKit` (Network.framework) |
| iOS App | `openclaw-ios` | `node` | Swift | `OpenClawKit` (URLSessionWebSocketTask) |
| Android App | `openclaw-android` | `node` | Kotlin | OkHttp WebSocket |

---

## 2. 统一协议层分析

### 2.1 帧格式（Frame Schema）

所有客户端使用**相同的三种帧类型**，通过 `type` 字段区分（discriminated union）：

```typescript
// 请求帧 — 客户端 → Gateway
RequestFrame = { type: "req", id: string, method: string, params?: unknown }

// 响应帧 — Gateway → 客户端
ResponseFrame = { type: "res", id: string, ok: boolean, payload?: unknown, error?: ErrorShape }

// 事件帧 — Gateway → 客户端（单向推送）
EventFrame = { type: "event", event: string, payload?: unknown, seq?: number, stateVersion?: {...} }
```

**ErrorShape** 定义：
```typescript
ErrorShape = { code: string, message: string, details?: unknown, retryable?: boolean, retryAfterMs?: number }
```

### 2.2 连接握手流程（统一）

所有客户端遵循相同的连接握手流程：

```
Client                          Gateway
  |                               |
  |--- WebSocket 建立 TCP 连接 --->|
  |                               |
  |<-- event: connect.challenge --|  (包含 nonce)
  |                               |
  |--- req: connect (ConnectParams) -->|
  |                               |
  |<-- res: hello-ok (HelloOk) ---|
  |                               |
  |<== 正常 RPC + 事件通信 ========>|
```

**关键步骤**：
1. **TCP/TLS 连接**：客户端建立 WebSocket 连接
2. **Challenge-Response**：Gateway 发送 `connect.challenge` 事件，包含 `nonce`
3. **Connect 请求**：客户端发送 `connect` RPC，携带认证信息和设备签名
4. **Hello-OK 响应**：Gateway 返回协议版本、服务器信息、快照、设备令牌

### 2.3 ConnectParams 结构（统一 Schema）

```typescript
ConnectParams = {
  minProtocol: number,          // 最低支持协议版本（当前 = 3）
  maxProtocol: number,          // 最高支持协议版本（当前 = 3）
  client: {
    id: GatewayClientId,        // 客户端 ID（如 "cli", "openclaw-ios"）
    displayName?: string,       // 显示名
    version: string,            // 版本号
    platform: string,           // 平台标识（"darwin", "android", "web" 等）
    deviceFamily?: string,      // 设备型号
    modelIdentifier?: string,   // 机型标识
    mode: GatewayClientMode,    // 运行模式（"cli", "node", "webchat" 等）
    instanceId?: string,        // 实例 ID（唯一标识单个连接）
  },
  caps: string[],               // 客户端能力（如 "tool-events"）
  commands?: string[],          // 支持的命令列表
  permissions?: Record<string, boolean>,
  pathEnv?: string,
  role: string,                 // 角色（"operator" 或 "node"）
  scopes: string[],             // 权限范围
  auth?: {
    token?: string,             // 共享令牌
    bootstrapToken?: string,    // 引导令牌
    deviceToken?: string,       // 设备令牌
    password?: string,          // 密码认证
  },
  device?: {                    // 设备身份签名
    id: string,
    publicKey: string,
    signature: string,
    signedAt: number,
    nonce: string,
  },
  locale?: string,
  userAgent?: string,
}
```

### 2.4 HelloOk 响应结构

```typescript
HelloOk = {
  type: "hello-ok",
  protocol: number,
  server: { version: string, connId: string },
  features: { methods: string[], events: string[] },
  snapshot: { presence: [...], health: {...}, sessionDefaults: {...} },
  auth?: {
    deviceToken: string,        // Gateway 颁发的设备令牌
    role: string,
    scopes: string[],
    issuedAtMs?: number,
    deviceTokens?: [...]        // 多角色令牌
  },
  policy: {
    maxPayload: number,
    maxBufferedBytes: number,
    tickIntervalMs: number,     // 心跳间隔
  },
}
```

### 2.5 设备认证签名（DeviceAuth v3）

所有原生客户端使用相同的设备签名算法：

```
payload = "v3|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}|{platform}|{deviceFamily}"
signature = ECDSA-SHA256(privateKey, payload)  // 或 Ed25519
```

签名流程：
1. 客户端本地生成/加载密钥对（ECDSA P-256）
2. 构建 v3 payload 字符串（pipe 分隔）
3. 使用私钥签名
4. 将 publicKey（base64url）+ signature + signedAt + nonce 发给 Gateway
5. Gateway 验证签名，颁发 deviceToken

---

## 3. 各客户端实现对比

### 3.1 相同点

| 特性 | 所有客户端一致 |
|------|-------------|
| **协议版本** | PROTOCOL_VERSION = 3 |
| **帧格式** | JSON `{ type: "req"/"res"/"event" }` |
| **握手流程** | `connect.challenge` → `connect` → `hello-ok` |
| **认证体系** | token / password / bootstrapToken / deviceToken |
| **设备签名** | DeviceAuth v3（ECDSA 签名 payload） |
| **RPC 模式** | request/response（UUID 关联） |
| **事件推送** | 通过 `event` 帧单向推送 |
| **序列号检测** | `seq` 字段检测事件丢失/gap |
| **重连逻辑** | 指数退避重连 |
| **认证失败暂停** | 特定 auth error code 停止重连 |
| **设备令牌持久化** | 连接成功后保存 deviceToken |
| **设备令牌重试** | AUTH_TOKEN_MISMATCH 时一次性重试 stored deviceToken |

### 3.2 差异点

#### 3.2.1 连接层实现

| 特性 | CLI (Node.js) | Web UI (Browser) | iOS (Swift) | Android (Kotlin) |
|------|-------------|-----------------|------------|-----------------|
| **WebSocket 库** | `ws` npm 包 | 原生 `WebSocket` API | OpenClawKit (Network.framework) | OkHttp WebSocket |
| **TLS 验证** | 自定义 fingerprint 校验 (checkServerIdentity) | 浏览器内建 | URLSession/NWConnection | OkHttp SSLSocketFactory |
| **TLS 指纹锁定** | ✅ 支持 (`tlsFingerprint`) | ❌ 不支持（依赖浏览器） | ✅ 支持 (TCPProbe) | ✅ 支持 (GatewayTls) |
| **最大载荷** | 25MB (`maxPayload`) | 浏览器默认 | 框架默认 | OkHttp 默认 |
| **Ping/Keepalive** | tick watchdog（tickIntervalMs × 2 超时断连） | 无 tick watchdog | 框架级 keepalive | OkHttp pingInterval(30s) |
| **安全检查** | 阻止非 loopback 的 ws:// 明文 | 无（依赖浏览器 origin） | 私有 LAN ws:// 允许 | 私有 LAN ws:// 允许 |

#### 3.2.2 服务发现

| 特性 | CLI | Web UI | iOS | Android |
|------|-----|--------|-----|---------|
| **发现方式** | 无（手动配置 URL） | 无（页面 URL 推导） | Bonjour (NWBrowser, Network.framework) | NSD (NsdManager) + dnsjava 单播 |
| **服务类型** | — | — | `_openclaw-gw._tcp` | `_openclaw-gw._tcp.` |
| **广域发现** | — | — | 多域名浏览 (`OpenClawBonjour.gatewayServiceDomains`) | 环境变量 `OPENCLAW_WIDE_AREA_DOMAIN` |
| **TXT 记录解析** | — | — | ✅ (displayName, lanHost, tailnetDns, gatewayTls, gatewayTlsSha256) | ✅ 同上 |
| **自动连接** | ❌ | ❌ | ✅ (上次连接/首个发现) | ✅ (ConnectionManager) |

#### 3.2.3 认证存储

| 特性 | CLI (Node.js) | Web UI (Browser) | iOS (Swift) | Android (Kotlin) |
|------|-------------|-----------------|------------|-----------------|
| **密钥存储** | 文件系统 `~/.openclaw/` | IndexedDB (CryptoKey) | Keychain (Security.framework) | Android Keystore |
| **设备令牌存储** | 文件系统 JSON | IndexedDB | Keychain (`KeychainStore`) | EncryptedSharedPreferences (`SecurePrefs`) |
| **密钥格式** | PEM (ECDSA P-256) | CryptoKey (Web Crypto API) | SecKey (Security) | KeyPair (Keystore) |
| **签名算法** | Node.js crypto.sign | crypto.subtle.sign (ECDSA) | SecKeyCreateSignature | Android Keystore sign |

#### 3.2.4 退避与重连策略

| 特性 | CLI | Web UI | iOS | Android |
|------|-----|--------|-----|---------|
| **初始退避** | 1000ms | 800ms | OpenClawKit 内部 | 350ms |
| **最大退避** | 30,000ms | 15,000ms | 框架默认 | 8,000ms |
| **退避增长** | ×2 | ×1.7 | 框架默认 | ×1.7 幂次增长 |
| **Challenge 超时** | 可配置 (默认有限制) | 750ms 后自动发送 | 2000ms | — |
| **请求超时** | 30,000ms | 无（依赖 WebSocket 关闭） | 按方法 | 15,000ms 默认 |

#### 3.2.5 特有功能

| 客户端 | 特有功能 |
|--------|---------|
| **CLI** | `callGateway()` 一次性 RPC 调用（连接→请求→断开）；最小权限 scope 计算 |
| **Web UI** | 浏览器 secure context 检测；`crypto.subtle` 可用性降级；用户代理/locale 自动填充 |
| **iOS** | 实时活动（Live Activity）；推送通知转发（PushRelay）；屏幕截取；语音唤醒 |
| **Android** | 前台服务（NodeForegroundService）；通知监听转发；Node invoke 处理 |
| **macOS** | 菜单栏应用托管 Gateway；语音唤醒 (Swabble) |

---

## 4. 核心事件类型

所有客户端处理相同的事件集合：

| 事件 | 用途 |
|------|------|
| `connect.challenge` | 握手挑战（含 nonce） |
| `tick` | 心跳保活 |
| `shutdown` | Gateway 即将关闭/重启 |
| `agent` | Agent 推理事件流 |
| `chat` | 对话消息事件 |
| `presence` | 在线状态更新 |
| `sessions.changed` | 会话列表变更 |
| `cron` | 定时任务事件 |
| `device.pair.requested` | 设备配对请求 |
| `device.pair.resolved` | 设备配对结果 |
| `exec.approval.requested` | 执行审批请求 |
| `exec.approval.resolved` | 执行审批结果 |
| `node.invoke.request` | Node 命令调用请求（移动端处理） |
| `update.available` | 更新可用通知 |

---

## 5. 二次开发接入指南

### 5.1 接入新客户端的最低要求

要接入一个新客户端与 OpenClaw Gateway 通信，需要实现以下功能：

#### 步骤 1：WebSocket 连接

```
1. 建立 WebSocket 连接到 Gateway（默认 ws://127.0.0.1:18789）
2. 支持 ws:// (本地) 和 wss:// (远程/TLS)
3. 推荐设置 maxPayload >= 25MB
```

#### 步骤 2：实现握手协议

```
1. 监听 connect.challenge 事件，提取 nonce
2. 构造 ConnectParams，发送 connect 请求
3. 处理 hello-ok 响应，保存 deviceToken
```

**最简 ConnectParams 示例**：
```json
{
  "minProtocol": 3,
  "maxProtocol": 3,
  "client": {
    "id": "my-custom-client",
    "version": "1.0.0",
    "platform": "linux",
    "mode": "cli"
  },
  "role": "operator",
  "scopes": ["operator.read"],
  "auth": { "token": "your-gateway-token" },
  "caps": []
}
```

#### 步骤 3：实现 RPC 通信

```typescript
// 发送请求
send({ type: "req", id: uuid(), method: "agent.send", params: { text: "hello" } })

// 接收响应（通过 id 匹配）
receive({ type: "res", id: "same-uuid", ok: true, payload: {...} })

// 接收事件
receive({ type: "event", event: "agent", payload: {...}, seq: 42 })
```

#### 步骤 4：实现设备身份认证（推荐）

```
1. 生成 ECDSA P-256 密钥对
2. 持久化存储（文件/Keychain/Keystore）
3. 每次 connect 时构建 DeviceAuth v3 签名
4. 成功后保存 Gateway 颁发的 deviceToken
```

**DeviceAuth v3 签名构建**：
```
payload = "v3|{deviceId}|{clientId}|{clientMode}|{role}|{scopes_csv}|{signedAtMs}|{token}|{nonce}|{platform}|{deviceFamily}"
signature = sign(privateKey, SHA256(payload))
```

#### 步骤 5：实现重连机制

```
- 检测断线（WebSocket close/error 事件）
- 指数退避重连（初始 ~1s，最大 ~30s）
- 认证失败时暂停重连（AUTH_TOKEN_MISSING, AUTH_PASSWORD_MISMATCH 等）
- 序列号 gap 检测（重连刷新状态）
```

### 5.2 各角色的接入差异

#### 5.2.1 作为 Operator 客户端（管理/对话）

```
role: "operator"
scopes: ["operator.read", "operator.write", "operator.admin", "operator.approvals"]
mode: "cli" 或 "webchat"
```

常用方法：
- `agent.send` — 发送对话
- `agent.poll` — 轮询 Agent 输出
- `sessions.list` / `sessions.create` — 会话管理
- `config.get` / `config.set` — 配置管理
- `channels.status` — 通道状态

#### 5.2.2 作为 Node 客户端（移动设备/IoT）

```
role: "node"
mode: "node"
```

需要额外实现：
- **处理 `node.invoke.request` 事件**：Gateway 调用 Node 上的能力
- **发送 `node.event`**：上报设备事件
- **能力注册**：通过 `commands` 和 `permissions` 声明设备能力
- **配对流程**：`node.pair.request` → 等待 Gateway 审批

#### 5.2.3 作为 Probe 客户端（健康检测）

```
role: "operator"
mode: "probe"
clientName: "openclaw-probe"
```

一次性连接，执行方法后立即断开。

### 5.3 配置清单

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `gateway.auth.token` | 共享令牌 | 无 |
| `gateway.auth.password` | 密码 | 无 |
| `gateway.auth.mode` | 认证模式 (token/password/none/trusted-proxy) | 自动推断 |
| `gateway.port` | 网关端口 | 18789 |
| `gateway.bind` | 监听地址 | loopback |
| `gateway.tls.enabled` | TLS 开关 | false |
| `OPENCLAW_GATEWAY_TOKEN` | 环境变量：网关令牌 | 无 |
| `OPENCLAW_GATEWAY_PASSWORD` | 环境变量：网关密码 | 无 |
| `OPENCLAW_GATEWAY_URL` | 环境变量：网关 URL 覆盖 | 无 |

### 5.4 安全注意事项

1. **明文保护**：非 loopback 地址必须使用 `wss://`（CLI 强制执行）
2. **TLS 指纹锁定**：远程连接推荐 `tlsFingerprint` 参数
3. **设备身份绑定**：deviceToken 绑定 deviceId + publicKey，防止令牌冒用
4. **速率限制**：Gateway 对认证失败有速率限制
5. **Tailscale 集成**：支持通过 Tailscale Serve/Funnel 的 whois 认证

### 5.5 从源码切入的关键文件

| 功能模块 | 关键文件 |
|----------|---------|
| **协议 Schema 定义** | `src/gateway/protocol/schema/frames.ts` |
| **协议类型导出** | `src/gateway/protocol/schema/types.ts` |
| **所有 Schema 汇总** | `src/gateway/protocol/schema/protocol-schemas.ts` |
| **验证器编译** | `src/gateway/protocol/index.ts` |
| **客户端 ID/Mode 定义** | `src/gateway/protocol/client-info.ts` |
| **设备签名构建** | `src/gateway/device-auth.ts` |
| **CLI 客户端实现** | `src/gateway/client.ts`（完整参考实现） |
| **CLI RPC 调用** | `src/gateway/call.ts` |
| **Gateway 认证逻辑** | `src/gateway/auth.ts` |
| **Web UI 浏览器客户端** | `ui/src/ui/gateway.ts` |
| **Web UI Gateway 集成** | `ui/src/ui/app-gateway.ts` |
| **iOS 连接控制器** | `apps/ios/Sources/Gateway/GatewayConnectionController.swift` |
| **iOS 服务发现** | `apps/ios/Sources/Gateway/GatewayDiscoveryModel.swift` |
| **Android 会话管理** | `apps/android/.../gateway/GatewaySession.kt` |
| **Android 服务发现** | `apps/android/.../gateway/GatewayDiscovery.kt` |
| **连接错误码** | `src/gateway/protocol/connect-error-details.ts` |

---

## 6. 通信协议时序图

### 6.1 完整连接生命周期

```
┌─────────┐                          ┌─────────┐
│  Client  │                          │ Gateway │
└────┬─────┘                          └────┬────┘
     │                                      │
     │──── WebSocket Open ─────────────────>│
     │                                      │
     │<─── event: connect.challenge ────────│  { nonce: "abc123" }
     │                                      │
     │──── req: connect ───────────────────>│  { ConnectParams + device signature }
     │                                      │
     │<─── res: hello-ok ──────────────────│  { HelloOk + deviceToken }
     │                                      │
     │<─── event: presence ────────────────│  (初始状态快照)
     │                                      │
     │──── req: agent.send ────────────────>│  { text: "hello" }
     │<─── res: { status: "accepted" } ────│
     │                                      │
     │<─── event: agent ───────────────────│  (streaming 输出)
     │<─── event: agent ───────────────────│
     │<─── event: chat ────────────────────│  (对话完成)
     │                                      │
     │<─── event: tick ────────────────────│  (定期心跳)
     │                                      │
     │<─── event: shutdown ────────────────│  { reason: "config reload" }
     │                                      │
     │──── WebSocket Close ────────────────>│
     │                                      │
     │ ... 指数退避等待 ...                    │
     │                                      │
     │──── WebSocket Open (重连) ──────────>│
     └──────────────────────────────────────┘
```

### 6.2 设备配对流程（移动端）

```
┌──────────┐               ┌─────────┐               ┌──────────┐
│  Mobile  │               │ Gateway │               │ Operator │
│  (Node)  │               │         │               │  (CLI)   │
└────┬─────┘               └────┬────┘               └────┬─────┘
     │                          │                          │
     │ mDNS 发现 Gateway         │                          │
     │─── node.pair.request ───>│                          │
     │                          │── event: device.pair.requested ──>│
     │                          │                          │
     │                          │<── device.pair.approve ──│
     │                          │                          │
     │<── hello-ok (deviceToken)│                          │
     │                          │── event: device.pair.resolved ──>│
     └──────────────────────────┘──────────────────────────┘
```

---

## 7. 总结

### 7.1 架构优势

1. **统一协议**：所有客户端共享相同的 JSON-RPC over WebSocket 协议，降低维护成本
2. **设备绑定认证**：ECDSA 签名 + deviceToken 机制实现零信任设备认证
3. **自动发现**：mDNS/Bonjour 实现局域网零配置连接
4. **安全分层**：loopback 免认证 → 共享 token → 密码 → TLS 指纹锁定 → Tailscale whois

### 7.2 二次开发建议

1. **最快路径**：参考 `src/gateway/client.ts`（~900 行）实现完整客户端
2. **浏览器环境**：参考 `ui/src/ui/gateway.ts`（~620 行）的 `GatewayBrowserClient`
3. **移动端参考**：Android `GatewaySession.kt`（~1040 行）是最完整的原生客户端参考
4. **测试连通**：先用 `mode: "probe"` 做健康检测连接，再扩展为完整客户端
