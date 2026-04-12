# Claude Code 项目配置

## 项目信息

- 名称：高教 AI 教育平台 Demo
- 类型：全功能可运行原型
- 架构：混合架构（Spring Boot + React + OpenClaw）
- 后端：Java 17 + Spring Boot 3.2 + MyBatis-Plus + Sa-Token + PostgreSQL
- 前端：React 19 + TypeScript + Ant Design 5 + Vite + AntV G6
- AI 层：OpenClaw Gateway（TypeScript，Agent Runtime + MCP + 120+ 插件）
- 基础设施：Docker Compose（PostgreSQL 16 + Redis 7 + MinIO）
- git 仓库：https://github.com/shaunliu222/AI-Gaojiao_demo_V1


## 项目结构

```
004-vibe-openclaw_高教平台demo_V1/
├── openclaw/              # OpenClaw AI Gateway 源码（不修改核心代码，通过 Extension 扩展）
├── claude-doc/            # 架构文档 + PRD 文档
│   ├── 12-高教AI平台底层架构设计研究报告.md
│   ├── 13-系统模块规划与实施计划.md
│   └── 14-前端详细功能PRD文档.md
├── edu-platform/          # 平台项目代码
│   ├── edu-backend/       # Spring Boot 后端（端口 8080）
│   ├── edu-admin/         # React 管理后台（端口 3000）
│   ├── docker-compose.yml # PostgreSQL + Redis + MinIO
│   └── sql/init.sql       # 数据库初始化（22 张表）
├── docs/solutions/        # 已记录的解决方案和最佳实践（按类别组织，YAML frontmatter 可搜索）
└── CLAUDE.md              # 本文件
```

## 开发工作流

1. **任务规划**：先输出 checklist 到 `claude-doc/` 目录（编号命名），再写代码
2. **逐项执行**：按 checklist 逐项实现，完成一项更新状态
3. **验证**：改动后运行对应的验证命令
   - 后端：`cd edu-platform/edu-backend && mvn compile`
   - 前端：`cd edu-platform/edu-admin && npm run build`
   - OpenClaw：`cd openclaw && pnpm install && pnpm build`
4. **优化**：根据验证结果，同步先优化技术文档，再优化代码、配置等。
5. **自动修复**：验证失败先修复再重试，最多 3 轮
6. **提交**：验证通过后，git 提交相关文件，Conventional Commits 格式
7. **收尾**：输出变更清单 + 验证结果

## 后端启动

```bash
# 基础设施（需要 Docker Desktop）
cd edu-platform && docker-compose up -d

# 后端（Maven 路径：/tmp/apache-maven-3.9.6/bin/mvn）
export PATH="/tmp/apache-maven-3.9.6/bin:$PATH"
cd edu-platform/edu-backend && mvn spring-boot:run

# 前端
cd edu-platform/edu-admin && npm run dev
```

## 代码规范

- 遵循项目现有风格，不加多余注释
- 优先改现有文件，避免新建文件
- 不主动创建文档，除非被要求
- 后端包结构：`com.edu.ai.{config,controller,service,mapper,entity,dto,security,common}`
- 前端目录：`src/{pages,components,services,stores,layouts}`

## 安全

- 只做防御性安全任务，拒绝可被恶意利用的代码
- 允许安全分析、检测规则、漏洞说明、防御工具和安全文档

## 实施阶段（7 个 Phase）

当前进度：**Phase 2 已完成（核心页面）**

| Phase | 目标 | 状态 |
|-------|------|------|
| Phase 1 | 基座搭建（OpenClaw + Spring Boot + React 三端跑通） | **已完成** |
| Phase 2 | 前端 UI 开发（Mock + OpenClaw 直连） | **已完成**（核心页面） |
| Phase 3 | 后端第一批（认证 + AI 网关 + 安全 + 模型管理） | 待开始 |
| Phase 4 | 后端第二批（资源中心 + Agent/Skill + 渠道） | 待开始 |
| Phase 5 | 后端第三批（知识图谱 + 能力图谱） | 待开始 |
| Phase 6 | 前后端联调 | 待开始 |
| Phase 7 | 部署优化与交付 | 待开始 |

详见 `claude-doc/13-系统模块规划与实施计划.md`

## Skill 体系（gstack + Compound Engineering 分层协作）

原则：gstack 负责"做不做"和"真实测"，CE 负责"怎么做"、"做得好不好"和"记住"。

### 分层架构

```
决策层（做不做）── gstack
├── /plan-ceo-review        产品视角砍需求
├── /plan-eng-review        锁架构方向
├── /plan-design-review     设计方案审查
├── /plan-devex-review      开发体验审查
└── /cso                    安全审计决策

规划层（怎么做）── CE
├── /ce-brainstorm          需求探索、方案讨论
└── /ce-plan                结构化实施计划（spawn research agents + 读历史 learnings）

执行层（做起来）── CE + Claude Code 原生
├── /ce-work                按计划增量执行
├── /ce-debug               系统化根因排查
└── Claude Code             写代码（原生能力，不走 skill）

审查层（做得好不好）── CE 代码审查 + gstack 真实测试
├── /ce-review              6-15 个专项 reviewer 并行（代码审查）
├── /qa                     gstack 浏览器 QA 测试+修 bug
├── /qa-only                gstack 只报告不修复
├── /benchmark              gstack 性能回归检测
├── /canary                 gstack 部署后金丝雀监控
├── /design-review          gstack 浏览器实测 UI 视觉问题
└── /browse                 gstack 无头浏览器（QA/审查 的基础工具）

交付层 ── gstack
└── /ship                   PR/push/deploy

知识层（记住）── CE
├── /ce-compound            写进可搜索的项目知识库
└── /ce-sessions            搜索历史会话记录
```

