# Phase 4: Agent Runtime 内部架构深度分析

## 一、Agent 整体架构概览

Agent Runtime 是 OpenClaw 系统的"大脑"，由约 **300+ TypeScript 源文件**组成，构建在 Pi Agent 框架之上。

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Runtime 架构                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 入口层: agentCommand() / agentCommandFromIngress()       │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │ 准备层: prepareAgentCommandExecution()                    │  │
│  │  ├── Config 解析 + SecretRef 解析                         │  │
│  │  ├── Session 解析 (resolveSession)                        │  │
│  │  ├── Model 选择 (resolveConfiguredModelRef)               │  │
│  │  ├── Thinking Level 解析                                  │  │
│  │  └── Workspace 解析                                       │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │ 执行层: runAgentAttempt() → runEmbeddedPiAgent()          │  │
│  │  ├── Auth Profile 选择 + API Key 轮转                     │  │
│  │  ├── System Prompt 组装                                   │  │
│  │  ├── Tools 装配 (57 内置 + MCP + Skills + Plugin)         │  │
│  │  ├── Pi SDK Agent 循环 (LLM call ↔ Tool call)            │  │
│  │  ├── Model Fallback (失败 → 切换候选模型)                 │  │
│  │  └── Compaction (上下文压缩)                              │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │ 输出层: deliverAgentCommandResult()                       │  │
│  │  ├── 流式事件广播 (WebSocket event)                       │  │
│  │  ├── ReplyPayload → Channel 投递                          │  │
│  │  └── Session Transcript 持久化                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 持久层                                                    │  │
│  │  ├── Session Store (JSON)       ── 会话索引               │  │
│  │  ├── Session Transcript (JSONL) ── 对话历史               │  │
│  │  ├── MEMORY.md                  ── 文件级记忆             │  │
│  │  ├── Auth Profile Store         ── API Key 状态           │  │
│  │  └── Context Engine             ── 可插拔上下文引擎       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、模块 1：底层 Agent 技术框架

### 2.1 核心依赖

**源码**: `package.json:1206-1208`

```json
"@mariozechner/pi-agent-core": "0.65.0",
"@mariozechner/pi-ai": "0.65.0",
"@mariozechner/pi-coding-agent": "0.65.0"
```

**Pi 框架**（作者 Mario Zechner）是底层 SDK，提供三层抽象：

| 包名 | 提供什么 | OpenClaw 如何使用 |
|------|---------|------------------|
| `pi-agent-core` | `AgentTool`, `AgentToolResult`, `StreamFn`, `AgentMessage` | 工具定义、流式调用抽象、消息类型 |
| `pi-ai` | `Api`, `Model`, `Context`, `complete()`, `streamAnthropic()` | 模型抽象、LLM API 调用 |
| `pi-coding-agent` | `SessionManager`, `codingTools`, `createAgentSession`, `estimateTokens`, `generateSummary` | 会话管理、内置编码工具、token 估算、摘要生成 |

### 2.2 Pi 框架与 OpenClaw 的关系

```
Pi SDK (底层 SDK, ~3 个包)
  │
  │  提供基础能力：
  │  - AgentTool 接口定义
  │  - StreamFn 流式调用抽象
  │  - SessionManager 会话管理
  │  - codingTools 基础文件工具
  │  - estimateTokens / generateSummary
  │
  ▼
OpenClaw Agent 层 (产品层, ~300+ 文件)
  │
  │  在 Pi 之上构建：
  │  - 57 个内置工具 (bash/message/image/canvas/cron/...)
  │  - 多 Provider 适配 (Anthropic/OpenAI/Google/Bedrock/...)
  │  - Auth Profile 多 Key 轮转
  │  - Model Fallback 多模型候选
  │  - System Prompt 组装引擎
  │  - MCP 工具协议
  │  - Skills 技能系统
  │  - Exec Approval 审批系统
  │  - Sandbox 沙箱隔离
  │  - Subagent 子 Agent 系统
  │  - 流式输出管道
  │  - ...
```

### 2.3 执行入口链路

**源码**: `src/agents/agent-command.ts:963-1005`

