# OpenClaw 项目架构说明 & 本地开发启动指南

> 本文档面向二次开发者，基于源码实际结构编写，帮助快速理解项目架构并搭建本地开发环境。

---

## 一、技术栈概览

| 层面 | 技术 |
|------|------|
| 语言 | TypeScript (ESM) |
| 运行时 | Node.js 22+（推荐），Bun（可选，用于更快的 TS 执行） |
| 包管理 | pnpm（monorepo 模式） |
| 前端 | Vite + Lit Web Components |
| 构建 | tsdown (esbuild)、Vite |
| 测试 | Vitest（V8 coverage） |
| 代码检查 | Oxlint + Oxfmt |

> **注意**：这不是 Spring Boot + React 项目，而是 **Node.js 全栈**项目。

---

## 二、Monorepo 目录结构

项目使用 pnpm workspace 管理，`pnpm-workspace.yaml` 定义了以下工作区：

```
openclaw/
├── .                        # 根项目 — CLI + Gateway 后端（核心）
├── ui/                      # Control UI 前端（Vite + Lit 组件）
├── packages/                # 共享包
│   ├── clawdbot/
│   ├── memory-host-sdk/
│   ├── moltbot/
│   └── plugin-package-contract/
├── extensions/              # 插件/扩展（100+ 个）
│   ├── anthropic/           # Anthropic 模型提供者
│   ├── openai/              # OpenAI 模型提供者
│   ├── deepseek/            # DeepSeek 模型提供者
│   ├── telegram/            # Telegram 频道
│   ├── discord/             # Discord 频道
│   ├── slack/               # Slack 频道
│   ├── browser/             # 浏览器集成
│   ├── brave/               # Brave 搜索
│   └── ...                  # 更多：google, ollama, signal, matrix 等
├── apps/                    # 原生客户端
│   ├── android/
│   ├── ios/
│   ├── macos/
│   └── shared/
├── docs/                    # 项目文档（Mintlify 托管）
├── scripts/                 # 构建/工具脚本
└── dist/                    # 构建输出
```

### 2.1 核心源码目录（`src/`）

```
src/
├── cli/              # CLI 命令入口
├── commands/         # CLI 子命令实现
├── gateway/          # Gateway 网关服务（核心后端）
├── channels/         # 消息渠道核心（Telegram, Discord, Slack 等）
├── routing/          # 消息路由
├── plugins/          # 插件系统（发现、加载、注册、校验）
├── plugin-sdk/       # 插件 SDK 公共接口（extensions 依赖此模块）
├── agents/           # Agent 子系统
├── config/           # 配置管理
├── infra/            # 基础设施层
├── media/            # 媒体管道
├── hooks/            # 钩子系统
├── flows/            # 流程处理
├── chat/             # 聊天核心逻辑
├── sessions/         # 会话管理
├── web-search/       # Web 搜索
├── web-fetch/        # Web 抓取
├── tts/              # 语音合成
├── i18n/             # 国际化
├── terminal/         # 终端 UI 工具（调色板、表格等）
└── ...
```

### 2.2 前后端关系

| 角色 | 说明 | 启动命令 |
|------|------|----------|
| **后端**（Gateway） | Node.js 网关服务，处理消息路由、插件加载、Agent 调度 | `pnpm dev` 或 `pnpm start` |
| **前端**（Control UI） | Vite 开发服务器 + Lit Web 组件，提供管理界面 | `cd ui && pnpm dev` |

后端实际执行的是 `node scripts/run-node.mjs`，即纯 Node.js 服务。

---

## 三、本地开发环境搭建

### 3.1 环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | **22+** | 必须 |
| pnpm | 最新版 | 必须（monorepo 包管理） |
| Bun | 最新版 | 可选（更快的 TypeScript 执行） |

### 3.2 安装步骤

```bash
# 1. 安装 pnpm（如果尚未安装）
npm install -g pnpm

# 2. 进入项目目录
cd openclaw/

# 3. 安装所有依赖（包括 workspace 子包）
pnpm install

# 4. 复制环境配置文件
cp .env.example .env

# 5. 编辑 .env，填入必要的配置（见下方配置说明）
```

