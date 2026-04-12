# 架构模块遗漏分析：四个 Phase 之外的核心架构

## 一、已覆盖 vs 未覆盖全景

### 已覆盖（4 个 Phase，共 ~2,650 文件）

| Phase | 覆盖目录 | 文件数 | 核心内容 |
|-------|---------|--------|---------|
| Phase 1 | src/gateway/ (协议层) | 472 | WebSocket JSON-RPC 协议、客户端通信、设备签名 |
| Phase 2 | src/gateway/ (服务端) | (同上) | HTTP REST API、RPC 方法、角色权限、客户端行为差异 |
| Phase 3 | src/channels/ + src/auto-reply/ + src/plugin-sdk/ (Channel 部分) | 238+395+338 | Channel 接口契约、MsgContext/ReplyPayload、插件注册 |
| Phase 4 | src/agents/ + src/context-engine/ | 1172+7 | Agent 运行时、模型接入、工具/Skills/MCP、记忆、会话 |

### 未覆盖的核心模块（~2,700+ 文件）

```
                    OpenClaw 完整架构图
                    
    ┌───────────────────────────────────────────────────────────────┐
    │                    已覆盖 (Phase 1-4)                         │
    │                                                               │
    │  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐ │
    │  │ Gateway   │  │ Channels  │  │ Agents    │  │ Auto-Reply │ │
    │  │ 协议+服务 │  │ 渠道插件  │  │ 推理引擎  │  │ 回复分发   │ │
    │  │ (472)     │  │ (238)     │  │ (1172)    │  │ (395)      │ │
    │  └──────────┘  └───────────┘  └───────────┘  └────────────┘ │
    │  ┌──────────┐  ┌───────────┐                                 │
    │  │ Plugin SDK│  │ Context   │                                 │
    │  │ (338)     │  │ Engine (7)│                                 │
    │  └──────────┘  └───────────┘                                 │
    └───────────────────────────────────────────────────────────────┘
    
    ┌───────────────────────────────────────────────────────────────┐
    │                    ★ 未覆盖核心模块 ★                         │
    │                                                               │
    │  A. 基础设施层                                                │
    │  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐ │
    │  │ Infra    │  │ Config    │  │ Secrets   │  │ Security   │ │
    │  │ 基础设施  │  │ 配置系统  │  │ 密钥管理  │  │ 安全审计   │ │
    │  │ (586)     │  │ (298)     │  │ (65)      │  │ (36)       │ │
    │  └──────────┘  └───────────┘  └───────────┘  └────────────┘ │
    │                                                               │
    │  B. 插件运行时                                                │
    │  ┌──────────┐  ┌───────────┐                                 │
    │  │ Plugins  │  │ Extensions│                                 │
    │  │ 插件注册  │  │ 104 扩展  │                                 │
    │  │ (345)     │  │ (~3000+)  │                                 │
    │  └──────────┘  └───────────┘                                 │
    │                                                               │
    │  C. CLI + TUI + Daemon 层                                    │
    │  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐ │
    │  │ CLI      │  │ Commands  │  │ Daemon    │  │ TUI        │ │
    │  │ 命令行框架│  │ 命令实现  │  │ 守护进程  │  │ 终端 UI    │ │
    │  │ (313)     │  │ (469)     │  │ (58)      │  │ (52)       │ │
    │  └──────────┘  └───────────┘  └───────────┘  └────────────┘ │
    │                                                               │
    │  D. 定时任务 + 进程管理                                       │
    │  ┌──────────┐  ┌───────────┐  ┌───────────┐                 │
    │  │ Cron     │  │ Tasks     │  │ Process   │                 │
    │  │ 定时任务  │  │ 任务流   │  │ 进程管理   │                 │
    │  │ (135)     │  │ (44)      │  │ (29)      │                 │
    │  └──────────┘  └───────────┘  └───────────┘                 │
    │                                                               │
    │  E. 协议 + 通信                                              │
    │  ┌──────────┐  ┌───────────┐  ┌───────────┐                 │
    │  │ ACP      │  │ MCP Server│  │ Hooks     │                 │
    │  │ Agent通信 │  │ MCP集成   │  │ 钩子系统  │                 │
    │  │ (58)      │  │ (7)       │  │ (52)      │                 │
    │  └──────────┘  └───────────┘  └───────────┘                 │
    │                                                               │
    │  F. 多媒体子系统                                              │
    │  ┌──────────┐  ┌───────────┐  ┌────────────┐ ┌────────────┐│
    │  │ Media    │  │ Media-    │  │ TTS/Voice  │ │ Image/Video││
    │  │ 媒体基础  │  │ Understand│  │ 语音合成   │ │ 图片/视频  ││
    │  │ (57)      │  │ (56)      │  │ (19)       │ │ (25)       ││
    │  └──────────┘  └───────────┘  └────────────┘ └────────────┘│
    │                                                               │
    │  G. 记忆增强                                                  │
    │  ┌──────────┐  ┌───────────┐                                 │
    │  │Memory SDK│  │ 53 Skills │                                 │
    │  │ 向量记忆  │  │ 技能包   │                                 │
    │  │ (88)      │  │ (~500+)   │                                 │
    │  └──────────┘  └───────────┘                                 │
    │                                                               │
    │  H. 其他                                                      │
    │  ┌──────────┐  ┌───────────┐  ┌───────────┐ ┌─────────────┐│
    │  │ Routing  │  │ Flows     │  │ Logging   │ │ Shared/Types││
    │  │ 消息路由  │  │ 引导流程  │  │ 日志系统  │ │ 共享工具    ││
    │  │ (11)      │  │ (11)      │  │ (33)      │ │ (131)       ││
    │  └──────────┘  └───────────┘  └───────────┘ └─────────────┘│
    └───────────────────────────────────────────────────────────────┘
    
    ┌───────────────────────────────────────────────────────────────┐
    │  独立组件                                                     │
    │  ┌──────────┐  ┌───────────┐  ┌───────────┐                 │
    │  │ Swabble  │  │ packages/ │  │ Vendor    │                 │
    │  │语音唤醒   │  │ 独立包    │  │ 第三方    │                 │
    │  │ (Swift)   │  │ (4个)     │  │           │                 │
    │  └──────────┘  └───────────┘  └───────────┘                 │
    └───────────────────────────────────────────────────────────────┘
```