```
两个入口，分别用于不同的信任级别：

agentCommand(opts)                   ← CLI/本地，默认 senderIsOwner=true
  └─→ agentCommandInternal()

agentCommandFromIngress(opts)        ← Gateway/HTTP，必须显式声明
  ├── if (!opts.senderIsOwner) throw  ← 强制要求显式声明信任级别
  └─→ agentCommandInternal()
```

`agentCommandInternal` 的完整链路：

```
agentCommandInternal()
  │
  ├── 1. prepareAgentCommandExecution()
  │     ├── loadConfig()                   — 加载配置
  │     ├── resolveCommandSecretRefsViaGateway()  — 解析密钥引用
  │     ├── resolveConfiguredModelRef()    — 确定 provider/model
  │     ├── normalizeThinkLevel()          — 解析思考级别
  │     └── resolveAgentTimeoutMs()        — 解析超时
  │
  ├── 2. resolveSession()
  │     ├── 通过 sessionKey / sessionId / to 定位会话
  │     ├── 必要时创建新会话
  │     └── 返回 SessionResolution { sessionId, sessionKey, entry }
  │
  ├── 3. runAgentAttempt()
  │     ├── buildWorkspaceSkillSnapshot()  — 快照当前 Skills
  │     └── runEmbeddedPiAgent(params)     — Pi SDK Agent 主循环
  │
  ├── 4. deliverAgentCommandResult()
  │     ├── 广播 agent event
  │     └── 投递到 Channel
  │
  └── 5. updateSessionStoreAfterAgentRun()
        └── 持久化会话状态
```

---

## 三、模块 2：大模型接入

### 3.1 模型接入架构

**源码**: `src/agents/model-selection.ts`, `src/agents/provider-stream.ts`, `src/agents/pi-embedded-runner/`

```
                    Config 配置
                    agents.model: "anthropic/sonnet-4.6"
                         │
                         ▼
               resolveConfiguredModelRef()
               ├── 解析 "provider/model" 格式
               ├── 处理别名 (aliases)
               └── 应用 per-session 覆盖
                         │
                         ▼
                    ModelRef { provider: "anthropic", model: "sonnet-4.6" }
                         │
                         ▼
          ┌──────────────┴──────────────┐
          │   Plugin Provider Registry   │
          │                              │
          │  每个 Provider Plugin 注册:  │
          │  - Model Catalog (模型列表)  │
          │  - StreamFn (流式调用函数)   │
          │  - Auth 方法                 │
          │  - Transport Override        │
          └──────────────┬──────────────┘
                         │
                         ▼
              registerProviderStreamForModel()
              ├── resolveProviderStreamFn()   — Plugin 提供的流
              └── ensureCustomApiRegistered() — 注册到 Pi SDK
                         │
                         ▼
              Pi SDK Model<Api> → 统一 LLM 调用接口
```

### 3.2 支持的传输层协议

**源码**: `src/agents/pi-embedded-runner/` 目录下的 stream-wrapper 文件

| 传输层 | 源文件 | 支持的 Provider |
|--------|--------|----------------|
| Anthropic Messages API | `anthropic-transport-stream.ts` | Anthropic |
| Anthropic via Vertex | `anthropic-vertex-stream.ts` | Google Vertex AI |
| Google Gemini API | `google-transport-stream.ts`, `google-stream-wrappers.ts` | Google |
| OpenAI Chat Completions | (通过 Pi SDK 内置) | OpenAI, Groq, Mistral, ... |
| OpenAI WebSocket (Realtime) | `openai-ws-request.ts` | OpenAI Realtime |
| AWS Bedrock | `bedrock-stream-wrappers.ts` | AWS Bedrock |
| Z.ai | `zai-stream-wrappers.ts` | Z.ai |
| 自定义代理 | `proxy-stream-wrappers.ts` | 任何兼容的代理 |
| Ollama 兼容 | `plugin-sdk/ollama-runtime.ts` | Ollama, LM Studio, ... |

### 3.3 默认值

**源码**: `src/agents/defaults.ts`

```typescript
export const DEFAULT_PROVIDER = "openai";
export const DEFAULT_MODEL = "gpt-5.4";
export const DEFAULT_CONTEXT_TOKENS = 200_000;
```

