# 高教 AI 教育平台 — 部署指南

## 一、环境要求

| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 24+ | Docker Desktop (Mac/Windows) 或 Docker Engine (Linux) |
| Docker Compose | v2+ | 已包含在 Docker Desktop 中 |
| 内存 | 8GB+ | PostgreSQL + Redis + Neo4j + MinIO + 应用 |
| 磁盘 | 10GB+ | Docker 镜像 + 数据卷 |

可选：
- OpenClaw Gateway 已独立运行在 `:18789`（如未运行，AI 聊天功能不可用，但其他功能正常）

## 二、快速开始

### 1. 配置环境变量

```bash
cd edu-platform
cp .env.example .env
# 编辑 .env 填入真实密码
```

必须修改的配置：
```env
POSTGRES_PASSWORD=your_secure_password
REDIS_PASSWORD=your_redis_password
MINIO_SECRET_KEY=your_minio_secret
CRYPTO_SECRET_KEY=your_32_char_encryption_key!!!!
OPENCLAW_GATEWAY_TOKEN=your_openclaw_token  # 从 OpenClaw 配置获取
```

### 2. 一键启动

```bash
cd edu-platform
docker-compose up -d
```

首次启动会自动：
- 构建后端 Java 应用（约 2-3 分钟）
- 构建前端 React 应用（约 1 分钟）
- 初始化 PostgreSQL 数据库（25+ 张表 + 默认数据）
- 启动 Redis、MinIO、Neo4j

### 3. 访问应用

| 服务 | 地址 | 说明 |
|------|------|------|
| 管理后台 | http://localhost | 前端 UI（Nginx 代理） |
| 后端 API | http://localhost:8080 | Spring Boot API |
| API 文档 | http://localhost:8080/doc.html | Knife4j Swagger |
| H2 控制台 | http://localhost:8080/h2-console | 仅 dev profile |
| MinIO 控制台 | http://localhost:9001 | 文件存储管理 |
| Neo4j 浏览器 | http://localhost:7474 | 图数据库管理 |

### 4. 默认账号

| 账号 | 密码 | 角色 | 可见功能 |
|------|------|------|---------|
| admin | admin123 | 系统管理员 | 全部 |
| teacher | teacher123 | 教师 | 对话、Agent、教学、资源 |
| student | student123 | 学生 | 对话、Agent(只读)、资源(只读) |

## 三、本地开发（无 Docker）

无需 Docker Desktop 即可开发和测试：

```bash
# 终端 1: 后端
cd edu-platform/edu-backend
export PATH="/tmp/apache-maven-3.9.6/bin:$PATH"  # 如果 Maven 不在 PATH 中
export OPENCLAW_GATEWAY_TOKEN=your_token
mvn spring-boot:run -Dspring-boot.run.profiles=dev -P no-redis

# 终端 2: 前端
cd edu-platform/edu-admin
npm run dev
```

dev profile 使用 H2 内存数据库 + Sa-Token 内存存储，无需 PostgreSQL/Redis。

## 四、架构概览

```
浏览器 → Nginx (:80) → React SPA
                ↓ /api/*
        Spring Boot (:8080)
            ├── Sa-Token 认证
            ├── 安全策略检查
            ├── 模型权限校验
            ↓ /v1/chat/completions
        OpenClaw Gateway (:18789)
            ↓
        LLM Provider (智谱/Qwen/DeepSeek)

基础设施:
  PostgreSQL (:5432) — 业务数据 + pgvector
  Redis (:6379) — Sa-Token 会话 + 缓存
  MinIO (:9000) — 文件存储
  Neo4j (:7687) — 图数据库（知识/能力图谱）
```

## 五、服务管理

```bash
# 查看所有服务状态
docker-compose ps

# 查看日志
docker-compose logs -f edu-backend   # 后端日志
docker-compose logs -f edu-admin     # 前端日志

# 重启单个服务
docker-compose restart edu-backend

# 停止所有服务
docker-compose down

# 停止并删除数据卷（慎用！会清空数据库）
docker-compose down -v

# 仅启动基础设施（不启动应用）
docker-compose up -d postgres redis minio neo4j
```

