# OpenClaw 项目整体架构分析

## 一、项目概述

OpenClaw 是一个**多平台 AI 个人助手系统**，核心理念是"在你的设备上、在你的频道里、按你的规则运行的 AI"。技术栈以 **TypeScript (ESM)** 为核心，辅以 **Swift** (macOS/iOS) 和 **Kotlin** (Android) 原生客户端。采用 **pnpm monorepo** 架构管理。

**不是** Spring Boot + React 项目（CLAUDE.md 父目录描述有误），而是一个 Node.js + TypeScript 的 AI Gateway/Agent 系统。

---

## 二、顶层目录结构总览

```
openclaw/
├── src/              # 核心源码（CLI、Gateway、Agent、Channel、Plugin 等）
├── extensions/       # 扩展插件（~120个：AI Provider、消息渠道、工具等）
├── packages/         # 共享包（plugin-sdk-host、contract 等）
├── ui/               # Control UI（Web 管理界面，Lit 框架）
├── apps/             # 原生客户端（macOS/iOS/Android）
├── Swabble/          # Swift 核心库（macOS/iOS 共享）
├── skills/           # 内置技能（GitHub、Obsidian、Discord 等 CLI 自动化）
├── scripts/          # 构建/发布/运维脚本
├── docs/             # 文档（Mintlify 托管）
├── test/             # 全局测试 fixtures/helpers
├── dist/             # 构建产物
└── docker-compose.yml # Docker 部署配置
```

---

## 三、核心功能模块划分

### 1. CLI 层 — `src/cli/` + `src/commands/` + `src/entry.ts`

| 职责 | 关键文件 |
|------|---------|
| CLI 入口和启动流程 | `src/entry.ts`（主入口）、`src/index.ts`（库模式入口） |
| 命令注册和路由 | `src/cli/run-main.ts`、`src/cli/program/` |
| 所有 CLI 子命令实现 | `src/commands/` (~200+文件) |

主要命令包括：`gateway run`、`agent`、`message send`、`channels status`、`config set`、`doctor`、`onboard`、`models`、`sessions`、`status` 等。

### 2. Gateway 服务层 — `src/gateway/`

这是系统的**核心服务枢纽**，是一个 HTTP + WebSocket 服务器：

| 子模块 | 职责 |
|--------|------|
| `server*.ts` | HTTP/WS 服务器启动、路由、认证 |
| `protocol/` | 类型化的 Gateway 控制面和节点通信协议 |
| `server-chat.ts` | 聊天会话管理 |
| `server-channels.ts` | 消息渠道管理 |
| `server-plugins.ts` | 插件引导和管理 |
| `openai-http.ts` | OpenAI 兼容 HTTP API |
| `mcp-http.ts` | MCP 协议 HTTP 端点 |
| `control-ui.ts` | 托管 Control UI 静态资源 |
| `auth.ts` / `connection-auth.ts` | Token/密码认证 |
| `session-*.ts` | 会话生命周期管理 |

Gateway 监听端口：**18789**（主服务）和 **18790**（Bridge）。

### 3. Agent/AI 推理层 — `src/agents/`

| 职责 | 关键文件 |
|------|---------|
| AI Agent 运行时（对话、工具调用、上下文管理） | `src/agents/` |
| ACP（Agent Communication Protocol）支持 | `src/acp/` |
| 提示模板和上下文引擎 | `src/context-engine/` |
| 实时语音交互 | `src/realtime-voice/`、`src/realtime-transcription/` |

### 4. 消息渠道层 — `src/channels/` + extensions 中的渠道插件

**核心内置渠道** (在 `src/` 中直接实现)：
- Telegram、Discord、Slack、Signal、iMessage、Web (WhatsApp Web)

**插件渠道** (在 `extensions/` 中)：
- Matrix、Mattermost、MS Teams、IRC、Line、Feishu（飞书）、Zalo、BlueBubbles、Nostr、Twitch、Nextcloud Talk、Google Chat、Synology Chat、QQBot、Tlon 等

渠道抽象层：`src/channels/` 提供通用的 allowlist、command-gating、conversation-binding、routing 等核心能力。

### 5. 插件系统 — `src/plugins/` + `src/plugin-sdk/`

| 子模块 | 职责 |
|--------|------|
| `src/plugins/` | 插件发现、加载、注册、manifest 验证、运行时管理 |
| `src/plugin-sdk/` | 公共 Plugin SDK（扩展允许导入的唯一接口） |
| `src/plugins/contracts/` | 插件合约注册 |
| `src/plugins/hooks.ts` | 插件钩子系统 |
| `src/plugins/providers.ts` | AI Provider 插件管理 |
| `src/plugins/memory-runtime.ts` | 记忆插件运行时 |

