---
title: "feat: Phase 4 backend — resource center, agent/skill management, channels"
type: feat
status: active
date: 2026-04-13
---

# Phase 4 Backend — Resource Center + Agent/Skill + Channels

## Overview

Implement 3 backend modules (M11 资源中心, M12 Agent/Skill管理, M18 渠道管理) plus 2 infrastructure prerequisites (Neo4j + pgvector). Follows the Entity→Mapper→Service→Controller pattern established in Phase 3.

## Problem Frame

Phase 3 delivered auth, security, models, and AI gateway. Phase 4 adds the content management layer: file upload/storage, Agent lifecycle management, and channel distribution. These are needed before Phase 5 (knowledge graph) which depends on resource upload and Neo4j.

## Requirements Trace

- R1. docker-compose includes Neo4j 5 service
- R2. PostgreSQL has pgvector extension enabled
- R3. File upload to MinIO with metadata in PostgreSQL
- R4. Resource list with permission filtering (public + owner's private + authorized)
- R5. Async parse task tracking (pending → parsing → parsed → failed)
- R6. Agent CRUD with JSON config storage and permission control
- R7. Agent test dialog through OpenClaw proxy
- R8. Skill and MCP Server CRUD
- R9. Channel CRUD with Agent binding
- R10. All CRUD endpoints use @SaCheckRole for admin/info_center

## Scope Boundaries

- NOT implementing MinerU integration (no GPU — deferred, use placeholder parse status)
- NOT implementing Embedding/pgvector writes (Phase 5)
- NOT implementing OpenClaw YAML config sync (complex, deferred to Phase 6)
- NOT changing frontend (Phase 4 is backend-only, frontend联调 will follow)

### Deferred to Separate Tasks

- MinerU document parsing: when GPU available
- pgvector Embedding storage: Phase 5 knowledge graph
- OpenClaw config sync on Agent create: Phase 6 联调

## Key Technical Decisions

- **MinIO integration**: Use existing MinIO SDK dependency in pom.xml. Create `MinioService` for upload/download
- **Async parse tasks**: Simple status polling (no message queue for demo). Background thread simulates parse completion
- **Agent config**: Store as JSONB (PostgreSQL) / TEXT (H2) — same pattern as existing `model_config.config`
- **Permission filtering**: Resource list query uses OR condition: `is_public=true OR owner_id=currentUser OR exists in res_file_permission`
- **H2 compatibility**: All new entities follow same pattern as Phase 3 (TEXT instead of JSONB for H2)

## Implementation Units

- [ ] **Unit 1: Infrastructure — Neo4j + pgvector in docker-compose**

**Goal:** Add Neo4j 5 to docker-compose; enable pgvector in PostgreSQL

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `edu-platform/docker-compose.yml`
- Modify: `edu-platform/sql/init.sql` (add `CREATE EXTENSION IF NOT EXISTS vector;`)

**Approach:**
- Add Neo4j 5 community service with default credentials (neo4j/neo4j123)
- Add pgvector by using `pgvector/pgvector:pg16` image instead of `postgres:16-alpine`
- Add `CREATE EXTENSION IF NOT EXISTS vector;` at top of init.sql

**Test scenarios:**
- Test expectation: none — pure infrastructure config

**Verification:**
- `docker-compose up -d` starts Neo4j on port 7474/7687 and PostgreSQL with pgvector

- [ ] **Unit 2: MinIO service + File upload infrastructure**

**Goal:** MinioService for file upload/download; MinIO config bean

**Requirements:** R3

**Dependencies:** None

**Files:**
- Create: `edu-platform/edu-backend/src/main/java/com/edu/ai/config/MinioConfig.java`
- Create: `edu-platform/edu-backend/src/main/java/com/edu/ai/service/MinioService.java`

**Approach:**
- Read MinIO config from application.yml (`minio.endpoint/access-key/secret-key/bucket`)
- `MinioConfig` creates `MinioClient` bean
- `MinioService`: `upload(file, path)`, `getPresignedUrl(path)`, `delete(path)`
- Auto-create bucket if not exists on startup

**Patterns to follow:**
- Existing `OpenClawClient` for external service integration pattern

**Test scenarios:**
- Happy path: upload file → returns storage path
- Error path: MinIO unavailable → graceful error, don't crash app startup

**Verification:**
- MinioService bean created successfully; upload/download methods functional

- [ ] **Unit 3: M11 Resource Center — Entity/Mapper/Service/Controller**

**Goal:** Full CRUD for resources with file upload, permission filtering, and parse status tracking

**Requirements:** R3, R4, R5

**Dependencies:** Unit 2 (MinioService)

**Files:**
- Create: `entity/ResFile.java`, `entity/ResCategory.java`, `entity/ResFilePermission.java`, `entity/ResParseTask.java`
- Create: `mapper/ResFileMapper.java`, `mapper/ResCategoryMapper.java`, `mapper/ResFilePermissionMapper.java`, `mapper/ResParseTaskMapper.java`
- Create: `service/ResFileService.java`
- Create: `controller/ResFileController.java`, `controller/ResCategoryController.java`

**Approach:**
- Upload flow: receive MultipartFile → MinIO upload → save ResFile metadata → create ResParseTask(status=pending)
- List with permission filter: `WHERE (is_public=true OR owner_id=? OR id IN (SELECT file_id FROM res_file_permission WHERE target_type='user' AND target_id=?))`
- Parse status: manual trigger endpoint to simulate parse completion (real MinerU deferred)
- Permission setting: endpoint to toggle public/private and add role/org/user permissions
- Category CRUD for organizing resources

**Patterns to follow:**
- `SysUserService` / `SysUserController` for CRUD pattern
- `ModelService` for permission-based listing

**Test scenarios:**
- Happy path: upload PDF → ResFile created in DB → storage_path points to MinIO → parse task created as pending
- Happy path: list resources as admin → sees all; as teacher → sees public + own private
- Happy path: set resource as public → other users can see it
- Error path: upload without auth → 401
- Edge case: upload empty file → 400 validation error

**Verification:**
- `POST /api/resources/upload` stores file in MinIO, returns resource metadata
- `GET /api/resources` returns filtered list based on user role
- `GET /api/resources/:id/parse-status` returns current parse status

- [ ] **Unit 4: M12 Agent/Skill/MCP — Entity/Mapper/Service/Controller**

**Goal:** Full CRUD for Agent definitions, Skills, and MCP Servers with permission control

**Requirements:** R6, R7, R8

**Dependencies:** None (DB tables already exist)

**Files:**
- Create: `entity/AgentDefinition.java`, `entity/AgentPermission.java`, `entity/AgentPublish.java`, `entity/SkillDefinition.java`, `entity/McpServer.java`
- Create: `mapper/AgentDefinitionMapper.java`, `mapper/AgentPermissionMapper.java`, `mapper/AgentPublishMapper.java`, `mapper/SkillDefinitionMapper.java`, `mapper/McpServerMapper.java`
- Create: `service/AgentService.java`, `service/SkillService.java`, `service/McpServerService.java`
- Create: `controller/AgentController.java`, `controller/SkillController.java`, `controller/McpServerController.java`

**Approach:**
- Agent CRUD with config JSON field (system_prompt, tools, model selection)
- Agent permission: public/private + authorized scope (role/org/user)
- Agent list: public agents visible to all; private agents only to owner + authorized
- Agent test dialog: proxy to OpenClaw `/v1/chat/completions` with `x-openclaw-agent-id` header
- Agent publish: record which channels agent is published to
- Skill CRUD with reference count (how many agents use this skill)
- MCP Server CRUD with connection test endpoint

**Patterns to follow:**
- `ModelService` for CRUD + permission pattern
- `AiChatController.chat()` for OpenClaw proxy pattern (agent test dialog)

**Test scenarios:**
- Happy path: create Agent (openclaw type) with config JSON → agent appears in list
- Happy path: set Agent as public → teacher can see it; set as private → only owner sees
- Happy path: test dialog sends message to OpenClaw with agent-id header → gets response
- Happy path: create Skill → reference count starts at 0
- Happy path: create MCP Server → connection test returns status
- Error path: student creates Agent → should work (students can create private agents)
- Error path: delete Skill that's referenced by Agent → should warn or block

**Verification:**
- All CRUD endpoints functional; permission filtering correct; agent test dialog works

- [ ] **Unit 5: M18 Channel Management — Entity/Mapper/Service/Controller**

**Goal:** Channel CRUD with Agent binding and status check

**Requirements:** R9

**Dependencies:** Unit 4 (AgentDefinition entity)

**Files:**
- Create: `entity/ChannelConfig.java`, `entity/ChannelAgentBinding.java`
- Create: `mapper/ChannelConfigMapper.java`, `mapper/ChannelAgentBindingMapper.java`
- Create: `service/ChannelService.java`
- Create: `controller/ChannelController.java`

**Approach:**
- Channel types: feishu, wechat, web, portal, dingtalk
- Config JSON stores platform credentials (app_id, app_secret, token)
- Bind/unbind agents to channels
- Status check: call OpenClaw channel status API or return mock status

**Patterns to follow:**
- `ModelController` for simple CRUD pattern

**Test scenarios:**
- Happy path: create feishu channel with config → channel in list
- Happy path: bind Agent to channel → binding recorded
- Happy path: unbind Agent → binding removed
- Happy path: channel status check → returns online/offline
- Edge case: bind same Agent twice → unique constraint prevents duplicate

**Verification:**
- Channel CRUD works; Agent binding/unbinding functional

- [ ] **Unit 6: H2 schema/data update for new entities**

**Goal:** Update H2 dev scripts to include all Phase 4 tables

**Requirements:** R1-R10 (dev profile support)

**Dependencies:** Units 3-5

**Files:**
- Modify: `edu-platform/edu-backend/src/main/resources/schema-h2.sql` (already has all tables)
- Modify: `edu-platform/edu-backend/src/main/resources/data-h2.sql` (add sample data)

**Approach:**
- schema-h2.sql already has all tables from Phase 1 — verify they're correct
- Add sample data: 2 categories, 1 sample Agent (Main Agent), 1 sample Skill
- No pgvector in H2 (skip CREATE EXTENSION — H2 doesn't support it)

**Test scenarios:**
- Happy path: `mvn spring-boot:run -Dspring-boot.run.profiles=dev -P no-redis` → starts → all Phase 4 APIs work

**Verification:**
- Backend starts with dev profile; Phase 4 endpoints return data

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| MinIO not running in dev → file upload fails | Add try/catch in MinioConfig; upload endpoint returns clear error |
| Agent test dialog needs OpenClaw running | Reuse existing fallback pattern from AiChatController |
| pgvector/Neo4j only in docker-compose, not H2 | Phase 5 graph features require Docker; Phase 4 CRUD works without them |

## Sources & References

- Origin: `claude-doc/13-系统模块规划与实施计划.md` Phase 4 section
- Tech decisions: `claude-doc/16-五步图谱构建技术可行性分析.md`
- Pattern: `docs/solutions/best-practices/spring-boot-phase-development-skill-chain-2026-04-12.md`
- Existing code: `edu-platform/edu-backend/src/main/java/com/edu/ai/` (Phase 3 patterns)