### 3.4 Auth Profile — 多 Key 轮转

**源码**: `src/agents/auth-profiles.ts`, `src/agents/auth-profiles/`

```
Auth Profile 系统支持：
  │
  ├── 多 API Key 配置
  │   providers:
  │     anthropic:
  │       apiKeys: [key1, key2, key3]
  │
  ├── 自动轮转
  │   key1 rate-limited → 自动切换 key2
  │   key2 auth error → 标记冷却 → 切换 key3
  │
  ├── 冷却机制
  │   markAuthProfileFailure() → 计算冷却时间
  │   isProfileInCooldown() → 检查是否在冷却中
  │   getSoonestCooldownExpiry() → 何时恢复
  │
  └── OAuth 支持
      auth-profiles/oauth.ts → OpenAI/Codex OAuth 刷新
```

### 3.5 Model Fallback — 多模型候选

**源码**: `src/agents/model-fallback.ts`

```
主模型: anthropic/sonnet-4.6
  │ 失败 (rate-limit / auth / context-overflow)
  ▼
Fallback 候选队列:
  ├── anthropic/haiku-4.5    ← 轻量替代
  ├── openai/gpt-5.4         ← 跨 Provider 切换
  └── openrouter/...          ← 聚合路由兜底

决策逻辑 (resolveRunFailoverDecision):
  - rate-limit → 换同 Provider 不同 Key → 换不同模型
  - auth error → 换 Key → 换 Provider
  - context overflow → 换大上下文模型 或 触发 compaction
  - timeout → 直接重试 或 换模型
```

---

## 四、模块 3：Tools / Skills / MCP

### 4.1 工具系统总览

**源码**: `src/agents/pi-tools.ts`, `src/agents/tools/`（57 个文件）

```
五种工具来源
  │
  ├── 1. Pi SDK 内置工具 (codingTools)
  │     src/agents/pi-tools.ts:1
  │     import { codingTools, createReadTool, readTool } from "@mariozechner/pi-coding-agent"
  │     → 基础文件读写能力
  │
  ├── 2. OpenClaw 内置工具 (57 个文件)
  │     src/agents/tools/
  │     ├── bash-tools.exec.ts      — Shell 命令执行
  │     ├── bash-tools.process.ts   — 后台进程管理
  │     ├── message-tool.ts         — 消息发送
  │     ├── image-tool.ts           — 图片理解/生成
  │     ├── pdf-tool.ts             — PDF 处理
  │     ├── canvas-tool.ts          — 画布操作（截屏等）
  │     ├── cron-tool.ts            — 定时任务
  │     ├── nodes-tool.ts           — 远程节点操作
  │     ├── sessions-*.ts           — 会话管理工具
  │     ├── agents-list-tool.ts     — Agent 列表
  │     ├── gateway-tool.ts         — Gateway 交互
  │     └── ...
  │
  ├── 3. MCP 工具 (Model Context Protocol)
  │     src/agents/pi-bundle-mcp-tools.ts
  │     ├── createSessionMcpRuntime()          — 创建 MCP 会话运行时
  │     ├── getOrCreateSessionMcpRuntime()     — 获取/创建
  │     └── materializeBundleMcpToolsForRun()  — 物化 MCP 工具为 AgentTool
  │
  ├── 4. Skills（技能包）
  │     src/agents/skills/
  │     ├── workspace.ts     — 从 workspace 加载技能
  │     ├── config.ts        — 技能配置
  │     ├── filter.ts        — 技能过滤
  │     ├── refresh.ts       — 技能刷新
  │     └── command-specs.ts — 技能命令规范
  │     Skills 通过 SKILL.md 文件声明，解析后注册为 prompt 注入
  │
  └── 5. Channel / Plugin 工具
        src/agents/channel-tools.ts — 渠道提供的工具（如 WhatsApp 登录）
        getPluginToolMeta()         — Plugin 注册的工具
```

### 4.2 工具策略管道

**源码**: `src/agents/tool-policy-pipeline.ts`, `src/agents/pi-tools.ts`

所有工具在传给 Pi SDK 前经过策略管道过滤：