### 6. AI Provider 集成 — `extensions/` 中的 Provider 插件

**支持的 AI Provider**（每个都是独立的 extension 包）：
- OpenAI、Anthropic、Google (Gemini)、DeepSeek、Mistral、Groq、Ollama
- Amazon Bedrock、Azure (Microsoft)、Cloudflare AI Gateway、Vercel AI Gateway
- 阿里巴巴(Alibaba/Qwen)、百度(Qianfan)、Minimax、Moonshot、StepFun、火山引擎(Volcengine)
- OpenRouter、Together、Fireworks、Perplexity、Huggingface、NVIDIA、xAI
- 以及 LiteLLM、vLLM、sGLang、Copilot Proxy 等自托管/代理方案

### 7. 媒体处理管道 — `src/media/` + 相关 extensions

| 模块 | 职责 |
|------|------|
| `src/media/` | 音频/图片/视频基础处理（ffmpeg、base64、文件上下文） |
| `src/image-generation/` | 图像生成编排 |
| `src/video-generation/` | 视频生成编排 |
| `src/music-generation/` | 音乐生成编排 |
| `src/media-understanding/` | 媒体理解/分析 |
| `src/tts/` | 文本转语音 |
| `src/link-understanding/` | 链接内容理解 |
| `src/web-fetch/`、`src/web-search/` | 网页抓取和搜索 |

对应的 Provider 实现在 extensions 中：
- `extensions/image-generation-core`、`extensions/video-generation-core`
- `extensions/speech-core`、`extensions/media-understanding-core`
- `extensions/elevenlabs`、`extensions/deepgram`、`extensions/fal`、`extensions/runway`、`extensions/comfy`

### 8. 基础设施层 — `src/infra/`

这是最大的模块（300+文件），提供所有底层服务：

| 类别 | 关键能力 |
|------|---------|
| 认证/安全 | exec-approvals、exec-safety、host-env-security、secret-file |
| 设备管理 | device-identity、device-pairing、device-bootstrap |
| 网络 | bonjour 发现、tailscale、SSH tunnel、TLS |
| 配置/状态 | dotenv、json-file、state-migrations、archive |
| 进程管理 | restart、heartbeat、supervisor、gateway-lock |
| 更新 | update-check、update-runner、update-global |
| Provider 用量跟踪 | provider-usage.* (fetch/format/load) |
| Push 通知 | push-apns (Apple Push Notification) |

### 9. 前端 / Control UI — `ui/`

- 框架：**Lit** (Web Components) + Vite 构建
- 功能：Gateway 管理界面（聊天、渠道、设置、会话管理等）
- 关键文件：`ui/src/ui/app.ts`、`ui/src/ui/app-chat.ts`、`ui/src/ui/app-settings.ts`
- 国际化：`ui/src/i18n/`
- 由 Gateway 内嵌托管 (`src/gateway/control-ui.ts`)

### 10. 原生客户端 — `apps/` + `Swabble/`

| 平台 | 目录 | 技术 |
|------|------|------|
| macOS | `apps/macos/` | Swift / SwiftUI |
| iOS | `apps/ios/` | Swift / SwiftUI (含 WatchApp、ShareExtension) |
| Android | `apps/android/` | Kotlin / Gradle |
| 共享 Swift 库 | `Swabble/` | SwabbleCore + SwabbleKit |

客户端通过 WebSocket 连接到 Gateway，Swabble 提供 Swift 平台的共享网络/协议层。

### 11. MCP 集成 — `src/mcp/`

通过 `mcporter` 桥接模式支持 MCP (Model Context Protocol)，保持核心精简：
- `src/mcp/channel-bridge.ts` — MCP 渠道桥接
- `src/mcp/channel-server.ts` — MCP 服务端
- `src/mcp/plugin-tools-serve.ts` — 插件工具 MCP 暴露

### 12. 其他功能模块

| 模块 | 目录 | 职责 |
|------|------|------|
| Cron/定时任务 | `src/cron/` | 定时消息和任务调度 |
| Daemon | `src/daemon/` | 系统守护进程管理（launchd/systemd） |
| Hooks | `src/hooks/` | 事件钩子系统 |
| Sessions | `src/sessions/` | 会话存储和管理 |
| Tasks | `src/tasks/` | 任务队列 |
| Flows | `src/flows/` | 工作流编排 |
| Interactive | `src/interactive/` | 交互式 CLI |
| TUI | `src/tui/` | 终端 UI |
| Wizard | `src/wizard/` | 配置向导 |
| Polls | `src/polls.ts` | 投票功能 |
| Canvas Host | `src/canvas-host/` | Canvas/画布渲染宿主 |
| Security | `src/security/` | 安全策略 |
| Secrets | `src/secrets/` | 密钥管理 |
| Config | `src/config/` | 配置管理 |
| Logging | `src/logging/` | 日志系统（pino） |