---

## 二、遗漏模块详细分析

### ★ 模块 A：基础设施层 — src/infra/ (586 文件) — 最大遗漏

这是整个系统的**最大未覆盖模块**，提供了所有其他模块赖以运行的底层能力。

#### A.1 命令执行引擎（~80 文件）

```
exec-host.ts           — Shell 命令执行宿主
exec-safety.ts         — 命令安全检查
exec-command-resolution.ts — 命令路径解析
exec-inline-eval.ts    — 内联脚本执行
exec-wrapper-resolution.ts — 执行包装器解析
exec-wrapper-trust-plan.ts — 信任链规划
exec-safe-bin-policy.ts    — 安全二进制策略
exec-safe-bin-semantics.ts — 语义安全分析
exec-safe-bin-runtime-policy.ts — 运行时策略
exec-allowlist-pattern.ts  — 白名单模式匹配
exec-approvals.ts          — 执行审批核心
exec-approval-forwarder.ts — 审批转发到渠道
exec-approval-surface.ts   — 审批 UI 呈现
```

**架构意义**: Agent 执行任何 Shell 命令都经过此层。包含安全审计、白名单、审批链路。是"AI 安全执行"的核心。

#### A.2 Heartbeat 系统（~30 文件）

```
heartbeat-runner.ts         — 心跳调度器核心
heartbeat-events.ts         — 心跳事件
heartbeat-events-filter.ts  — 事件过滤
heartbeat-active-hours.ts   — 活跃时段计算
heartbeat-visibility.ts     — 可见性控制
heartbeat-reason.ts         — 触发原因分类
heartbeat-summary.ts        — 摘要生成
heartbeat-wake.ts           — 唤醒机制
```

**架构意义**: OpenClaw 的**主动 AI** 能力。Agent 不仅被动回复，还能基于心跳系统主动推送消息、检查状态、执行定时任务。

#### A.3 设备管理（~30 文件）

```
device-identity.ts     — 设备唯一身份
device-auth-store.ts   — 设备认证存储
device-bootstrap.ts    — 设备初始化引导
device-pairing.ts      — 设备配对逻辑
node-pairing.ts        — 节点配对
node-pairing-authz.ts  — 配对授权
node-commands.ts       — 节点命令
node-shell.ts          — 远程 Shell
```

