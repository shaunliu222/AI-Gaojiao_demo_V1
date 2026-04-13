-- ============================================================
-- Higher Education AI Platform - Database Schema
-- PostgreSQL 16 + pgvector
-- ============================================================

-- Enable pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================
-- 1. Authentication & RBAC
-- ========================

CREATE TABLE IF NOT EXISTS sys_user (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(64)  NOT NULL UNIQUE,
    password        VARCHAR(256) NOT NULL,
    name            VARCHAR(128) NOT NULL,
    email           VARCHAR(128),
    phone           VARCHAR(32),
    avatar          VARCHAR(512),
    status          SMALLINT     NOT NULL DEFAULT 1,  -- 1=active 0=disabled
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sys_role (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(64)  NOT NULL UNIQUE,
    name            VARCHAR(128) NOT NULL,
    description     VARCHAR(512),
    sort_order      INT          NOT NULL DEFAULT 0,
    status          SMALLINT     NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sys_user_role (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES sys_user(id),
    role_id         BIGINT NOT NULL REFERENCES sys_role(id),
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sys_org (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT       DEFAULT 0,
    name            VARCHAR(128) NOT NULL,
    code            VARCHAR(64)  UNIQUE,
    type            VARCHAR(32)  NOT NULL DEFAULT 'department',  -- school/college/department
    sort_order      INT          NOT NULL DEFAULT 0,
    status          SMALLINT     NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sys_user_org (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES sys_user(id),
    org_id          BIGINT NOT NULL REFERENCES sys_org(id),
    UNIQUE(user_id, org_id)
);

-- Permission definitions
CREATE TABLE IF NOT EXISTS sys_permission (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(128) NOT NULL UNIQUE,
    name            VARCHAR(256) NOT NULL,
    description     VARCHAR(512),
    sort_order      INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sys_role_permission (
    id              BIGSERIAL PRIMARY KEY,
    role_id         BIGINT NOT NULL REFERENCES sys_role(id),
    permission_id   BIGINT NOT NULL REFERENCES sys_permission(id),
    UNIQUE(role_id, permission_id)
);

-- ========================
-- 2. Resource Center
-- ========================

CREATE TABLE IF NOT EXISTS res_category (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    parent_id       BIGINT       DEFAULT 0,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS res_file (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(512) NOT NULL,
    original_name   VARCHAR(512) NOT NULL,
    file_type       VARCHAR(32)  NOT NULL,     -- pdf/ppt/word/md/mp4/zip
    file_size       BIGINT       NOT NULL DEFAULT 0,
    storage_path    VARCHAR(1024),
    category_id     BIGINT       REFERENCES res_category(id),
    parse_status    VARCHAR(32)  NOT NULL DEFAULT 'pending',  -- pending/parsing/parsed/failed
    vector_status   VARCHAR(32)  NOT NULL DEFAULT 'pending',  -- pending/vectorizing/done/failed
    markdown_path   VARCHAR(1024),
    owner_id        BIGINT       NOT NULL REFERENCES sys_user(id),
    is_public       BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS res_file_permission (
    id              BIGSERIAL PRIMARY KEY,
    file_id         BIGINT  NOT NULL REFERENCES res_file(id),
    target_type     VARCHAR(32) NOT NULL,  -- role/org/user
    target_id       BIGINT  NOT NULL,
    permission      VARCHAR(32) NOT NULL DEFAULT 'read',  -- read/write
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS res_parse_task (
    id              BIGSERIAL PRIMARY KEY,
    file_id         BIGINT  NOT NULL REFERENCES res_file(id),
    task_type       VARCHAR(32) NOT NULL,  -- parse/vectorize/attach
    status          VARCHAR(32) NOT NULL DEFAULT 'pending',
    result          TEXT,
    error_message   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ========================
-- 3. Agent / Skill / MCP
-- ========================

CREATE TABLE IF NOT EXISTS agent_definition (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    avatar          VARCHAR(512),
    category        VARCHAR(64),        -- teaching/research/training/management/general
    agent_type      VARCHAR(32) NOT NULL DEFAULT 'openclaw',  -- openclaw/dify/api
    config          JSONB,              -- system_prompt, tools, model, etc.
    status          VARCHAR(32) NOT NULL DEFAULT 'draft',  -- draft/published/disabled
    owner_id        BIGINT  NOT NULL REFERENCES sys_user(id),
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    use_count       BIGINT  NOT NULL DEFAULT 0,
    deleted         SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_permission (
    id              BIGSERIAL PRIMARY KEY,
    agent_id        BIGINT NOT NULL REFERENCES agent_definition(id),
    target_type     VARCHAR(32) NOT NULL,  -- role/org/user
    target_id       BIGINT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_publish (
    id              BIGSERIAL PRIMARY KEY,
    agent_id        BIGINT NOT NULL REFERENCES agent_definition(id),
    channel_type    VARCHAR(64) NOT NULL,  -- web/feishu/wechat/portal
    config          JSONB,
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_definition (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    skill_type      VARCHAR(32) NOT NULL DEFAULT 'tool',  -- tool/query/generate
    config          JSONB,
    owner_id        BIGINT  NOT NULL REFERENCES sys_user(id),
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    status          SMALLINT NOT NULL DEFAULT 1,
    deleted         SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mcp_server (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    endpoint_url    VARCHAR(1024),
    transport_type  VARCHAR(32) NOT NULL DEFAULT 'sse',  -- stdio/sse/http
    auth_type       VARCHAR(32) DEFAULT 'none',          -- none/token/basic
    auth_config     JSONB,
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    owner_id        BIGINT  NOT NULL REFERENCES sys_user(id),
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted         SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ========================
-- 4. Knowledge Graph Metadata
-- ========================

CREATE TABLE IF NOT EXISTS kg_graph (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    owner_id        BIGINT  NOT NULL REFERENCES sys_user(id),
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    node_count      INT     NOT NULL DEFAULT 0,
    edge_count      INT     NOT NULL DEFAULT 0,
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    deleted         SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kg_build_task (
    id              BIGSERIAL PRIMARY KEY,
    graph_id        BIGINT  NOT NULL REFERENCES kg_graph(id),
    file_id         BIGINT  REFERENCES res_file(id),
    task_type       VARCHAR(32) NOT NULL,  -- skeleton/extract/review/attach
    status          VARCHAR(32) NOT NULL DEFAULT 'pending',
    progress        INT     NOT NULL DEFAULT 0,
    result          JSONB,
    error_message   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kg_attachment (
    id              BIGSERIAL PRIMARY KEY,
    graph_id        BIGINT  NOT NULL REFERENCES kg_graph(id),
    node_id         VARCHAR(256) NOT NULL,   -- Neo4j node ID reference
    file_id         BIGINT  REFERENCES res_file(id),
    content_snippet TEXT,
    vector_id       VARCHAR(256),            -- Milvus vector ID reference
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kg_node (
    id              BIGSERIAL PRIMARY KEY,
    graph_id        BIGINT  NOT NULL REFERENCES kg_graph(id),
    name            VARCHAR(512) NOT NULL,
    node_type       VARCHAR(64)  NOT NULL DEFAULT 'concept',  -- chapter/section/concept/formula/method/job/competency/course
    description     TEXT,
    parent_id       BIGINT,
    properties      JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kg_edge (
    id              BIGSERIAL PRIMARY KEY,
    graph_id        BIGINT  NOT NULL REFERENCES kg_graph(id),
    source_node_id  BIGINT  NOT NULL REFERENCES kg_node(id),
    target_node_id  BIGINT  NOT NULL REFERENCES kg_node(id),
    edge_type       VARCHAR(64) NOT NULL DEFAULT 'RELATES_TO',  -- CONTAINS/PREREQUISITE/RELATES_TO/APPLIES_TO/REQUIRES/MAPS_TO
    properties      JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kg_node_graph ON kg_node(graph_id);
CREATE INDEX IF NOT EXISTS idx_kg_edge_graph ON kg_edge(graph_id);
CREATE INDEX IF NOT EXISTS idx_kg_edge_source ON kg_edge(source_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edge_target ON kg_edge(target_node_id);

-- ========================
-- 5. Competency Graph Metadata
-- ========================

CREATE TABLE IF NOT EXISTS comp_graph (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    owner_id        BIGINT  NOT NULL REFERENCES sys_user(id),
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    deleted         SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comp_assessment (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT  NOT NULL REFERENCES sys_user(id),
    graph_id        BIGINT  NOT NULL REFERENCES comp_graph(id),
    job_node_id     VARCHAR(256),
    result          JSONB,           -- { "skill_name": score, ... }
    gap_analysis    JSONB,           -- gap analysis result
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comp_learning_path (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT  NOT NULL REFERENCES sys_user(id),
    assessment_id   BIGINT  REFERENCES comp_assessment(id),
    path_data       JSONB NOT NULL,  -- ordered list of courses/resources
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ========================
-- 6. Security & Audit
-- ========================

CREATE TABLE IF NOT EXISTS sec_keyword (
    id              BIGSERIAL PRIMARY KEY,
    word            VARCHAR(256) NOT NULL,
    category        VARCHAR(64),         -- politics/violence/porn/custom
    severity        VARCHAR(32) NOT NULL DEFAULT 'block',  -- block/warn/replace
    status          SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sec_policy (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    rules           JSONB NOT NULL,      -- policy rules JSON
    target_type     VARCHAR(32),         -- all/role/org
    target_id       BIGINT,
    status          SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sec_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,
    session_id      VARCHAR(256),
    input_text      TEXT,
    output_text     TEXT,
    hit_rule        VARCHAR(256),
    action_taken    VARCHAR(32),         -- blocked/warned/passed
    details         JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sec_model_policy (
    id              BIGSERIAL PRIMARY KEY,
    role_id         BIGINT  NOT NULL REFERENCES sys_role(id),
    model_id        BIGINT  NOT NULL,
    allowed         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ========================
-- 7. Model & Channel
-- ========================

CREATE TABLE IF NOT EXISTS model_config (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    alias           VARCHAR(256),
    provider        VARCHAR(64)  NOT NULL,     -- openai/anthropic/zhipu/qwen/deepseek/custom
    model_name      VARCHAR(256) NOT NULL,
    api_key         VARCHAR(512),
    endpoint_url    VARCHAR(1024),
    capability      VARCHAR(64)  NOT NULL DEFAULT 'text',  -- text/image/video/audio
    context_window  INT,
    max_output      INT,
    user_limit      INT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    config          JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_permission (
    id              BIGSERIAL PRIMARY KEY,
    model_id        BIGINT NOT NULL REFERENCES model_config(id),
    role_id         BIGINT NOT NULL REFERENCES sys_role(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_usage_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT,
    model_id        BIGINT  NOT NULL REFERENCES model_config(id),
    session_id      VARCHAR(256),
    input_tokens    INT     NOT NULL DEFAULT 0,
    output_tokens   INT     NOT NULL DEFAULT 0,
    cost            NUMERIC(10,6) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_config (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    channel_type    VARCHAR(64)  NOT NULL,    -- feishu/wechat/web/portal
    config          JSONB,
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_agent_binding (
    id              BIGSERIAL PRIMARY KEY,
    channel_id      BIGINT NOT NULL REFERENCES channel_config(id),
    agent_id        BIGINT NOT NULL REFERENCES agent_definition(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, agent_id)
);

-- ========================
-- 8. AI Chat Session
-- ========================

CREATE TABLE IF NOT EXISTS ai_chat_session (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES sys_user(id),
    agent_id        VARCHAR(256),
    title           VARCHAR(512),
    last_message    TEXT,
    message_count   INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ========================
-- 9. User Channel Mapping
-- ========================

CREATE TABLE IF NOT EXISTS user_channel_mapping (
    id              BIGSERIAL PRIMARY KEY,
    channel_type    VARCHAR(64)  NOT NULL,
    channel_user_id VARCHAR(256) NOT NULL,
    platform_user_id BIGINT      NOT NULL REFERENCES sys_user(id),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE(channel_type, channel_user_id)
);

-- ========================
-- Initial Data
-- ========================

-- Default roles
INSERT INTO sys_role (code, name, description, sort_order) VALUES
    ('admin', 'System Administrator', 'Full access to all features', 1),
    ('info_center', 'Information Center', 'Manage models, agents, security, channels', 2),
    ('teacher', 'Teacher', 'Create agents, manage resources, view analytics', 3),
    ('student', 'Student', 'Use public agents, manage personal knowledge', 4)
ON CONFLICT (code) DO NOTHING;

-- Default users (BCrypt hashed passwords)
-- admin123, teacher123, student123
INSERT INTO sys_user (username, password, name, email, status) VALUES
    ('admin', '$2a$10$zJuzTpEoibBAu6VJ6t0VqegAPmbWTuE8KaOtGcNostkLZPEuOH1uO', 'System Admin', 'admin@edu.ai', 1),
    ('teacher', '$2a$10$whj3ui.qBUT7mUnOYiq8zu.Q.y2wdOc9aq6OZKKf3wgb1RCaztPtC', 'Zhang Teacher', 'teacher@edu.ai', 1),
    ('student', '$2a$10$qyVVHyQDg7Dfs9DWxcwPeeSjrlr9yM3Mi00YOGuRlYRHhrBGJbh96', 'Li Student', 'student@edu.ai', 1)
ON CONFLICT (username) DO NOTHING;

-- Assign roles
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r WHERE u.username = 'admin' AND r.code = 'admin'
ON CONFLICT DO NOTHING;
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r WHERE u.username = 'teacher' AND r.code = 'teacher'
ON CONFLICT DO NOTHING;
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r WHERE u.username = 'student' AND r.code = 'student'
ON CONFLICT DO NOTHING;

-- Default organization
INSERT INTO sys_org (name, code, type, sort_order) VALUES
    ('University', 'ROOT', 'school', 0),
    ('Computer Science College', 'CS', 'college', 1),
    ('Information Engineering College', 'IE', 'college', 2),
    ('Mathematics College', 'MATH', 'college', 3)
ON CONFLICT (code) DO NOTHING;

-- Default permissions
INSERT INTO sys_permission (code, name, sort_order) VALUES
    ('*', 'All Permissions', 0),
    ('chat', 'Chat Access', 1),
    ('agent', 'Agent Management', 2),
    ('agent:read', 'Agent Read Only', 3),
    ('skill', 'Skill Management', 4),
    ('plugin', 'Plugin Management', 5),
    ('model', 'Model Management', 6),
    ('teaching', 'Teaching Management', 7),
    ('teaching:read', 'Teaching Read Only', 8),
    ('resource', 'Resource Management', 9),
    ('resource:read', 'Resource Read Only', 10),
    ('knowledge', 'Knowledge Graph', 11),
    ('competency', 'Competency Graph', 12),
    ('system', 'System Management', 13),
    ('security', 'Security Management', 14),
    ('channel', 'Channel Management', 15)
ON CONFLICT (code) DO NOTHING;

-- Admin role gets all permissions
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'admin' AND p.code = '*'
ON CONFLICT DO NOTHING;

-- Info center role gets management permissions
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p
WHERE r.code = 'info_center' AND p.code IN ('chat','agent','skill','plugin','model','teaching','resource','knowledge','competency','system','security','channel')
ON CONFLICT DO NOTHING;

-- Teacher role permissions
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p
WHERE r.code = 'teacher' AND p.code IN ('chat','agent','skill','teaching','resource','knowledge','competency')
ON CONFLICT DO NOTHING;

-- Student role permissions
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p
WHERE r.code = 'student' AND p.code IN ('chat','agent:read','teaching:read','resource:read','knowledge','competency')
ON CONFLICT DO NOTHING;