---

## 四、架构依赖关系图

```
┌─────────────────────────────────────────────────────────┐
│                    客户端层 (Clients)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ macOS App│ │ iOS App  │ │Android   │ │ Control UI │  │
│  │ (Swift)  │ │ (Swift)  │ │(Kotlin)  │ │ (Lit/Web)  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │             │            │              │         │
│       └─────────────┴────────┬───┴──────────────┘         │
│                         WebSocket / HTTP                   │
└─────────────────────────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│              Gateway 服务层 (src/gateway/)                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ HTTP Server  │ │ WS Server    │ │ OpenAI-compat API│ │
│  │ :18789       │ │ :18789       │ │ /v1/chat/...     │ │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘ │
│         │                │                   │           │
│  ┌──────▼───────────────▼───────────────────▼─────────┐ │
│  │              Gateway Protocol Layer                  │ │
│  │    (认证、路由、会话管理、插件引导、配置重载)           │ │
│  └──────────────────────┬──────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Agent 引擎   │  │  渠道管理器   │  │  插件系统     │
│ src/agents/  │  │ src/channels/│  │ src/plugins/ │
│              │  │              │  │              │
│ - AI 推理    │  │ - 消息路由   │  │ - 发现/加载  │
│ - 工具调用   │  │ - Allowlist  │  │ - 注册/激活  │
│ - 上下文管理 │  │ - 命令拦截   │  │ - Hook 系统  │
│ - 子Agent    │  │ - 会话绑定   │  │ - 合约验证   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────┐
│                Extensions 插件层 (~120个)              │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ AI Providers (30+):                             │  │
│  │ openai, anthropic, google, deepseek, ollama,    │  │
│  │ alibaba, qwen, qianfan, minimax, moonshot...    │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 消息渠道 (20+):                                  │  │
│  │ telegram, discord, slack, matrix, whatsapp,     │  │
│  │ msteams, feishu, irc, line, zalo, qqbot...      │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 媒体/工具 (15+):                                 │  │
│  │ elevenlabs, deepgram, fal, runway, brave,       │  │
│  │ tavily, firecrawl, exa, comfy...                │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 记忆 (Memory):                                   │  │
│  │ memory-core, memory-lancedb, memory-wiki        │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              基础设施层 (src/infra/)                    │
│  认证/安全 | 设备管理 | 网络发现 | 配置/状态            │
│  进程管理 | 更新检查 | Provider用量 | Push通知           │
└──────────────────────────────────────────────────────┘
```

---

## 五、外部服务依赖

| 类别 | 外部服务 | 接入方式 |
|------|---------|---------|
| AI 推理 | OpenAI, Anthropic, Google, DeepSeek, Ollama 等 | 各 Provider 插件通过 API Key |
| 消息平台 | Telegram Bot API, Discord API, Slack API, WhatsApp Web, Matrix 等 | 各 Channel 插件通过 Bot Token |
| 搜索 | Brave Search, Perplexity, Tavily, DuckDuckGo, SearXNG, Exa | API Key |
| 媒体生成 | ElevenLabs (TTS), Deepgram (STT), FAL, Runway | API Key |
| 网页抓取 | Firecrawl | API Key |
| MCP | 通过 mcporter 桥接 | 配置文件 |
| Push | Apple APNs | 证书/密钥 |
| 设备发现 | Bonjour/mDNS, Tailscale | 本地网络 |
| 包管理 | npm registry, ClawHub (clawhub.ai) | 公开 |

---

## 六、关键架构设计模式

1. **Plugin-First Architecture**：核心精简，能力通过插件扩展。Provider、Channel、Memory、Tool 都是插件。
2. **Gateway-Centric**：Gateway 是所有通信的枢纽，客户端（CLI/Web/Mobile/Desktop）都通过 Gateway 交互。
3. **Extension Isolation**：扩展只能通过 `openclaw/plugin-sdk/*` 接口与核心交互，严格的导入边界。
4. **Multi-Channel Routing**：一个 Gateway 同时连接多个消息平台，统一消息路由和 Agent 调度。
5. **Lazy Loading**：核心大量使用动态 import，按需加载模块以优化启动性能。
6. **Docker-Ready**：通过 docker-compose 一键部署 Gateway + CLI。

---

## 七、构建与运行

- 包管理：`pnpm` (monorepo)，支持 `bun` 开发执行
- 构建：`tsdown`（TypeScript 打包 → `dist/`）
- 测试：`vitest`（多配置文件，按模块分离测试套件）
- Lint：`oxlint` + `oxfmt`
- Docker：`Dockerfile` + `docker-compose.yml`
- 运行：`node dist/index.js gateway` 或 `openclaw gateway run`
