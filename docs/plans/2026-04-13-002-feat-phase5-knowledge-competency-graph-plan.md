---
title: "feat: Phase 5 backend — knowledge graph 5-step construction + competency graph"
type: feat
status: active
date: 2026-04-13
---

# Phase 5 Backend — Knowledge Graph + Competency Graph

## Overview

Implement knowledge graph service (M13) with five-step progressive construction and knowledge retrieval, plus competency graph service (M14) with gap analysis and learning path recommendation. Key architectural decision: all graph data stored in PostgreSQL (nodes/edges as rows) for H2 dev compatibility, with Neo4j integration as an optional enhancement layer when Docker is running.

## Problem Frame

Phase 4 delivered resource upload and agent management. Phase 5 adds the intelligence layer: structured knowledge representation (knowledge graph) and personalized learning paths (competency graph). The five-step construction process is the core innovation — human-AI collaborative graph building with continuous growth.

## Requirements Trace

- R1. Knowledge graph CRUD (create/list/detail/delete, public/private)
- R2. Graph node and edge CRUD (stored in PostgreSQL, compatible with H2 dev profile)
- R3. Five-step construction API: skeleton → extract → review → attach → query
- R4. LLM entity/relation extraction via OpenClaw Agent (Step 2)
- R5. Knowledge attachment: text snippets linked to graph nodes (Step 4)
- R6. Knowledge query: graph traversal + semantic search → LLM answer (Step 5)
- R7. Competency graph CRUD with Job→Competency→Course hierarchy
- R8. Student competency assessment and gap analysis
- R9. Learning path generation based on gap analysis
- R10. All endpoints respect Sa-Token auth and role permissions

## Scope Boundaries

- Neo4j Cypher operations are optional enhancement, NOT required for basic functionality
- pgvector embedding storage is stubbed — vector columns defined but embedding generation deferred
- No MinerU integration (no GPU) — document parsing placeholder only
- NOT implementing full GraphRAG pipeline — simplified graph-augmented retrieval
- Frontend integration is Phase 6

### Deferred to Separate Tasks

- Neo4j native graph operations: when Docker infra is running
- pgvector embedding generation: when Embedding service is configured
- MinerU document parsing: when GPU is available

## Key Technical Decisions

- **Graph nodes/edges in PostgreSQL**: New tables `kg_node` and `kg_edge` store graph structure as relational data. This ensures H2 dev compatibility. Neo4j sync is a separate optional layer.
- **LLM extraction via OpenClaw**: Reuse existing `OpenClawClient` to call LLM for entity/relation extraction. Design extraction prompt as a system message + user content.
- **Knowledge query = graph traversal + text match**: In PostgreSQL mode, traverse edges via SQL joins (2 levels deep), then match attached text snippets. No vector search in initial implementation.
- **Competency gap analysis**: Simple numeric comparison — student scores vs job requirements. No ML model needed for demo.
- **Learning path**: Topological sort of prerequisite chain from competency graph, filtered by gap results.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
Five-Step Knowledge Graph Construction:

Step 1: Skeleton ─────────────────────────────────────────────
  User defines top-level structure OR uploads doc for LLM extraction
  → POST /api/knowledge/graphs/{id}/skeleton
  → Creates kg_node rows (chapter/section/concept)
  → Creates kg_edge rows (CONTAINS, PREREQUISITE)

Step 2: Entity Extraction ────────────────────────────────────
  Upload document → create kg_build_task(type=extract)
  → Background: call OpenClaw LLM with extraction prompt
  → LLM returns JSON: {entities: [...], relations: [...]}
  → Store as kg_build_task.result (JSONB)
  → Status: pending → extracting → extracted

Step 3: Human Review ─────────────────────────────────────────
  GET /api/knowledge/graphs/{id}/build-tasks/{taskId}/results
  → Returns extracted entities/relations for review
  POST /api/knowledge/graphs/{id}/build-tasks/{taskId}/approve
  → Approved items → create kg_node + kg_edge rows
  → Rejected items → discarded

Step 4: Continuous Attachment ─────────────────────────────────
  Upload new document → LLM slices into chunks
  → Each chunk matched to most relevant kg_node
  → Create kg_attachment (node_id, content_snippet, file_id)

Step 5: Knowledge Query ──────────────────────────────────────
  POST /api/knowledge/query
  → Extract keywords from question
  → Find matching kg_node by name/description
  → Traverse 2 levels of kg_edge (related nodes)
  → Collect kg_attachment snippets from matched nodes
  → Send snippets + question to LLM → generate answer
