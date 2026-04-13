-- ============================================================
-- Higher Education AI Platform - H2 Initial Data (Dev Profile)
-- ============================================================

-- Default roles
MERGE INTO sys_role (code, name, description, sort_order) KEY(code) VALUES
    ('admin', 'System Administrator', 'Full access to all features', 1);
MERGE INTO sys_role (code, name, description, sort_order) KEY(code) VALUES
    ('info_center', 'Information Center', 'Manage models, agents, security, channels', 2);
MERGE INTO sys_role (code, name, description, sort_order) KEY(code) VALUES
    ('teacher', 'Teacher', 'Create agents, manage resources, view analytics', 3);
MERGE INTO sys_role (code, name, description, sort_order) KEY(code) VALUES
    ('student', 'Student', 'Use public agents, manage personal knowledge', 4);

-- Default users (BCrypt hashed passwords: admin123, teacher123, student123)
MERGE INTO sys_user (username, password, name, email, status) KEY(username) VALUES
    ('admin', '$2a$10$zJuzTpEoibBAu6VJ6t0VqegAPmbWTuE8KaOtGcNostkLZPEuOH1uO', 'System Admin', 'admin@edu.ai', 1);
MERGE INTO sys_user (username, password, name, email, status) KEY(username) VALUES
    ('teacher', '$2a$10$whj3ui.qBUT7mUnOYiq8zu.Q.y2wdOc9aq6OZKKf3wgb1RCaztPtC', 'Zhang Teacher', 'teacher@edu.ai', 1);
MERGE INTO sys_user (username, password, name, email, status) KEY(username) VALUES
    ('student', '$2a$10$qyVVHyQDg7Dfs9DWxcwPeeSjrlr9yM3Mi00YOGuRlYRHhrBGJbh96', 'Li Student', 'student@edu.ai', 1);

-- Assign roles (using subselect for H2 compatibility)
MERGE INTO sys_user_role (user_id, role_id) KEY(user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r WHERE u.username = 'admin' AND r.code = 'admin';
MERGE INTO sys_user_role (user_id, role_id) KEY(user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r WHERE u.username = 'teacher' AND r.code = 'teacher';
MERGE INTO sys_user_role (user_id, role_id) KEY(user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r WHERE u.username = 'student' AND r.code = 'student';

-- Default organizations
MERGE INTO sys_org (name, code, type, sort_order) KEY(code) VALUES
    ('University', 'ROOT', 'school', 0);
MERGE INTO sys_org (name, code, type, sort_order) KEY(code) VALUES
    ('Computer Science College', 'CS', 'college', 1);
MERGE INTO sys_org (name, code, type, sort_order) KEY(code) VALUES
    ('Information Engineering College', 'IE', 'college', 2);
MERGE INTO sys_org (name, code, type, sort_order) KEY(code) VALUES
    ('Mathematics College', 'MATH', 'college', 3);

-- Default permissions
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('*', 'All Permissions', 0);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('chat', 'Chat Access', 1);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('agent', 'Agent Management', 2);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('agent:read', 'Agent Read Only', 3);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('skill', 'Skill Management', 4);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('plugin', 'Plugin Management', 5);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('model', 'Model Management', 6);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('teaching', 'Teaching Management', 7);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('teaching:read', 'Teaching Read Only', 8);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('resource', 'Resource Management', 9);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('resource:read', 'Resource Read Only', 10);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('knowledge', 'Knowledge Graph', 11);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('competency', 'Competency Graph', 12);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('system', 'System Management', 13);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('security', 'Security Management', 14);
MERGE INTO sys_permission (code, name, sort_order) KEY(code) VALUES ('channel', 'Channel Management', 15);

-- Admin role gets all permissions
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'admin' AND p.code = '*';

-- Info center role permissions
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'chat';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'agent';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'skill';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'plugin';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'model';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'system';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'security';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'info_center' AND p.code = 'channel';

-- Teacher role permissions
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'teacher' AND p.code = 'chat';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'teacher' AND p.code = 'agent';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'teacher' AND p.code = 'skill';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'teacher' AND p.code = 'teaching';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'teacher' AND p.code = 'resource';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'teacher' AND p.code = 'knowledge';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'teacher' AND p.code = 'competency';

-- Student role permissions
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'student' AND p.code = 'chat';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'student' AND p.code = 'agent:read';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'student' AND p.code = 'teaching:read';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'student' AND p.code = 'resource:read';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'student' AND p.code = 'knowledge';
MERGE INTO sys_role_permission (role_id, permission_id) KEY(role_id, permission_id)
SELECT r.id, p.id FROM sys_role r, sys_permission p WHERE r.code = 'student' AND p.code = 'competency';

-- Sample resource categories
MERGE INTO res_category (name, parent_id, sort_order) KEY(name) VALUES ('教材课件', 0, 1);
MERGE INTO res_category (name, parent_id, sort_order) KEY(name) VALUES ('试题试卷', 0, 2);
MERGE INTO res_category (name, parent_id, sort_order) KEY(name) VALUES ('视频音频', 0, 3);
MERGE INTO res_category (name, parent_id, sort_order) KEY(name) VALUES ('论文文献', 0, 4);

-- Sample default agent (Main Agent)
MERGE INTO agent_definition (name, description, avatar, category, agent_type, status, owner_id, is_public, use_count, deleted)
KEY(name)
VALUES ('Main Agent', 'OpenClaw Gateway 默认智能体。对话能力由 OpenClaw 本地配置决定，平台侧 Agent 配置需同步到 OpenClaw 后生效。', '🤖', 'general', 'openclaw', 'published', 1, true, 0, 0);

-- Sample skills
MERGE INTO skill_definition (name, description, skill_type, owner_id, is_public, status, deleted)
KEY(name)
VALUES ('教务查询', '查询课表、成绩、选课信息', 'query', 1, true, 1, 0);
MERGE INTO skill_definition (name, description, skill_type, owner_id, is_public, status, deleted)
KEY(name)
VALUES ('知识库检索', '从向量知识库检索相关内容', 'query', 1, true, 1, 0);

-- Sample knowledge graph
MERGE INTO kg_graph (name, description, owner_id, is_public, node_count, edge_count, status, deleted)
KEY(name) VALUES ('计算机科学基础', '计算机科学核心知识图谱', 1, true, 5, 4, 'active', 0);

-- Sample knowledge graph nodes
INSERT INTO kg_node (graph_id, name, node_type, description) VALUES
(1, '数据结构', 'chapter', '数据结构与算法基础'),
(1, '排序算法', 'section', '常见排序算法'),
(1, '快速排序', 'concept', '分治思想的排序算法，平均时间复杂度O(nlogn)'),
(1, '二叉树', 'section', '树形数据结构'),
(1, '图论基础', 'section', '图的表示与遍历');

-- Sample knowledge graph edges
INSERT INTO kg_edge (graph_id, source_node_id, target_node_id, edge_type) VALUES
(1, 1, 2, 'CONTAINS'),
(1, 2, 3, 'CONTAINS'),
(1, 1, 4, 'CONTAINS'),
(1, 4, 5, 'PREREQUISITE');

-- Sample competency graph
MERGE INTO comp_graph (name, description, owner_id, is_public, status, deleted)
KEY(name) VALUES ('软件工程师能力图谱', '软件工程师岗位能力模型', 1, true, 'active', 0);