```
原始工具集合
  │
  ├── isToolAllowedByPolicies()        — 工具策略白名单检查
  ├── applyOwnerOnlyToolPolicy()       — owner-only 工具限制
  ├── resolveGroupToolPolicy()         — 群组工具策略
  ├── resolveSubagentToolPolicyForSession() — 子 Agent 工具策略
  ├── wrapToolWithAbortSignal()        — abort 信号包装
  ├── wrapToolWithBeforeToolCallHook() — before-tool-call 钩子
  ├── wrapToolWorkspaceRootGuard()     — 工作目录边界保护
  └── wrapToolMemoryFlushAppendOnlyWrite() — MEMORY.md 只追加保护
  │
  ▼
最终 AgentTool[] → Pi SDK Agent 循环
```

### 4.3 工具定义接口

**源码**: `src/agents/tools/common.ts:9-15`

```typescript
// 所有工具的基础类型
type AgentToolWithMeta<TParameters, TResult> = AgentTool<TParameters, TResult> & {
  ownerOnly?: boolean;       // 仅 owner 可用
  displaySummary?: string;   // 工具摘要描述
};

// AgentTool 来自 Pi SDK:
type AgentTool<TParameters, TResult> = {
  name: string;              // 工具名称
  description: string;       // 工具描述
  parameters: TParameters;   // JSON Schema 参数定义
  execute: (params) => Promise<AgentToolResult<TResult>>; // 执行函数
};
```

---

## 五、模块 4：记忆系统

### 5.1 四层记忆架构

```
┌─────────────────────────────────────────────┐
│           Agent 记忆系统（四层）              │
│                                             │
│  Layer 1: 文件级记忆                        │
│  ├── MEMORY.md（workspace 根目录）           │
│  ├── Agent 通过 read/write 工具直接读写     │
│  └── 每次运行时自动注入 system prompt       │
│                                             │
│  Layer 2: Bootstrap 上下文文件              │
│  ├── AGENTS.md (指令, 优先级 10)            │
│  ├── SOUL.md (人格, 优先级 20)              │
│  ├── IDENTITY.md (身份, 优先级 30)          │
│  ├── USER.md (用户偏好, 优先级 40)          │
│  ├── TOOLS.md (工具说明, 优先级 50)         │
│  ├── BOOTSTRAP.md (引导, 优先级 60)         │
│  └── MEMORY.md (记忆, 优先级 70)            │
│                                             │
│  Layer 3: Context Engine（可插拔）          │
│  ├── registerContextEngine()                │
│  ├── resolveContextEngine()                 │
│  ├── LegacyContextEngine (默认: 文件级)     │
│  └── 可注册 Vector Store 等高级引擎         │
│                                             │
│  Layer 4: Memory Plugin（可选扩展）         │
│  ├── buildMemoryPromptSection()             │
│  └── 可提供向量检索等增强记忆能力           │
│                                             │
└─────────────────────────────────────────────┘
```

### 5.2 Bootstrap 文件加载机制

**源码**: `src/agents/bootstrap-files.ts`, `src/agents/system-prompt.ts:32-40`

```typescript
// system-prompt.ts — 文件按优先级排序注入 system prompt
const CONTEXT_FILE_ORDER = new Map([
  ["agents.md", 10],     // 最高优先级
  ["soul.md", 20],
  ["identity.md", 30],
  ["user.md", 40],
  ["tools.md", 50],
  ["bootstrap.md", 60],
  ["memory.md", 70],     // 最低优先级
]);
```

加载流程：
```
resolveBootstrapContextForRun()
  │
  ├── loadWorkspaceBootstrapFiles()     — 从 workspace 读取 .md 文件
  ├── filterBootstrapFilesForSession()  — 按 session 过滤
  ├── applyBootstrapHookOverrides()     — 应用 Hook 覆盖
  ├── applyContextModeFilter()          — 按模式过滤 (full/lightweight)
  └── buildBootstrapContextFiles()      — 构建上下文注入块
        │
        ▼
  注入到 System Prompt 的 "Project Context" 段落
```

### 5.3 MEMORY.md 工作机制

**源码**: `src/agents/workspace.ts:32-33, 470-475`

