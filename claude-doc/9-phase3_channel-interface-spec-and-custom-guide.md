# Phase 3: Channel 统一接口规范与自定义 Channel 接入指南

## 一、核心结论

**是的，存在严格的统一接口规范。** 所有 Channel（无论 Telegram/WhatsApp/Discord 还是你未来的自定义 Channel）都必须遵循同一套契约。这套契约由三个层次组成：

```
层次 1: 输入输出数据契约（所有 Channel 必须遵守）
  MsgContext  — 入站消息的标准化结构
  ReplyPayload — 出站回复的标准化结构

层次 2: Channel Plugin 接口契约（实现一个 Channel 必须填充的适配器）
  ChannelPlugin<T> — 31 个适配器插槽的容器

层次 3: 注册与发现契约（让系统认识你的 Channel）
  openclaw.plugin.json — 插件清单
  createChatChannelPlugin() — 工厂函数
```

---

## 二、层次 1: 输入输出数据契约

### 2.1 入站规范：MsgContext

**源码**: `src/auto-reply/templating.ts:25-199`

这是所有 Channel 将平台消息转换后交给 Agent 的**统一输入格式**。

```typescript
type MsgContext = {
  // ═══════════════════════════════════════════
  //  第一组：消息正文（最核心，必须提供）
  // ═══════════════════════════════════════════
  Body?: string;
  // 原始消息文本。所有 Channel 都必须填这个字段。
  // Telegram: message.text
  // WhatsApp: msg.body
  // 你的 Channel: 从你的平台 API 取消息文本

  BodyForAgent?: string;
  // 给 Agent 看的增强版本（可含时间戳、上下文等）
  // 如果不填，系统会自动用 Body

  BodyForCommands?: string;
  // 用于命令解析的干净文本（去除引用/转发等噪音）

  // ═══════════════════════════════════════════
  //  第二组：路由信息（决定消息去哪个会话、回复发到哪）
  // ═══════════════════════════════════════════
  SessionKey?: string;
  // 目标会话 key。Channel 通常基于 (渠道ID + 发送者ID) 计算

  Provider?: string;
  // 渠道标识。你的 Channel 需要填自己的 ID，如 "my-channel"

  Surface?: string;
  // 显示平台标识。一般与 Provider 相同

  OriginatingChannel?: string;
  // 回复应该发回哪个渠道

  OriginatingTo?: string;
  // 回复应该发给谁（聊天 ID / 用户 ID）

  ChatType?: string;
  // "direct"（私聊）或 "group"（群聊）

  AccountId?: string;
  // 多账户时的账户 ID

  // ═══════════════════════════════════════════
  //  第三组：发送者信息
  // ═══════════════════════════════════════════
  SenderId?: string;
  // 发送者唯一 ID。用于白名单检查和权限控制

  SenderName?: string;
  // 发送者显示名

  SenderUsername?: string;
  // 发送者用户名

  From?: string;
  // 来源地址（电话号码 / 聊天 ID 等）

  To?: string;
  // 目标地址

  // ═══════════════════════════════════════════
  //  第四组：媒体/附件（可选）
  // ═══════════════════════════════════════════
  MediaPath?: string;           // 本地文件路径
  MediaUrl?: string;            // 远程 URL
  MediaType?: string;           // MIME 类型
  MediaPaths?: string[];        // 多个文件
  MediaUrls?: string[];         // 多个 URL
  MediaTypes?: string[];        // 多个 MIME 类型

  // ═══════════════════════════════════════════
  //  第五组：线程/回复上下文（可选）
  // ═══════════════════════════════════════════
  MessageSid?: string;          // 当前消息 ID
  ReplyToId?: string;           // 回复目标消息 ID
  ReplyToBody?: string;         // 被回复消息内容
  MessageThreadId?: string;     // 线程/话题 ID
  ThreadParentId?: string;      // 线程父会话 ID

  // ═══════════════════════════════════════════
  //  第六组：群组上下文（群消息时填充）
  // ═══════════════════════════════════════════
  GroupSubject?: string;        // 群名称
  GroupMembers?: string;        // 群成员数
  WasMentioned?: boolean;       // 是否 @了 bot
  ConversationLabel?: string;   // 会话标签

  // ═══════════════════════════════════════════
  //  第七组：权限/命令控制
  // ═══════════════════════════════════════════
  CommandAuthorized?: boolean;  // 是否通过白名单
  CommandSource?: "text" | "native"; // 命令来源
  GatewayClientScopes?: string[]; // Gateway 客户端权限

  // ═══════════════════════════════════════════
  //  第八组：转发/引用（可选）
  // ═══════════════════════════════════════════
  ForwardedFrom?: string;       // 转发来源
  ForwardedFromType?: string;   // 转发来源类型
  InboundHistory?: Array<{      // 最近聊天历史
    sender: string;
    body: string;
    timestamp?: number;
  }>;
};
```