#### A.4 服务发现（~15 文件）

```
bonjour.ts               — mDNS/Bonjour 发布
bonjour-ciao.ts          — Ciao 库集成
bonjour-discovery.ts     — 服务发现
bonjour-errors.ts        — 错误处理
widearea-dns.ts          — 广域 DNS 发现
network-interfaces.ts    — 网络接口枚举
network-discovery-display.ts — 发现结果展示
tailnet.ts               — Tailscale 网络
tailscale.ts             — Tailscale 集成
```

#### A.5 自动更新系统（~20 文件）

```
update-check.ts            — 更新检查
update-channels.ts         — 更新渠道（stable/beta/canary）
update-global.ts           — 全局更新
update-runner.ts           — 更新执行
update-startup.ts          — 启动时更新检查
update-package-manager.ts  — 包管理器更新
install-flow.ts            — 安装流程
install-target.ts          — 安装目标
install-safe-path.ts       — 安全路径
npm-pack-install.ts        — NPM 包安装
```

#### A.6 Provider 用量追踪（~25 文件）

```
provider-usage.ts               — 用量追踪核心
provider-usage.auth.ts          — 认证相关用量
provider-usage.fetch.claude.ts  — Claude API 用量
provider-usage.fetch.codex.ts   — Codex 用量
provider-usage.fetch.gemini.ts  — Gemini 用量
provider-usage.fetch.minimax.ts — MiniMax 用量
provider-usage.fetch.zai.ts     — Z.ai 用量
provider-usage.format.ts        — 用量格式化
provider-usage.load.ts          — 用量加载
session-cost-usage.ts           — 会话成本计算
```

**架构意义**: API 用量监控和成本追踪。支持多 Provider 的独立计量。

#### A.7 APNs 推送（~5 文件）

```
push-apns.ts           — Apple Push Notification 核心
push-apns.relay.ts     — 推送中继
push-apns.auth.test.ts — 认证测试
```

#### A.8 其他基础能力

```
state-migrations.ts    — 数据迁移（版本升级时的状态转换）
ssh-tunnel.ts          — SSH 隧道
scp-host.ts            — SCP 文件传输
process-respawn.ts     — 进程重生
restart-sentinel.ts    — 重启哨兵
restart.ts             — 重启逻辑
supervisor-markers.ts  — 进程监控标记
host-env-security.ts   — 宿主环境安全策略
path-safety.ts / path-guards.ts — 路径安全
tls/                   — TLS 证书管理
net/                   — 网络工具
```

---

### ★ 模块 B：插件运行时 — src/plugins/ (345 文件)

Phase 3 只覆盖了 **Channel 插件**的接口规范。但 OpenClaw 的插件系统远不止 Channel：

```
插件类型总览：
  │
  ├── Channel Plugin     — 消息渠道（Phase 3 已覆盖）
  ├── Provider Plugin    — LLM Provider（如 Anthropic/OpenAI/Google）★ 未覆盖
  ├── Web Search Plugin  — 搜索引擎（如 Brave/DuckDuckGo）      ★ 未覆盖
  ├── TTS Plugin         — 文本转语音（如 ElevenLabs/DeepGram）  ★ 未覆盖
  ├── Memory Plugin      — 记忆引擎（如 LanceDB）               ★ 未覆盖
  ├── Image Gen Plugin   — 图片生成（如 FAL/ComfyUI）           ★ 未覆盖
  ├── Video Gen Plugin   — 视频生成                              ★ 未覆盖
  └── Music Gen Plugin   — 音乐生成                              ★ 未覆盖
```

#### B.1 Plugin Runtime（插件运行时）

```
src/plugins/runtime/
  ├── index.ts                  — 插件运行时入口
  ├── runtime-registry-loader.ts — 注册表加载器
  ├── runtime-plugin-boundary.ts — 插件边界隔离
  ├── runtime-agent.ts          — Agent 能力注入
  ├── runtime-channel.ts        — Channel 能力注入
  ├── runtime-config.ts         — 配置能力注入
  ├── runtime-events.ts         — 事件系统
  ├── runtime-logging.ts        — 日志系统
  ├── runtime-media.ts          — 媒体能力
  ├── runtime-model-auth.runtime.ts — 模型认证
  ├── runtime-taskflow.ts       — 任务流能力
  ├── runtime-tasks.ts          — 任务管理
  ├── runtime-system.ts         — 系统级能力
  ├── runtime-web-channel-plugin.ts — Web Channel
  ├── gateway-request-scope.ts  — Gateway 请求范围
  ├── types-core.ts             — 核心类型
  ├── types-channel.ts          — Channel 类型
  └── types.ts                  — 通用类型
```