```typescript
export const DEFAULT_MEMORY_FILENAME = "MEMORY.md";
export const DEFAULT_MEMORY_ALT_FILENAME = "memory.md";

// 优先 MEMORY.md，不存在时回退 memory.md
for (const name of [DEFAULT_MEMORY_FILENAME, DEFAULT_MEMORY_ALT_FILENAME]) {
  // ...
}
```

Agent 对 MEMORY.md 的读写通过标准的 `read`/`write` 工具进行，并有特殊的追加保护：

```typescript
// pi-tools.ts:601 — MEMORY.md 的 write 工具被包装为 append-only
if (!MEMORY_FLUSH_ALLOWED_TOOL_NAMES.has(tool.name)) {
  // 非 read/write 工具不能触碰 MEMORY.md
}
```

### 5.4 Context Engine

**源码**: `src/context-engine/`

```typescript
// 可插拔的上下文引擎注册表
export { registerContextEngine, resolveContextEngine, listContextEngineIds };
export { LegacyContextEngine, registerLegacyContextEngine };

// 类型定义
type ContextEngine = {
  assemble: (params) => Promise<AssembleResult>;     // 组装上下文
  compact: (params) => Promise<CompactResult>;       // 压缩历史
  ingest: (params) => Promise<IngestResult>;         // 摄入新信息
  maintenance: (params) => Promise<MaintenanceResult>; // 维护
  rewriteTranscript: (params) => Promise<RewriteResult>; // 重写 transcript
};
```

默认使用 `LegacyContextEngine`（文件级），Plugin 可以注册更高级的引擎（如向量检索引擎）。

---

## 六、模块 5：Session 会话管理

### 6.1 双层存储架构

```
Layer 1: Session Store (索引层)
位置: ~/.openclaw/sessions/store.json 或 ~/.openclaw/agents/<agentId>/store.json
格式: JSON
内容: SessionKey → SessionEntry 映射

Layer 2: Session Transcript (内容层)
位置: ~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl
格式: JSONL (每行一个 JSON)
内容: 对话消息链（parentId DAG 结构）
```

### 6.2 SessionEntry 结构

**源码**: `src/config/sessions.ts`

```typescript
type SessionEntry = {
  sessionId: string;           // 会话唯一 ID
  sessionFile?: string;        // transcript 文件路径
  model?: string;              // 使用的模型
  provider?: string;           // 使用的 Provider
  lastChannel?: string;        // 最近的消息渠道
  lastTo?: string;             // 最近的目标
  lastFrom?: string;           // 最近的来源
  lastMessageAt?: number;      // 最近消息时间
  thinking?: ThinkLevel;       // 思考级别
  verbose?: VerboseLevel;      // 详细级别
  providerOverride?: string;   // Provider 覆盖
  modelOverride?: string;      // Model 覆盖
  // ... 更多字段
};
```

### 6.3 Session 解析流程

**源码**: `src/agents/command/session.ts:27-80`

```
resolveSession(opts)
  │
  ├── 有 sessionKey?
  │   └── 从 store 中查找 → 返回现有会话
  │
  ├── 有 sessionId?
  │   └── collectSessionIdMatchesForRequest()
  │       → 在所有 Agent 的 store 中搜索匹配
  │
  ├── 有 to (目标地址)?
  │   └── resolveSessionKey() 基于 channel + to 计算 key
  │
  └── 都没有?
      └── 使用默认 main session key

返回: SessionResolution {
  sessionId: string;
  sessionKey?: string;
  sessionEntry?: SessionEntry;
  isNewSession: boolean;
}
```

### 6.4 SessionManager（Pi SDK）

**源码**: `src/agents/pi-embedded-runner/run/attempt.ts:4-8`

```typescript
import { createAgentSession, SessionManager } from "@mariozechner/pi-coding-agent";

// SessionManager 管理 transcript JSONL 文件的读写
// 使用 parentId 构建消息 DAG 链
// 支持 compaction（历史压缩）
```

**Transcript JSONL 格式**：
```jsonl
{"type":"message","message":{"role":"user","content":"Hello"},"parentId":null}
{"type":"message","message":{"role":"assistant","content":"Hi!"},"parentId":"msg-001"}
{"type":"message","message":{"role":"user","content":"Help me"},"parentId":"msg-002"}
```