**最小可工作填充**（一个新 Channel 至少需要填这些）：

```typescript
const ctx: MsgContext = {
  Body: "用户发送的消息文本",
  Provider: "my-channel",
  Surface: "my-channel",
  SenderId: "user_12345",
  From: "user_12345",
  To: "bot_id",
  SessionKey: "my-channel:user_12345:main",
  OriginatingChannel: "my-channel",
  OriginatingTo: "user_12345",
  ChatType: "direct",
  CommandAuthorized: true,
};
```

### 2.2 出站规范：ReplyPayload

**源码**: `src/auto-reply/types.ts:151-175`

Agent 处理完成后产出的**统一输出格式**，所有 Channel 从中取数据转换为平台特定格式。

```typescript
type ReplyPayload = {
  // ═══ 核心内容 ═══
  text?: string;
  // Agent 回复的文本。这是最重要的字段。
  // 你的 Channel 需要把这个文本发送到你的平台

  mediaUrl?: string;
  // 单个媒体附件 URL

  mediaUrls?: string[];
  // 多个媒体附件 URL

  // ═══ 交互元素 ═══
  interactive?: InteractiveReply;
  // 交互式回复（按钮、投票等）

  btw?: { question: string };
  // "顺便问一下"类型的追加问题

  // ═══ 线程控制 ═══
  replyToId?: string;
  // 回复特定消息

  replyToCurrent?: boolean;
  // 回复当前对话消息

  // ═══ 媒体选项 ═══
  audioAsVoice?: boolean;
  // true = 语音消息气泡，false = 音频文件

  // ═══ 元信息标记 ═══
  isError?: boolean;
  // 这是一个错误消息

  isReasoning?: boolean;
  // 这是 AI 的推理/思考过程。
  // 没有推理展示能力的 Channel 应该跳过这类消息

  isCompactionNotice?: boolean;
  // 上下文压缩通知。不应该发给用户看

  // ═══ 渠道扩展 ═══
  channelData?: Record<string, unknown>;
  // 渠道特有数据，如 { telegram: { pin: true } }
};
```

**Channel 出站的最小处理逻辑**：

```typescript
async function deliverReply(payload: ReplyPayload) {
  // 1. 跳过不应展示的内容
  if (payload.isCompactionNotice) return;
  if (payload.isReasoning) return; // 除非你的平台支持推理展示

  // 2. 发送文本
  if (payload.text) {
    await myPlatformApi.sendMessage(targetUserId, payload.text);
  }

  // 3. 发送媒体
  if (payload.mediaUrl) {
    await myPlatformApi.sendMedia(targetUserId, payload.mediaUrl);
  }
}
```

---

## 三、层次 2: ChannelPlugin 适配器契约

### 3.1 ChannelPlugin 完整接口

**源码**: `src/channels/plugins/types.plugin.ts:83-126`