### Skill routing rules

When the user's request matches a skill, ALWAYS invoke it using the Skill tool as
your FIRST action. Do NOT answer directly when a matching skill exists.

**决策层（gstack）：**
- "这个功能值不值得做"、产品方向 → `/plan-ceo-review`
- "架构怎么设计"、锁定技术方案 → `/plan-eng-review`
- "设计方案好不好" → `/plan-design-review`
- "开发体验怎么样" → `/plan-devex-review`
- 安全审计、威胁建模 → `/cso`

**规划层（CE）：**
- 需求讨论、头脑风暴、"怎么做" → `/ce-brainstorm`
- 创建实施计划、拆分任务 → `/ce-plan`

**执行层（CE）：**
- 按计划执行工作项 → `/ce-work`
- Bug 调试、"为什么报错"、根因排查 → `/ce-debug`
- 写代码、实现功能 → **不走 skill，Claude Code 原生执行**

**审查层（CE + gstack）：**
- 代码审查、"review 一下" → `/ce-review`
- QA 测试、"测试一下页面" → `/qa`
- 性能测试 → `/benchmark`
- 部署后监控 → `/canary`
- UI 视觉审查 → `/design-review`

**交付层（gstack）：**
- Ship、deploy、push、创建 PR → `/ship`

**知识层（CE）：**
- 记录经验教训 → `/ce-compound`
- 搜索历史会话 → `/ce-sessions`

**工具类（不主动触发，按需使用）：**
- 保存/恢复进度 → `/checkpoint`
- 防误操作 → `/careful` `/guard` `/freeze` `/unfreeze`
- 浏览器操作 → `/browse` `/connect-chrome` `/setup-browser-cookies`
- 设计系统 → `/design-consultation` `/design-html` `/design-shotgun`
- 前端构建 → `/frontend-design`
- 部署配置 → `/setup-deploy`
- 远程配对 → `/pair-agent`
- Git 提交 → `/git-commit` `/commit`
- 文档审查 → `/document-review`
- 代码简化 → `/simplify`
- 定时循环 → `/loop`
- Claude API 开发 → `/claude-api`
- PDF 转 PPT → `/pdf-to-ppt`
- Skill 创建 → `/skill-creator`
- 配置管理 → `/update-config`
- TODO 处理 → `/todo-resolve`

### gstack 完整清单（25 个）

| skill | 层 | 功能 |
|-------|-----|------|
| plan-ceo-review | 决策 | 产品视角审查 |
| plan-eng-review | 决策 | 架构方向审查 |
| plan-design-review | 决策 | 设计方案审查 |
| plan-devex-review | 决策 | DX 体验审查 |
| cso | 决策 | 安全审计 |
| qa | 审查 | QA 测试+修 bug |
| qa-only | 审查 | QA 只报告 |
| benchmark | 审查 | 性能回归检测 |
| canary | 审查 | 部署后监控 |
| design-review | 审查 | UI 实测审查 |
| browse | 工具 | 无头浏览器 |
| gstack | 工具 | 无头浏览器（browse 别名） |
| connect-chrome | 工具 | 有头浏览器 |
| setup-browser-cookies | 工具 | Cookie 导入 |
| ship | 交付 | PR/push/deploy |
| setup-deploy | 交付 | 部署配置 |
| checkpoint | 工具 | 存档/恢复 |
| careful | 安全 | 防误操作 |
| freeze | 安全 | 目录锁定 |
| unfreeze | 安全 | 解除锁定 |
| guard | 安全 | careful + freeze |
| design-consultation | 设计 | 设计系统咨询 |
| design-html | 设计 | HTML/CSS 生成 |
| design-shotgun | 设计 | 设计变体 |
| pair-agent | 工具 | 远程配对 |
| gstack-upgrade | 维护 | 升级 gstack |

### CE 及其他 Skill 清单

**CE 核心（7 个）：**
ce-brainstorm, ce-plan, ce-work, ce-review, ce-compound, ce-debug, ce-sessions

**通用工具（10 个）：**
commit, git-commit, document-review, frontend-design, todo-resolve,
simplify, loop, claude-api, pdf-to-ppt, skill-creator, update-config

## gstack

Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.

## 二次开发
例如：open claw 开发部分任务,不要从0开始写代码,要基于源码进行二次开发,先熟悉/Users/shaunl/Desktop/智谱AI/04-代码开发/001-JT-vibe coding/004-vibe-openclaw_高教平台demo_V1/claude-doc 文档中相关源码分析文档，再根据需求进行二次开发。