**架构意义**: Plugin Runtime 是所有 104 个 Extension 的运行环境。它决定了 Extension 能访问哪些能力、如何与主系统交互。

#### B.2 Plugin Contracts（插件契约测试 ~80 文件）

```
src/plugins/contracts/
  ├── plugin-registration.*.contract.test.ts  — 各 Provider 注册契约
  ├── provider.*.contract.test.ts             — Provider 运行时契约
  ├── web-search-provider.*.contract.test.ts  — 搜索提供者契约
  ├── tts.*.contract.test.ts                  — TTS 契约
  ├── memory-embedding-provider.contract.test.ts — 记忆嵌入契约
  └── ...
```

#### B.3 Extensions（104 个扩展）

```
extensions/ 目录包含 104 个扩展，按类型分：

Provider 扩展 (~25 个):
  anthropic, openai, google, deepseek, mistral, groq, ollama,
  qwen, kimi-coding, moonshot, qianfan, volcengine, xai,
  amazon-bedrock, anthropic-vertex, nvidia, huggingface,
  fireworks, together, sglang, vllm, openrouter, litellm,
  vercel-ai-gateway, cloudflare-ai-gateway, copilot-proxy...

Channel 扩展 (~20 个):
  telegram, whatsapp, discord, slack, signal, mattermost,
  irc, msteams, googlechat, line, feishu, qqbot, nostr,
  matrix, twitch, nextcloud-talk, synology-chat, zalo...

媒体生成扩展:
  image-generation-core, media-understanding-core,
  video-generation-core, speech-core, fal, comfy, runway,
  elevenlabs, deepgram...

搜索扩展:
  brave, duckduckgo, exa, tavily, firecrawl, searxng, perplexity...

记忆扩展:
  memory-core, memory-lancedb, memory-wiki

其他:
  device-pair, diagnostics-otel, diffs, llm-task, thread-ownership,
  qa-lab, qa-channel, shared, talk-voice, voice-call...
```

---

### ★ 模块 C：配置系统 — src/config/ (298 文件)

这是一个**非常复杂**的配置系统，Phase 4 仅在 Agent 上下文中简略提及。

```
配置系统架构：
  │
  ├── Schema 层
  │   ├── schema.ts / schema-base.ts        — JSON Schema 定义
  │   ├── zod-schema.ts                     — Zod 运行时验证
  │   ├── zod-schema.providers-core.ts      — Provider 配置 Schema
  │   ├── zod-schema.channels.ts            — Channel 配置 Schema
  │   ├── zod-schema.agents.ts              — Agent 配置 Schema
  │   ├── zod-schema.hooks.ts               — Hooks 配置 Schema
  │   └── ... (30+ zod-schema.*.ts)
  │
  ├── I/O 层
  │   ├── io.ts                             — 读写配置文件
  │   ├── includes.ts                       — 配置 includes (拆分配置)
  │   ├── merge-patch.ts                    — RFC 7396 合并补丁
  │   ├── mutate.ts                         — 配置修改
  │   └── env-substitution.ts              — 环境变量替换
  │
  ├── 类型层 (80+ 文件)
  │   ├── types.ts                          — 主类型
  │   ├── types.agents.ts                   — Agent 配置类型
  │   ├── types.channels.ts                 — Channel 配置类型
  │   ├── types.gateway.ts                  — Gateway 配置类型
  │   ├── types.providers-request.ts        — Provider 请求类型
  │   ├── types.models.ts                   — 模型配置类型
  │   └── ... (30+ types.*.ts)
  │
  ├── 运行时层
  │   ├── runtime-schema.ts                 — 运行时 Schema 验证
  │   ├── runtime-snapshot.ts               — 配置快照
  │   ├── runtime-overrides.ts              — 运行时覆盖
  │   ├── runtime-group-policy.ts           — 群组策略运行时
  │   └── redact-snapshot.ts               — 配置脱敏快照
  │
  ├── 插件自动启用
  │   ├── plugin-auto-enable.ts             — 自动检测和启用插件
  │   ├── plugin-auto-enable.detect.ts      — 检测逻辑
  │   ├── plugin-auto-enable.apply.ts       — 应用逻辑
  │   └── plugin-auto-enable.prefer-over.ts — 优先级逻辑
  │
  └── 迁移
      ├── legacy.ts                          — 旧版配置迁移
      └── legacy.rules.ts                   — 迁移规则
```