```typescript
type ChannelPlugin<ResolvedAccount = any> = {
  // ═══ 必填：身份与元信息 ═══
  id: ChannelId;                   // 渠道唯一标识，如 "my-channel"
  meta: ChannelMeta;               // 用户可见的元数据
  capabilities: ChannelCapabilities; // 能力声明

  // ═══ 必填：配置适配器 ═══
  config: ChannelConfigAdapter<ResolvedAccount>;
  // 账户配置的增删改查

  // ═══ 核心适配器（实现消息收发至少需要这两个） ═══
  gateway?: ChannelGatewayAdapter<ResolvedAccount>;
  // 最重要！控制渠道的启动/停止，在这里启动你的消息监听

  outbound?: ChannelOutboundAdapter;
  // 出站消息适配，控制如何发送 ReplyPayload

  // ═══ 消息路由 ═══
  messaging?: ChannelMessagingAdapter;
  // 目标解析、会话路由

  // ═══ 安全与访问控制 ═══
  security?: ChannelSecurityAdapter<ResolvedAccount>;
  allowlist?: ChannelAllowlistAdapter;
  pairing?: ChannelPairingAdapter;

  // ═══ 群组 ═══
  groups?: ChannelGroupAdapter;
  mentions?: ChannelMentionAdapter;

  // ═══ 设置与引导 ═══
  setup?: ChannelSetupAdapter;
  setupWizard?: ChannelSetupWizard;
  configSchema?: ChannelConfigSchema;

  // ═══ 生命周期 ═══
  lifecycle?: ChannelLifecycleAdapter;

  // ═══ 状态与健康 ═══
  status?: ChannelStatusAdapter<ResolvedAccount>;
  heartbeat?: ChannelHeartbeatAdapter;

  // ═══ 高级能力（可选） ═══
  streaming?: ChannelStreamingAdapter;   // 流式输出（打字指示器）
  threading?: ChannelThreadingAdapter;   // 线程/话题
  directory?: ChannelDirectoryAdapter;   // 联系人/群组目录
  actions?: ChannelMessageActionAdapter; // 消息动作（反应/编辑/删除）
  commands?: ChannelCommandAdapter;      // 渠道命令
  auth?: ChannelAuthAdapter;             // 渠道认证
  approvals?: ChannelApprovalAdapter;    // 审批
  doctor?: ChannelDoctorAdapter;         // 诊断修复
  agentTools?: ChannelAgentTool[];       // 渠道提供的 Agent 工具
  agentPrompt?: ChannelAgentPromptAdapter; // 渠道对 Agent 提示词的贡献
  secrets?: ChannelSecretsAdapter;       // 密钥管理
  bindings?: ChannelConfiguredBindingProvider; // ACP 绑定
  conversationBindings?: ChannelConversationBindingSupport; // 会话绑定
  elevated?: ChannelElevatedAdapter;     // 提权操作
  resolver?: ChannelResolverAdapter;     // 目标解析
  gatewayMethods?: string[];             // 额外的 Gateway RPC 方法
};
```

### 3.2 适配器优先级分类

| 优先级 | 适配器 | 说明 | 必须实现？ |
|-------|--------|------|-----------|
| **P0** | `id` + `meta` | 渠道标识与元信息 | **是** |
| **P0** | `config` | 账户配置管理 | **是** |
| **P0** | `gateway.startAccount` | 启动消息监听（核心入口） | **是** |
| **P0** | `outbound.sendText` | 发送文本消息 | **是** |
| **P1** | `messaging` | 目标解析、会话路由 | 推荐 |
| **P1** | `setup` | 配置引导 | 推荐 |
| **P1** | `security` | DM 安全策略 | 推荐 |
| **P1** | `status` | 状态报告 | 推荐 |
| **P2** | `outbound.sendMedia` | 发送媒体 | 可选 |
| **P2** | `groups` | 群组策略 | 可选 |
| **P2** | `streaming` | 打字指示器 | 可选 |
| **P2** | `threading` | 线程管理 | 可选 |
| **P2** | `allowlist` | 白名单编辑 | 可选 |
| **P3** | `directory` | 联系人目录 | 可选 |
| **P3** | `actions` | 消息动作（反应/编辑） | 可选 |
| **P3** | `heartbeat` | 心跳保活 | 可选 |
| **P3** | `approvals` | 执行审批转发 | 可选 |
| **P3** | `doctor` | 诊断修复 | 可选 |

### 3.3 四个核心适配器详解

#### 3.3.1 ChannelGatewayAdapter — 渠道运行时核心

