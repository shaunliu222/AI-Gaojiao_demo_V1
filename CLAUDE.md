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

详见 `系统模块规划与实施计划.md`


## 二次开发
例如：open claw 开发部分任务,不要从0开始写代码,要基于源码进行二次开发。