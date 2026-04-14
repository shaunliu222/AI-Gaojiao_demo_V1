# 高教 AI 教育平台 Demo

全功能可运行原型：Spring Boot + React + OpenClaw AI Gateway。

## 架构

```
edu-platform/
├── edu-backend/       # Spring Boot 3.2 + MyBatis-Plus + Sa-Token (端口 8080)
├── edu-admin/         # React 19 + TypeScript + Ant Design 5 (端口 3000)
├── edu-mcp-server/    # MCP Server (知识检索/学术查询/资源搜索)
├── docker-compose.yml # PostgreSQL + Redis + MinIO + Neo4j
└── sql/init.sql       # 数据库初始化 (22 张表)
openclaw/              # OpenClaw AI Gateway (git submodule)
claude-doc/            # 架构文档
```

## 快速开始

### 1. 克隆（含 submodule）

```bash
git clone https://github.com/shaunliu222/AI-Gaojiao_demo_V1.git
cd AI-Gaojiao_demo_V1
git submodule update --init --recursive
```

### 2. 配置环境变量

```bash
cp edu-platform/.env.example edu-platform/.env
# 编辑 .env 填入实际密码和 API Key
```

### 3. 启动基础设施

```bash
cd edu-platform
docker-compose up -d   # PostgreSQL + Redis + MinIO + Neo4j
```

### 4. 启动后端

```bash
cd edu-backend

# 方式 A: Docker-free 开发模式 (H2 内存数据库，无需 Docker)
mvn spring-boot:run -Dspring-boot.run.profiles=dev -P no-redis

# 方式 B: 完整模式 (需要先启动 docker-compose)
mvn spring-boot:run
```

### 5. 启动前端

```bash
cd edu-admin
npm install
npm run dev   # http://localhost:3000
```

### 6. 启动 OpenClaw Gateway（可选）

```bash
cd openclaw
cp .env.example .env   # 配置 LLM Provider API Keys
pnpm install
pnpm dev               # http://localhost:18789
```

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 教师 | teacher | teacher123 |
| 学生 | student | student123 |

## 技术栈

- **后端**: Java 17, Spring Boot 3.2, MyBatis-Plus, Sa-Token, PostgreSQL 16
- **前端**: React 19, TypeScript, Ant Design 5, Vite, AntV G6
- **AI 层**: OpenClaw Gateway (Agent Runtime + MCP + 120+ 插件)
- **基础设施**: Docker Compose, Redis 7, MinIO, Neo4j 5

## 文档

- `claude-doc/01-OpenClaw 项目整体架构分析文档.md`
- `claude-doc/02-系统模块规划与实施计划.md`
- `claude-doc/03-前端详细功能PRD文档.md`
- `claude-doc/04-五步图谱构建技术可行性分析.md`
- `edu-platform/DEPLOY.md` — 部署指南