**源码**: `src/channels/plugins/types.adapters.ts:417-432`

```typescript
type ChannelGatewayAdapter<ResolvedAccount> = {
  // 启动渠道（最核心的方法）
  startAccount?: (ctx: ChannelGatewayContext<ResolvedAccount>) => Promise<unknown>;

  // 停止渠道
  stopAccount?: (ctx: ChannelGatewayContext<ResolvedAccount>) => Promise<void>;

  // 登录（QR 码等）
  loginWithQrStart?: (...) => Promise<ChannelLoginWithQrStartResult>;
  loginWithQrWait?: (...) => Promise<ChannelLoginWithQrWaitResult>;

  // 登出
  logoutAccount?: (...) => Promise<ChannelLogoutResult>;
};
```

**ChannelGatewayContext** 提供给你的上下文：

```typescript
type ChannelGatewayContext<ResolvedAccount> = {
  cfg: OpenClawConfig;           // 当前配置
  accountId: string;             // 账户 ID
  account: ResolvedAccount;      // 解析后的账户对象
  runtime: RuntimeEnv;           // 运行时环境（日志等）
  abortSignal: AbortSignal;      // 取消信号（Gateway 关闭时触发）
  log?: ChannelLogSink;          // 日志接口
  getStatus: () => ChannelAccountSnapshot;    // 获取当前状态
  setStatus: (next: ChannelAccountSnapshot) => void; // 更新状态

  // 重要！Channel 运行时工具集
  channelRuntime?: PluginRuntime["channel"];
  // 包含 reply（AI 回复分发）、routing（路由）、
  // text（文本处理）、session（会话管理）、media（媒体）等
};
```

#### 3.3.2 ChannelOutboundAdapter — 出站消息适配

**源码**: `src/channels/plugins/types.adapters.ts:200-252`

```typescript
type ChannelOutboundAdapter = {
  deliveryMode: "direct" | "gateway" | "hybrid";
  // direct: Channel 自己直接发送
  // gateway: 通过 Gateway 代理发送
  // hybrid: 混合模式

  // 文本分块（长消息切割）
  chunker?: (text: string, limit: number) => string[];
  textChunkLimit?: number;
  chunkerMode?: "text" | "markdown";

  // 文本清洗
  sanitizeText?: (params: { text: string; payload: ReplyPayload }) => string;

  // 核心发送方法
  sendText?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>;
  sendMedia?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>;
  sendPoll?: (ctx: ChannelPollContext) => Promise<ChannelPollResult>;

  // 高级方法
  sendPayload?: (ctx: ChannelOutboundPayloadContext) => Promise<OutboundDeliveryResult>;
  sendFormattedText?: (ctx: ChannelOutboundFormattedContext) => Promise<OutboundDeliveryResult[]>;

  // 目标解析
  resolveTarget?: (params: { ... }) =>
    | { ok: true; to: string }
    | { ok: false; error: Error };
};
```

#### 3.3.3 ChannelConfigAdapter — 配置管理

**源码**: `src/channels/plugins/types.adapters.ts:107-138`

```typescript
type ChannelConfigAdapter<ResolvedAccount> = {
  // 列出所有配置的账户 ID
  listAccountIds: (cfg: OpenClawConfig) => string[];

  // 解析账户配置为强类型对象
  resolveAccount: (cfg: OpenClawConfig, accountId?: string | null) => ResolvedAccount;

  // 账户是否启用
  isEnabled?: (account: ResolvedAccount, cfg: OpenClawConfig) => boolean;

  // 账户是否已配置
  isConfigured?: (account: ResolvedAccount, cfg: OpenClawConfig) => boolean | Promise<boolean>;

  // 描述账户当前状态
  describeAccount?: (account: ResolvedAccount, cfg: OpenClawConfig) => ChannelAccountSnapshot;
};
```

#### 3.3.4 ChannelMeta — 元信息

**源码**: `src/channels/plugins/types.core.ts:141-163`