**架构意义**: 所有功能模块的配置入口。支持 YAML + JSON、includes 拆分、环境变量替换、Zod 验证、自动迁移。

---

### ★ 模块 D：CLI + 命令 + TUI — src/cli/(313) + src/commands/(469) + src/tui/(52)

```
CLI 架构：
  │
  ├── src/cli/ — CLI 框架
  │   ├── argv.ts              — 命令行参数解析
  │   ├── banner.ts            — 启动横幅
  │   ├── cli-name.ts          — CLI 名称
  │   ├── command-options.ts   — 命令选项
  │   ├── channel-auth.ts      — 渠道认证
  │   ├── channel-options.ts   — 渠道选项
  │   ├── channels-cli.ts      — 渠道命令组
  │   └── clawbot-cli.ts       — 主 CLI 入口
  │
  ├── src/commands/ — 命令实现（469 文件）
  │   ├── agent/               — Agent 相关命令
  │   ├── channel-setup/       — 渠道设置
  │   ├── channels/            — 渠道管理
  │   ├── doctor/              — 诊断修复
  │   ├── gateway-status/      — Gateway 状态
  │   ├── models/              — 模型管理
  │   ├── setup/               — 初始化设置
  │   ├── onboard-non-interactive/ — 非交互式引导
  │   └── status-all/          — 全局状态
  │
  └── src/tui/ — 终端 UI
      ├── commands.ts           — TUI 命令
      ├── gateway-chat.ts       — Gateway 聊天界面
      ├── tui-command-handlers.ts — 命令处理器
      ├── tui-event-handlers.ts — 事件处理器
      ├── tui-formatters.ts     — 格式化
      ├── tui-input-history.ts  — 输入历史
      ├── components/           — UI 组件
      └── theme/                — 主题
```

---

### ★ 模块 E：守护进程 — src/daemon/ (58 文件)

```
跨平台守护进程管理：
  │
  ├── macOS
  │   ├── launchd.ts             — launchd plist 管理
  │   ├── launchd-plist.ts       — plist 生成
  │   └── launchd-restart-handoff.ts — 重启移交
  │
  ├── Linux
  │   ├── systemd.ts             — systemd unit 管理
  │   ├── systemd-unit.ts        — unit 文件生成
  │   ├── systemd-hints.ts       — 提示
  │   └── systemd-linger.ts      — linger 模式
  │
  ├── Windows
  │   ├── schtasks.ts            — 计划任务
  │   └── schtasks-exec.ts       — 执行
  │
  └── 通用
      ├── service.ts             — 跨平台服务抽象
      ├── service-audit.ts       — 服务审计
      ├── service-env.ts         — 服务环境
      ├── runtime-binary.ts      — 运行时二进制
      ├── container-context.ts   — 容器检测
      └── diagnostics.ts         — 诊断
```

**架构意义**: OpenClaw 可作为系统服务持续运行。此模块处理跨 macOS/Linux/Windows 的服务生命周期。

---

### ★ 模块 F：定时任务 — src/cron/ (135 文件)

```
Cron 系统架构：
  │
  ├── 核心调度
  │   ├── active-jobs.ts         — 活跃任务管理
  │   ├── delivery-plan.ts       — 投递计划
  │   ├── delivery.ts            — 投递执行
  │   └── heartbeat-policy.ts    — 心跳策略
  │
  └── 隔离执行
      └── isolated-agent/        — 每个 Cron 任务在隔离 Agent 中执行
          ├── delivery-awareness — 感知投递目标
          ├── lane              — 并发控制
          ├── hook-content-wrapping — Hook 内容包装
          └── auth-profile-propagation — 认证传播
```

---

### ★ 模块 G：密钥管理 — src/secrets/ (65 文件)