### 6.5 Compaction（上下文压缩）

**源码**: `src/agents/compaction.ts`

当对话历史超过模型的 context window 时，自动触发压缩：

```typescript
// compaction.ts:16-19
export const BASE_CHUNK_RATIO = 0.4;     // 基础分块比
export const MIN_CHUNK_RATIO = 0.15;     // 最小分块比
export const SAFETY_MARGIN = 1.2;        // 20% 安全余量

// 压缩策略：
// 1. estimateTokens() 估算当前 token 数
// 2. 超过阈值 → 将历史分块
// 3. 对每块调用 generateSummary() 生成摘要
// 4. 合并摘要替换原始历史
// 5. 保留："活跃任务状态、批处理进度、最近的用户请求、决策和理由、TODO"
```

---

## 七、你遗漏的模块

### 7.1 System Prompt 组装引擎

**源码**: `src/agents/system-prompt.ts`

这是一个**极其复杂**的 prompt 工程系统，负责组装 Agent 的 system prompt：

```
System Prompt 结构：
  │
  ├── Identity Line ("You are OpenClaw, an AI assistant...")
  │
  ├── Provider Contribution
  │   └── resolveProviderSystemPromptContribution() — Provider Plugin 注入
  │
  ├── Tooling Section
  │   └── 工具描述、使用指南
  │
  ├── Workspace Section
  │   └── 工作目录信息、项目结构
  │
  ├── Project Context (Bootstrap Files)
  │   ├── AGENTS.md
  │   ├── SOUL.md
  │   ├── MEMORY.md
  │   └── ... (按优先级排序)
  │
  ├── Runtime Section
  │   ├── 日期/时间
  │   ├── 平台信息
  │   ├── Shell 信息
  │   └── 模型信息
  │
  ├── Skills Prompt
  │   └── resolveSkillsPromptForRun()
  │
  ├── Channel Hints
  │   ├── Markdown 能力
  │   ├── Reaction 指导
  │   └── Message Action 提示
  │
  ├── Memory Section
  │   └── buildMemoryPromptSection() — Memory Plugin 贡献
  │
  └── Cache Boundary
      └── SYSTEM_PROMPT_CACHE_BOUNDARY — prompt cache 稳定性分界线
```

**Prompt Cache 稳定性**是一个关键设计约束：静态部分（identity/tooling/workspace）放在前面保持字节不变，动态部分（runtime/memory）放在后面，这样 LLM 的 prompt cache 可以最大化复用。

### 7.2 Exec Approval（执行审批）

**源码**: `src/agents/bash-tools.exec-approval-request.ts`

Agent 执行 Shell 命令前的人工审批系统：

```
Agent 想执行 `rm -rf /tmp/data`
  │
  ├── 检查是否在白名单中 → 是 → 直接执行
  │
  └── 不在白名单 → 发起审批请求
      ├── Gateway WebSocket event: exec.approval.requested
      ├── iOS APNs 推送通知
      ├── Control UI 弹出审批对话框
      │
      ├── 人类批准 → 执行命令
      └── 人类拒绝 → 返回错误给 Agent
```

### 7.3 Sandbox（沙箱隔离）

**源码**: `src/agents/sandbox.ts`, `src/agents/pi-tools.read.ts`

```
Sandbox 保护：
  ├── Workspace Root Guard — 文件操作限制在工作目录内
  │   wrapToolWorkspaceRootGuard() — 拦截越界路径
  │
  ├── Sandboxed Tools — 沙箱版本的读写工具
  │   createSandboxedReadTool()
  │   createSandboxedEditTool()
  │   createSandboxedWriteTool()
  │
  └── Docker Execution — 可选的 Docker 隔离执行
      bash-tools.exec-host-gateway.ts
```

### 7.4 Subagent（子 Agent 系统）

**源码**: `src/agents/acp-spawn.ts`, `src/agents/subagent-registry.ts`