```typescript
type ChannelMeta = {
  id: ChannelId;             // 渠道 ID
  label: string;             // 显示名，如 "My Channel"
  selectionLabel: string;    // 选择列表中的标签
  docsPath: string;          // 文档路径
  blurb: string;             // 一句话描述
  order?: number;            // 排序权重
  aliases?: readonly string[]; // 别名
  markdownCapable?: boolean;  // 是否支持 Markdown
  showInSetup?: boolean;     // 是否在初始化向导中展示
};
```

---

## 四、层次 3: 注册与发现

### 4.1 Plugin Manifest（`openclaw.plugin.json`）

```json
{
  "id": "my-channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

### 4.2 createChatChannelPlugin 工厂函数

**源码**: `src/plugin-sdk/channel-core.ts`

所有 Channel 都通过这个工厂函数创建：

```typescript
import { createChatChannelPlugin } from "openclaw/plugin-sdk/channel-core";

export const myChannelPlugin = createChatChannelPlugin({
  // 自动生成 security / pairing / threading 等默认实现
  // 你只需要提供 base 和 outbound

  base: {
    // ... 你的适配器实现
  },
  outbound: {
    // ... 你的出站实现
  },
  pairing: {
    idLabel: "myChannelUserId",
  },
});
```

### 4.3 Plugin 入口文件

```typescript
// extensions/my-channel/src/index.ts
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./channel.js";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "My custom messaging channel",
  plugin: myChannelPlugin,
});
```

---

## 五、实现自定义 Channel 的最小模板

以下是一个可运行的最小 Channel 实现骨架：

```typescript
// extensions/my-channel/src/channel.ts

import { createChatChannelPlugin } from "openclaw/plugin-sdk/channel-core";
import { createDefaultChannelRuntimeState } from "openclaw/plugin-sdk/status-helpers";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";

// ═══ 1. 定义账户类型 ═══
type MyAccount = {
  accountId: string;
  token: string;
  name?: string;
};

// ═══ 2. 账户解析 ═══
function resolveAccount(cfg: OpenClawConfig, accountId?: string | null): MyAccount {
  const channelCfg = cfg.channels?.["my-channel"] as Record<string, unknown> | undefined;
  const token = (channelCfg?.token as string) ?? "";
  return {
    accountId: accountId ?? "default",
    token,
    name: (channelCfg?.name as string) ?? undefined,
  };
}

// ═══ 3. 创建 Channel Plugin ═══
export const myChannelPlugin = createChatChannelPlugin<MyAccount>({

  // --- 出站：如何发送消息 ---
  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 4096,

    sendText: async (ctx) => {
      // ctx.to = 目标用户 ID
      // ctx.text = 要发送的文本
      // ctx.cfg = 当前配置
      await myPlatformApi.sendMessage(ctx.to, ctx.text);
      return { channel: "my-channel", ok: true };
    },

    sendMedia: async (ctx) => {
      await myPlatformApi.sendMedia(ctx.to, ctx.mediaUrl ?? "");
      return { channel: "my-channel", ok: true };
    },
  },

  // --- 基础配置 ---
  base: {
    id: "my-channel",
    meta: {
      id: "my-channel",
      label: "My Channel",
      selectionLabel: "My Channel",
      docsPath: "/channels/my-channel",
      blurb: "Connect your custom messaging platform",
      markdownCapable: true,
    },
    capabilities: {},

    // 配置适配器
    config: {
      listAccountIds: (cfg) => {
        const channelCfg = cfg.channels?.["my-channel"];
        return channelCfg ? ["default"] : [];
      },
      resolveAccount,
      isEnabled: () => true,
      isConfigured: (account) => Boolean(account.token),
    },

    // 消息路由
    messaging: {
      normalizeTarget: (raw) => raw?.trim() ?? null,
      parseExplicitTarget: ({ raw }) => ({
        to: raw,
        chatType: "direct" as const,
      }),
    },

    // Gateway 适配器（最核心！）
    gateway: {
      startAccount: async (ctx) => {
        // 这里启动你的消息监听
        // ctx.channelRuntime 提供了完整的 AI 回复分发能力

        const poller = startMyPlatformPoller({
          token: ctx.account.token,
          onMessage: async (msg) => {
            // 将平台消息转为 MsgContext，调用 AI 回复
            await ctx.channelRuntime?.reply.dispatchReplyWithBufferedBlockDispatcher({
              ctx: {
                Body: msg.text,
                Provider: "my-channel",
                Surface: "my-channel",
                SenderId: msg.senderId,
                From: msg.senderId,
                SessionKey: `my-channel:${msg.senderId}:main`,
                OriginatingChannel: "my-channel",
                OriginatingTo: msg.senderId,
                ChatType: "direct",
                CommandAuthorized: true,
              },
              cfg: ctx.cfg,
              dispatcherOptions: {
                deliver: async (payload) => {
                  // 将 ReplyPayload 发回平台
                  if (payload.text) {
                    await myPlatformApi.sendMessage(msg.senderId, payload.text);
                  }
                },
              },
            });
          },
        });

        ctx.setStatus({
          accountId: ctx.accountId,
          connected: true,
          running: true,
        });

        // 监听取消信号
        ctx.abortSignal.addEventListener("abort", () => {
          poller.stop();
        });
      },

      stopAccount: async (ctx) => {
        ctx.setStatus({
          accountId: ctx.accountId,
          connected: false,
          running: false,
        });
      },
    },

    // 设置适配器
    setup: {
      applyAccountConfig: ({ cfg, accountId, input }) => ({
        ...cfg,
        channels: {
          ...cfg.channels,
          "my-channel": {
            ...(cfg.channels?.["my-channel"] as Record<string, unknown> ?? {}),
            token: input.token,
          },
        },
      }),
    },
  },

  // 配对
  pairing: {
    idLabel: "myChannelUserId",
  },
});
```

---

## 六、接口流转全景图

```
你的平台 API
  │ (平台特定格式)
  ▼