```
密钥系统架构：
  │
  ├── 核心
  │   ├── resolve.ts             — 密钥解析
  │   ├── apply.ts               — 密钥应用
  │   ├── plan.ts                — 配置计划
  │   ├── configure.ts           — 交互式配置
  │   └── audit.ts               — 密钥审计
  │
  ├── SecretRef 机制
  │   ├── ref-contract.ts        — SecretRef 契约
  │   ├── resolve-secret-input-string.ts — 输入解析
  │   ├── json-pointer.ts        — JSON Pointer 定位
  │   └── secret-value.ts        — 密钥值类型
  │
  ├── 运行时收集器
  │   ├── runtime-config-collectors-core.ts    — 核心配置
  │   ├── runtime-config-collectors-channels.ts — 渠道密钥
  │   ├── runtime-config-collectors-plugins.ts  — 插件密钥
  │   ├── runtime-config-collectors-tts.ts      — TTS 密钥
  │   ├── runtime-auth-collectors.ts           — 认证密钥
  │   └── runtime-gateway-auth-surfaces.ts     — Gateway 认证
  │
  └── 目标注册
      ├── target-registry.ts     — 密钥目标注册
      ├── target-registry-data.ts — 目标数据
      └── target-registry-pattern.ts — 模式匹配
```

**架构意义**: 所有 API Key、Token、密码的统一管理。支持 SecretRef 引用（配置中不存明文）、运行时解析、审计。

---

### ★ 模块 H：ACP（Agent Communication Protocol）— src/acp/ (58 文件)

```
ACP 架构：
  │
  ├── server.ts              — ACP 服务端
  ├── client.ts              — ACP 客户端
  ├── translator.ts          — 协议翻译器
  ├── session.ts             — ACP 会话
  ├── session-mapper.ts      — 会话映射
  ├── event-mapper.ts        — 事件映射
  ├── policy.ts              — 访问策略
  ├── approval-classifier.ts — 审批分类
  ├── persistent-bindings.*.ts — 持久绑定
  │
  └── control-plane/         — ACP 控制面
      └── ...
```

**架构意义**: ACP 是 OpenClaw 暴露给**外部 Agent 协议**（如 Anthropic MCP、OpenAI Agents API）的标准接口。允许其他 AI 系统与 OpenClaw Agent 通信。

---

### ★ 模块 I：Memory Host SDK — src/memory-host-sdk/ (88 文件)

Phase 4 提到了记忆系统的基础层（MEMORY.md + Context Engine），但 Memory Host SDK 是**高级记忆系统**：

```
记忆宿主 SDK：
  │
  ├── engine.ts              — 记忆引擎核心
  ├── engine-embeddings.ts   — 向量嵌入
  ├── engine-storage.ts      — 持久存储
  ├── engine-foundation.ts   — 基础框架
  ├── engine-qmd.ts          — QMD 格式
  ├── dreaming.ts            — ★ "做梦"机制（离线知识整合）
  ├── multimodal.ts          — 多模态记忆
  ├── query.ts               — 查询接口
  ├── events.ts              — 事件
  ├── runtime.ts             — 运行时
  ├── runtime-core.ts        — 核心运行时
  ├── runtime-files.ts       — 文件操作
  ├── runtime-cli.ts         — CLI 集成
  ├── secret.ts              — 密钥管理
  ├── status.ts              — 状态
  └── host/                  — 宿主接口
```

**架构意义**: 支持向量检索、"做梦"（离线整合知识）、多模态记忆。是 OpenClaw 超越简单文件记忆的高级能力。

---

### ★ 模块 J：安全审计 — src/security/ (36 文件)

```
安全审计系统：
  │
  ├── audit.ts                — 审计主入口
  ├── audit-channel.*.ts      — 渠道审计
  ├── audit-tool-policy.ts    — 工具策略审计
  ├── audit-extra.*.ts        — 扩展审计
  ├── audit-fs.ts             — 文件系统审计
  ├── dangerous-tools.ts      — 危险工具检测
  ├── dangerous-config-flags.ts — 危险配置标志
  ├── dm-policy-shared.ts     — DM 策略
  ├── external-content.ts     — 外部内容安全
  ├── fix.ts                  — 自动修复
  ├── safe-regex.ts           — 安全正则
  ├── skill-scanner.ts        — 技能安全扫描
  └── context-visibility.ts   — 上下文可见性
```