```
主 Agent
  │
  ├── spawn subagent
  │   ├── 独立的 session
  │   ├── 独立的 workspace（可继承父 workspace）
  │   ├── 精简的 prompt mode ("minimal")
  │   ├── 工具子集（受 subagent policy 限制）
  │   └── 独立的超时控制
  │
  ├── 父子通信
  │   ├── acp-spawn-parent-stream.ts — 父 Agent 订阅子 Agent 流
  │   └── 子 Agent 结果回传给父 Agent
  │
  └── Subagent Registry
      ├── 追踪所有活跃子 Agent
      ├── session-subagent-reactivation.ts — 子 Agent 重新激活
      └── 运行时间/状态监控
```

### 7.5 流式输出管道

**源码**: `src/agents/stream-message-shared.ts`, `src/agents/pi-embedded-runner/stream-*.ts`

```
Pi SDK Agent 循环
  │ 每个 token
  ▼
流式事件处理：
  ├── onPartialReply     — 增量文本
  ├── onReasoningStream  — 推理/思考流
  ├── onBlockReplyQueued — 分段回复（多段输出）
  ├── onToolStart        — 工具调用开始
  ├── onToolResult       — 工具结果
  ├── onCommandOutput    — 命令输出流
  ├── onPlanUpdate       — 计划更新
  ├── onApprovalEvent    — 审批事件
  ├── onCompactionStart/End — 压缩状态
  └── onModelSelected    — 实际使用的模型
  │
  ▼
广播到 Gateway WebSocket (event: "chat")
  ├── state: "delta"    — 增量
  ├── state: "final"    — 完成
  ├── state: "aborted"  — 中止
  └── state: "error"    — 错误
```

### 7.6 Hooks 系统

**源码**: `src/agents/bootstrap-hooks.ts`, `src/agents/pi-tools.before-tool-call.js`

```
Hook 触发点：
  ├── before-agent-start — Agent 运行前（可覆盖 model/provider）
  ├── before-tool-call   — 工具调用前（可拦截/修改）
  ├── after-tool-call    — 工具调用后
  ├── on-compaction      — 压缩时
  ├── prompt-build       — System Prompt 构建时
  └── bootstrap-file     — Bootstrap 文件加载时（可覆盖/注入）
```

### 7.7 Lane（并发控制）

**源码**: `src/agents/pi-embedded-runner/lanes.ts`, `src/process/command-queue.ts`

```
Lane 系统控制 Agent 的并发执行：
  ├── Global Lane — 全局并发限制
  ├── Session Lane — 同一 Session 串行执行
  └── Subagent Lane — 子 Agent 专用通道

enqueueCommandInLane(lane, task) — 在指定 lane 排队执行
```

---

## 八、完整文件索引

| 目录/文件 | 文件数 | 职责 |
|-----------|-------|------|
| `src/agents/agent-command.ts` | 1 | Agent 主入口 |
| `src/agents/command/` | 7 | 执行编排（session/delivery/types） |
| `src/agents/pi-embedded-runner/` | 62 | Pi SDK 运行器（核心执行循环） |
| `src/agents/pi-embedded-runner/run/` | ~10 | 单次执行尝试 |
| `src/agents/tools/` | 57 | 内置工具集 |
| `src/agents/skills/` | ~15 | Skills 技能系统 |
| `src/agents/auth-profiles/` | ~15 | Auth Profile 多 Key 管理 |
| `src/agents/model-selection.ts` | 1 | 模型解析 |
| `src/agents/model-fallback.ts` | 1 | 模型 Failover |
| `src/agents/system-prompt.ts` | 1 | System Prompt 组装 |
| `src/agents/compaction.ts` | 1 | 上下文压缩 |
| `src/agents/pi-tools.ts` | 1 | 工具装配 |
| `src/agents/pi-bundle-mcp-*.ts` | 4 | MCP 工具集成 |
| `src/agents/provider-stream.ts` | 1 | Provider 流式调用注册 |
| `src/agents/sandbox.ts` | 1 | 沙箱隔离 |
| `src/agents/acp-spawn.ts` | 1 | 子 Agent 系统 |
| `src/agents/workspace.ts` | 1 | 工作目录 + MEMORY.md |
| `src/agents/bootstrap-files.ts` | 1 | Bootstrap 文件加载 |
| `src/context-engine/` | 7 | 可插拔上下文引擎 |
| `src/auto-reply/` | ~20 | 回复分发框架 |
| **合计** | **~300+** | |