gateway.startAccount()
  │ 启动消息监听
  │
  ▼
收到新消息
  │
  ├─▶ 构建 MsgContext ◄─── 统一入站规范
  │   {                      │
  │     Body: "...",          │
  │     Provider: "my-channel",│
  │     SenderId: "...",      │
  │     ...                   │
  │   }                       │
  │                           │
  ├─▶ channelRuntime.reply.dispatch(ctx, cfg, dispatcher)
  │                           │
  │   ┌───────────────────┐   │
  │   │   Agent 推理引擎   │   │
  │   │   (完全通用)       │   │
  │   └────────┬──────────┘   │
  │            │              │
  │            ▼              │
  │   ReplyPayload ◄─── 统一出站规范
  │   {                       │
  │     text: "...",          │
  │     mediaUrl: "...",      │
  │   }                       │
  │                           │
  └─▶ dispatcher.deliver(payload)
      │
      ▼
outbound.sendText(ctx) / outbound.sendMedia(ctx)
      │ (你实现的发送逻辑)
      ▼
你的平台 API
  │ (平台特定格式)
  ▼
用户收到回复
```

---

## 七、关键源码文件索引

| 文件 | 作用 | 重要程度 |
|------|------|---------|
| `src/auto-reply/templating.ts` | **MsgContext** 定义 | 必读 |
| `src/auto-reply/types.ts` | **ReplyPayload** 定义 | 必读 |
| `src/channels/plugins/types.plugin.ts` | **ChannelPlugin** 完整接口 | 必读 |
| `src/channels/plugins/types.core.ts` | ChannelMeta / ChannelId 等核心类型 | 必读 |
| `src/channels/plugins/types.adapters.ts` | 所有适配器类型定义 | 必读 |
| `src/plugin-sdk/channel-core.ts` | `createChatChannelPlugin` 工厂 | 必读 |
| `src/plugin-sdk/channel-contract.ts` | Plugin SDK 导出的 Channel 契约 | 参考 |
| `src/auto-reply/dispatch.ts` | `dispatchInboundMessage` 调度入口 | 参考 |
| `src/auto-reply/reply/reply-dispatcher.ts` | ReplyDispatcher 分发器 | 参考 |
| `extensions/telegram/src/channel.ts` | Telegram 实现参考 | 参考 |
| `extensions/whatsapp/src/channel.ts` | WhatsApp 实现参考 | 参考 |