### 3.3 启动命令

```bash
# 启动后端 Gateway（开发模式）
pnpm dev

# 启动后端 Gateway（生产模式）
pnpm start

# 启动前端 Control UI（需另开终端）
cd ui && pnpm dev

# 构建项目
pnpm build

# TypeScript 类型检查
pnpm tsgo

# 代码检查（lint + 格式）
pnpm check

# 格式化代码
pnpm format          # 检查格式
pnpm format:fix      # 自动修复格式

# 运行测试
pnpm test

# 运行测试（带覆盖率报告）
pnpm test:coverage

# 在开发模式下运行 CLI 命令
pnpm openclaw <command>
```

### 3.4 环境配置（.env 关键项）

#### Gateway 认证

```bash
# Gateway 认证 token（绑定非 loopback 地址时推荐设置）
OPENCLAW_GATEWAY_TOKEN=change-me-to-a-long-random-token
# 可用 openssl rand -hex 32 生成

# 或使用密码认证（二选一）
# OPENCLAW_GATEWAY_PASSWORD=change-me-to-a-strong-password
```

#### 模型 API Key（至少配置一个）

```bash
# OpenAI
# OPENAI_API_KEY=sk-...

# Anthropic
# ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
# GEMINI_API_KEY=...

# OpenRouter
# OPENROUTER_API_KEY=sk-or-...

# 更多提供者：DeepSeek、Ollama、Groq 等通过 extensions 配置
```

#### 消息渠道（按需启用）

```bash
# Telegram
# TELEGRAM_BOT_TOKEN=123456:ABCDEF...

# Discord
# DISCORD_BOT_TOKEN=...

# Slack
# SLACK_BOT_TOKEN=xoxb-...
# SLACK_APP_TOKEN=xapp-...
```

#### 工具和媒体（可选）

```bash
# Brave 搜索
# BRAVE_API_KEY=...

# ElevenLabs 语音合成
# ELEVENLABS_API_KEY=...

# Firecrawl 网页抓取
# FIRECRAWL_API_KEY=...
```

> 完整配置项请参考 `.env.example` 文件。

---

## 四、项目架构要点

### 4.1 插件系统

OpenClaw 的核心设计是**插件化架构**：

- **插件 SDK**（`src/plugin-sdk/`）：定义了插件的公共接口，所有 extension 通过 `openclaw/plugin-sdk/*` 导入
- **插件加载器**（`src/plugins/`）：负责插件发现、Manifest 校验、加载和注册
- **Extensions**（`extensions/`）：具体的插件实现，包括：
  - **模型提供者插件**：anthropic, openai, deepseek, google, ollama 等
  - **频道插件**：telegram, discord, slack, signal, matrix 等
  - **工具插件**：brave（搜索）, browser, firecrawl 等
  - **媒体插件**：elevenlabs（TTS）, deepgram（ASR）等

### 4.2 Gateway 网关

Gateway 是核心后端服务（`src/gateway/`），负责：
- 多渠道消息路由
- 插件生命周期管理
- Agent 调度
- 控制平面协议（`src/gateway/protocol/`）

### 4.3 导入边界规则

- Extension 只能通过 `openclaw/plugin-sdk/*` 导入核心功能
- 不允许 extension 直接 import `src/**` 下的核心代码
- 不允许跨 extension 互相引用内部代码

---

## 五、常用开发流程

```bash
# 1. 修改代码

# 2. 运行类型检查
pnpm tsgo

# 3. 运行代码检查
pnpm check

# 4. 运行相关测试
pnpm test <path-or-filter>

# 5. 构建验证（如修改了模块边界/构建产物）
pnpm build

# 6. 提交代码
scripts/committer "feat: your change description" <changed-files...>
```

---

## 六、参考链接

- 项目仓库：https://github.com/openclaw/openclaw
- 在线文档：https://docs.openclaw.ai
- 插件开发指南：`docs/plugins/building-plugins.md`
- 插件架构：`docs/plugins/architecture.md`
- Gateway 协议：`docs/gateway/protocol.md`
- 测试指南：`docs/help/testing.md`