---

### ★ 模块 K：独立组件

#### K.1 Swabble（Swift 语音唤醒引擎）

```
openclaw/Swabble/
  ├── Package.swift          — Swift Package
  ├── Sources/               — 源码
  └── Tests/                 — 测试
```

macOS/iOS 的本地语音唤醒引擎。

#### K.2 独立 packages

```
openclaw/packages/
  ├── clawdbot/              — Clawdbot 独立包
  ├── memory-host-sdk/       — 记忆 SDK 独立发布包
  ├── moltbot/               — Moltbot
  └── plugin-package-contract/ — 插件包契约
```

#### K.3 Skills（53 个技能包）

```
openclaw/skills/
  ├── 1password, apple-notes, apple-reminders
  ├── bear-notes, blogwatcher, blucli, bluebubbles
  ├── camsnap, canvas, clawhub, coding-agent
  ├── discord, gemini, gh-issues, gifgrep, github
  ├── healthcheck, ...
  └── (共 53 个)
```

**架构意义**: Skills 是通过 SKILL.md 声明的"技能包"，可以为 Agent 注入特定领域能力（如操作 GitHub、管理 Apple Notes）。

---

## 三、遗漏严重程度评估

| 优先级 | 模块 | 文件数 | 遗漏原因 | 对二次开发的影响 |
|--------|------|--------|---------|----------------|
| **P0** | 插件运行时 (plugins/) | 345 | Phase 3 仅覆盖 Channel 插件 | **想写 Provider/搜索/TTS 插件必须理解** |
| **P0** | 配置系统 (config/) | 298 | 未专门分析 | **所有功能的配置入口，二次开发必须理解** |
| **P0** | 基础设施层 (infra/) | 586 | 太庞大 | 命令执行安全、心跳、更新等核心能力 |
| **P1** | CLI/Commands/TUI | 834 | 用户交互层 | 想扩展 CLI 命令需要理解 |
| **P1** | 密钥管理 (secrets/) | 65 | 未专门分析 | API Key 管理和 SecretRef 机制 |
| **P1** | ACP (acp/) | 58 | 未专门分析 | 外部 Agent 系统接入 |
| **P2** | 定时任务 (cron/) | 135 | 未专门分析 | 定时执行能力 |
| **P2** | 守护进程 (daemon/) | 58 | 未专门分析 | 系统服务部署 |
| **P2** | Memory Host SDK | 88 | Phase 4 仅覆盖基础层 | 高级向量记忆能力 |
| **P2** | 安全审计 (security/) | 36 | 未专门分析 | 安全策略扩展 |
| **P3** | 多媒体子系统 | ~150 | 未专门分析 | 图片/视频/语音能力 |
| **P3** | 进程管理 (process/) | 29 | Phase 4 简略提及 | 并发控制 |
| **P3** | Skills (53个) | ~500+ | 未专门分析 | 技能包开发 |

---

## 四、建议补充的架构文档

### Phase 5：插件运行时 + 配置系统（建议优先级最高）

覆盖 `src/plugins/` + `src/config/` + 各类 Extension 的通用开发模式。

核心内容：
- Plugin Runtime 如何加载、注册、初始化插件
- Provider Plugin 接口（如何接入新的 LLM）
- 配置 Schema 体系（Zod + JSON Schema）
- 配置读写流程（IO + 环境变量替换 + includes）
- Plugin 自动启用机制
- Extension 目录结构规范

### Phase 6：基础设施层 + 密钥管理

覆盖 `src/infra/` + `src/secrets/` + `src/security/`。

核心内容：
- 命令执行安全引擎（exec-*）
- Heartbeat 主动 AI 系统
- 设备管理与配对
- 服务发现（Bonjour/mDNS）
- 自动更新系统
- Provider 用量追踪
- SecretRef 机制
- 安全审计框架

### Phase 7（可选）：CLI/Daemon/Cron/ACP

覆盖 `src/cli/` + `src/commands/` + `src/daemon/` + `src/cron/` + `src/acp/`。

核心内容：
- CLI 命令框架和扩展方式
- TUI 终端界面
- 跨平台守护进程（launchd/systemd/schtasks）
- Cron 定时任务系统
- ACP 外部 Agent 通信协议