```

## Implementation Units

- [ ] **Unit 1: Knowledge graph node/edge tables + Entity/Mapper**

**Goal:** PostgreSQL tables for graph nodes and edges; entity classes and mappers

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `edu-platform/sql/init.sql` (add kg_node, kg_edge tables)
- Modify: `edu-platform/edu-backend/src/main/resources/schema-h2.sql` (H2 versions)
- Create: `entity/KgNode.java`, `entity/KgEdge.java`
- Create: `entity/KgGraph.java`, `entity/KgBuildTask.java`, `entity/KgAttachment.java`
- Create: `mapper/KgNodeMapper.java`, `mapper/KgEdgeMapper.java`
- Create: `mapper/KgGraphMapper.java`, `mapper/KgBuildTaskMapper.java`, `mapper/KgAttachmentMapper.java`

**Approach:**
- `kg_node`: id, graph_id, name, type (chapter/section/concept/formula), description, parent_id, properties JSONB
- `kg_edge`: id, graph_id, source_node_id, target_node_id, edge_type (CONTAINS/PREREQUISITE/RELATES_TO), properties JSONB
- Reuse existing kg_graph/kg_build_task/kg_attachment tables from init.sql

**Patterns to follow:**
- Phase 3/4 Entity pattern (TableName, IdType.AUTO, FieldFill)

**Test scenarios:**
- Happy path: create graph → add nodes → add edges → query returns graph structure
- Edge case: circular edge reference → should be allowed (graph, not tree)

**Verification:**
- Backend starts with H2 dev profile; kg_node and kg_edge tables created

- [ ] **Unit 2: Knowledge graph CRUD Service + Controller**

**Goal:** Graph metadata CRUD with node/edge management APIs

**Requirements:** R1, R2

**Dependencies:** Unit 1

**Files:**
- Create: `service/KgGraphService.java`
- Create: `controller/KgGraphController.java`

**Approach:**
- Graph CRUD: create/list/detail/delete with public/private filtering (same pattern as AgentService)
- Node CRUD: `POST/PUT/DELETE /api/knowledge/graphs/{graphId}/nodes`
- Edge CRUD: `POST/PUT/DELETE /api/knowledge/graphs/{graphId}/edges`
- Batch node/edge retrieval: `GET /api/knowledge/graphs/{graphId}/data` returns all nodes + edges for G6 rendering

**Patterns to follow:**
- `AgentService` for permission-filtered listing
- `ResFileController` for nested resource pattern

**Test scenarios:**
- Happy path: create graph → add 3 nodes → add 2 edges → GET data returns complete graph
- Happy path: public graph visible to all users; private only to owner
- Error path: add edge referencing non-existent node → 400

**Verification:**
- All CRUD endpoints functional; graph data endpoint returns nodes + edges together

- [ ] **Unit 3: Five-step construction — Steps 1-3 (Skeleton + Extract + Review)**

**Goal:** Skeleton creation, LLM entity extraction, and human review APIs

**Requirements:** R3, R4

**Dependencies:** Unit 2

**Files:**
- Create: `service/KgBuildService.java`
- Modify: `controller/KgGraphController.java` (add build endpoints)

**Approach:**
- Step 1 skeleton: accept JSON array of nodes/edges → batch insert
- Step 1 LLM-assisted: send document text to OpenClaw with extraction prompt → parse response → return suggested skeleton for user confirmation
- Step 2 extract: create build task → async call OpenClaw LLM with entity extraction prompt → store result JSON in kg_build_task.result
- Step 3 review: GET task results → user approves/rejects → approved items become kg_node/kg_edge rows
- Extraction prompt design: system message defines entity types and relation types for education domain

**Patterns to follow:**
- `OpenClawClient.chatCompletion()` for LLM calls
- `ResParseTask` for async task status pattern

**Test scenarios:**
- Happy path: submit text → build task created (pending) → poll status → extracted → get results → approve → nodes created
- Happy path: LLM skeleton extraction returns valid JSON with entities and relations
- Error path: OpenClaw unavailable → build task status = failed with error message
- Edge case: empty document text → return empty extraction result, not error

**Verification:**
- Build task lifecycle works: pending → extracting → extracted → approved
- Approved entities become real graph nodes

- [ ] **Unit 4: Five-step construction — Steps 4-5 (Attach + Query)**

**Goal:** Knowledge attachment to graph nodes and graph-augmented knowledge retrieval

**Requirements:** R5, R6

**Dependencies:** Unit 3

**Files:**
- Create: `service/KgQueryService.java`
- Modify: `controller/KgGraphController.java` (add attach + query endpoints)

**Approach:**
- Step 4 attach: POST text snippet + target node ID → create kg_attachment row
- Step 4 auto-attach: send text + node list to LLM → LLM returns best matching node ID → create attachment
- Step 5 query: POST question → keyword match against kg_node.name/description → traverse kg_edge 2 levels → collect kg_attachment.content_snippet → send to LLM with context → return answer + references
- Query is synchronous for demo (no streaming needed for knowledge retrieval)

**Patterns to follow:**
- `AiChatController.chat()` for LLM query pattern

**Test scenarios:**
- Happy path: attach snippet to node → query related topic → snippet appears in LLM context → answer references the snippet
- Happy path: query with no matching nodes → fallback to general LLM answer
- Edge case: graph with no attachments → return empty references, LLM answers from general knowledge

**Verification:**
- Attached knowledge is retrievable via graph query
- LLM answer includes reference to source knowledge

- [ ] **Unit 5: Competency graph — Entity/Service/Controller**

**Goal:** Competency graph CRUD with Job→Competency→Course hierarchy

**Requirements:** R7

**Dependencies:** Unit 1 (reuses kg_node/kg_edge pattern)

**Files:**
- Create: `entity/CompGraph.java`, `entity/CompAssessment.java`, `entity/CompLearningPath.java`
- Create: `mapper/CompGraphMapper.java`, `mapper/CompAssessmentMapper.java`, `mapper/CompLearningPathMapper.java`
- Create: `service/CompGraphService.java`
- Create: `controller/CompGraphController.java`

**Approach:**
- Reuse kg_node/kg_edge tables with graph_id scoping for competency graphs (or use separate comp_node/comp_edge — decide at implementation)
- Actually: use comp_graph metadata table (already exists) + dedicated node/edge approach within the same kg_node/kg_edge tables, differentiated by graph_id linked to comp_graph vs kg_graph
- Job/Competency/Course CRUD as specialized node types
- Graph data endpoint returns full hierarchy for G6 rendering

**Patterns to follow:**
- `KgGraphService` for graph CRUD pattern (Unit 2)

**Test scenarios:**
- Happy path: create competency graph → add Job node → add Competency nodes → link with REQUIRES edges → GET data returns hierarchy
- Happy path: public/private filtering same as knowledge graph

**Verification:**
- Competency graph CRUD works; Job→Competency→Course hierarchy representable

- [ ] **Unit 6: Gap analysis + Learning path generation**

**Goal:** Student assessment, gap analysis against job requirements, and learning path recommendation

**Requirements:** R8, R9

**Dependencies:** Unit 5

**Files:**
- Create: `service/CompAssessmentService.java`
- Modify: `controller/CompGraphController.java` (add assessment + gap + path endpoints)

**Approach:**
- Assessment: POST student scores as JSON `{competencyId: score}` → store in comp_assessment
- Gap analysis: compare student scores against job node's required competency scores → return list of gaps `{competency, current, required, gap}`
- Learning path: from gap list → find prerequisite chain via kg_edge traversal → topological sort → return ordered list of courses/resources to study
- Optional LLM enhancement: send gap list to LLM for natural language learning plan

**Patterns to follow:**
- `SecurityCheckService.CheckResult` for structured result pattern

**Test scenarios:**
- Happy path: submit assessment → gap analysis → 3 gaps identified → learning path returns 5 courses in order
- Edge case: student meets all requirements → empty gap list → "No gaps" response
- Edge case: competency with no prerequisite chain → path is just that competency's courses

**Verification:**
- Assessment stored; gap analysis returns correct deltas; learning path is topologically ordered

- [ ] **Unit 7: H2 data + compile verification**

**Goal:** Sample data for dev profile and full compilation check

**Requirements:** R1-R10

**Dependencies:** Units 1-6

**Files:**
- Modify: `edu-platform/edu-backend/src/main/resources/schema-h2.sql` (add kg_node, kg_edge)
- Modify: `edu-platform/edu-backend/src/main/resources/data-h2.sql` (sample graph data)

**Approach:**
- Add kg_node/kg_edge to H2 schema
- Sample knowledge graph with 5 nodes and 4 edges
- Sample competency graph with Job→3 Competencies→3 Courses

**Test scenarios:**
- Happy path: `mvn spring-boot:run -Dspring-boot.run.profiles=dev -P no-redis` → starts → all Phase 5 APIs return data

**Verification:**
- Backend starts; all Phase 5 endpoints accessible

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| LLM extraction returns malformed JSON | Parse with try/catch; store raw response; allow manual review |
| OpenClaw unavailable → extraction fails | Build task transitions to "failed" with error message; user can retry |
| Graph traversal performance on large graphs | Limit traversal depth to 2 levels; add index on graph_id + source/target |
| pgvector not available in H2 | Skip vector columns in H2 schema; embedding features deferred |

## Sources & References

- Origin: `claude-doc/13-系统模块规划与实施计划.md` Phase 5
- Tech analysis: `claude-doc/16-五步图谱构建技术可行性分析.md`
- Pattern: Phase 3/4 Entity→Mapper→Service→Controller
- LLM integration: `service/OpenClawClient.java`