## 六、API 端点总览（75+）

### 认证 (3)
- `POST /api/auth/login` — 登录
- `GET /api/auth/userinfo` — 当前用户信息
- `POST /api/auth/logout` — 登出

### 用户管理 (8)
- `GET/POST /api/users` — 用户列表/创建
- `GET/PUT/DELETE /api/users/{id}` — 用户详情/更新/删除
- `PUT /api/users/{id}/roles` — 分配角色
- `PUT /api/users/{id}/orgs` — 分配组织

### 安全策略 (8)
- `GET/POST /api/security/keywords` — 关键词管理
- `POST /api/security/keywords/batch-import` — 批量导入
- `GET/POST /api/security/policies` — 策略管理
- `GET /api/security/audit-logs` — 审计日志

### 模型管理 (10)
- `GET/POST /api/models` — 模型列表/添加
- `GET /api/models/available` — 当前用户可用模型
- `PUT /api/models/{id}/status` — 启用/停用
- `PUT /api/models/{id}/default` — 设为默认

### AI 聊天 (5)
- `POST /api/ai/chat` — 同步聊天
- `POST /api/ai/chat/stream` — SSE 流式聊天
- `GET /api/ai/sessions` — 会话列表
- `GET /api/ai/gateway/health` — Gateway 状态

### 资源中心 (7)
- `POST /api/resources/upload` — 文件上传
- `GET /api/resources` — 资源列表（权限过滤）
- `PUT /api/resources/{id}/permission` — 设置公开/私有

### Agent/Skill/MCP (16)
- `GET/POST /api/agents` — Agent 管理
- `GET /api/agents/public` — 公共 Agent 广场
- `POST /api/agents/{id}/publish` — 发布 Agent
- `GET/POST /api/skills` — Skill 管理
- `GET/POST /api/mcp-servers` — MCP 管理

### 渠道管理 (6)
- `GET/POST /api/channels` — 渠道管理
- `POST /api/channels/{id}/bind-agent` — 绑定 Agent

### 知识图谱 (14)
- `GET/POST /api/knowledge/graphs` — 图谱 CRUD
- `GET /api/knowledge/graphs/{id}/data` — 图谱数据（G6 渲染）
- `POST /api/knowledge/graphs/{id}/skeleton` — 创建骨架
- `POST /api/knowledge/graphs/{id}/build` — 触发 LLM 抽取
- `POST /api/knowledge/graphs/{id}/attach` — 挂载知识
- `POST /api/knowledge/graphs/{id}/query` — 图谱检索问答

### 能力图谱 (7)
- `GET/POST /api/competency/graphs` — 能力图谱 CRUD
- `POST /api/competency/assess` — 能力评估
- `POST /api/competency/gap-analysis` — Gap 分析
- `POST /api/competency/generate-path` — 学习路径生成

## 七、演示流程

### 管理员演示路径
1. 登录 (admin/admin123) → 总览面板
2. 系统管理 → 用户管理 → 创建新用户
3. 安全策略 → 添加关键词 "测试拦截"
4. 模型管理 → 添加模型 (GLM-4)
5. 对话 → 发送消息 → AI 回复
6. 对话 → 发送 "测试拦截内容" → 被安全策略拦截
7. 知识图谱 → 查看图谱 → 添加节点 → 检索问答

### 教师演示路径
1. 登录 (teacher/teacher123)
2. 我的智能体 → 创建教学 Agent
3. 资源中心 → 上传教材
4. 知识图谱 → 创建课程图谱
5. 对话 → 使用自己的 Agent 对话

### 学生演示路径
1. 登录 (student/student123)
2. 智能体广场 → 试用公共 Agent
3. 对话 → 提问学习问题
4. 能力图谱 → 能力评估 → 查看学习路径
