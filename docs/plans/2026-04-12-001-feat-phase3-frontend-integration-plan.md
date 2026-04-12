---
title: "feat: Phase 3 frontend integration — replace mock data with real backend APIs"
type: feat
status: active
date: 2026-04-12
---

# Phase 3 Frontend Integration

## Overview

Replace mock data imports in 6 frontend pages with real backend API calls for Phase 3 modules (auth, users, security, models, AI chat). Also fix H2 dev-profile compatibility so the backend can start without Docker/PostgreSQL.

## Problem Frame

Phase 3 backend is complete (61 Java files, 30+ endpoints, `mvn compile` passing), but the frontend still imports all data from `mocks/data.ts`. Cannot verify end-to-end behavior until frontend pages call real APIs. Additionally, the backend requires PostgreSQL (init.sql uses `BIGSERIAL`, `ON CONFLICT`) — need H2-compatible SQL for local dev without Docker.

## Requirements Trace

- R1. Backend starts with `mvn spring-boot:run` using H2 dev profile (no Docker needed)
- R2. Login/logout works end-to-end (frontend → backend → Sa-Token → DB)
- R3. User management page calls real `/api/users/*` APIs
- R4. Security keywords page calls real `/api/security/keywords/*` APIs
- R5. Model management page calls real `/api/models/*` APIs
- R6. Chat page routes through `/api/ai/chat/stream` instead of direct OpenClaw
- R7. All pages gracefully handle backend errors (show message, don't crash)
- R8. Mock data remains as fallback for non-Phase-3 pages (agents, resources, knowledge graph, etc.)

## Scope Boundaries

- Only Phase 3 pages: login, users, security, models, chat
- NOT touching: agents, skills, plugins, resources, knowledge graph, competency, dashboard, channels
- NOT changing backend Java code (Phase 3 backend is frozen)
- NOT adding comprehensive tests (deferred to Phase 6)

## Key Technical Decisions

- **H2 compatibility via `schema-h2.sql`**: Create a separate H2-compatible init script rather than making the PostgreSQL init.sql dual-compatible. Rationale: `BIGSERIAL` → `BIGINT AUTO_INCREMENT`, `ON CONFLICT` → `MERGE INTO` are too different to maintain in one file.
- **API service file per module**: Create `services/api.ts` with all Phase 3 API functions grouped by module. Rationale: one file is simpler than per-module files for 5 modules with 3-6 endpoints each.
- **Graceful degradation**: If backend returns error, show Ant Design `message.error()` and keep page functional. Don't redirect to login on every error.
- **Keep mock data file**: Don't delete `mocks/data.ts` — non-Phase-3 pages still need it.

## Implementation Units

- [ ] **Unit 1: H2-compatible init script for dev profile**

**Goal:** Backend starts and initializes DB schema using H2 in dev profile

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `edu-platform/edu-backend/src/main/resources/schema-h2.sql`
- Create: `edu-platform/edu-backend/src/main/resources/data-h2.sql`
- Modify: `edu-platform/edu-backend/src/main/resources/application-dev.yml`

**Approach:**
- Convert `BIGSERIAL` → `BIGINT AUTO_INCREMENT`, drop `ON CONFLICT` → use `MERGE INTO` or skip duplicates
- Split into schema (DDL) and data (DML) for clarity
- `application-dev.yml` set `spring.sql.init.schema-locations` + `spring.sql.init.data-locations`
- BCrypt passwords must be the same values as in init.sql

**Patterns to follow:**
- Existing `application-dev.yml` H2 config

**Test scenarios:**
- Happy path: `mvn spring-boot:run -Dspring-boot.run.profiles=dev` starts without error, H2 console shows all tables
- Happy path: `curl localhost:8080/api/auth/login` with admin/admin123 returns token
- Error path: Missing table → clear startup error pointing to schema-h2.sql

**Verification:**
- Backend starts with dev profile, `/api/health` returns 200, login works

- [ ] **Unit 2: Frontend API service layer**

**Goal:** Centralized API functions for all Phase 3 backend endpoints

**Requirements:** R2-R6

**Dependencies:** None

**Files:**
- Modify: `edu-platform/edu-admin/src/services/request.ts`

**Approach:**
- Add API functions grouped by module to the existing `request.ts`:
  - `userApi`: list, detail, create, update, delete, assignRoles, assignOrgs
  - `roleApi`: list, create, update, delete
  - `orgApi`: tree, create, update, delete
  - `securityApi`: keywords CRUD, policies CRUD, auditLogs, batchImport
  - `modelApi`: list, available, create, update, delete, setStatus, setDefault, permissions
  - `aiChatApi`: chat, chatStream (SSE), sessions, deleteSession, gatewayHealth
- SSE streaming helper: `chatStream()` returns an EventSource-like interface using `fetch` + `ReadableStream`
- All functions return typed responses matching existing `R<T>` wrapper: `{ code, message, data }`

**Patterns to follow:**
- Existing `authApi` pattern in `request.ts`

**Test scenarios:**
- Happy path: `userApi.list()` sends GET /api/users with auth header → returns paginated result
- Error path: 401 response → redirect to login (existing interceptor handles this)
- Edge case: Network error → Promise rejection handled by caller

**Verification:**
- All API functions exported and callable from page components

- [ ] **Unit 3: Login page integration verification**

**Goal:** Verify login already works E2E (it should — `authApi.login` already calls real backend)

**Requirements:** R2

**Dependencies:** Unit 1

**Files:**
- Modify: `edu-platform/edu-admin/src/pages/login/index.tsx` (only if needed)

**Approach:**
- Login page already calls `authApi.login` from `request.ts` — verify the response handling matches the new DB-backed response format
- Ensure `LoginResponse` fields (token, username, name, role, avatar, permissions) are all used correctly
- Fix any issues found during verification

**Test scenarios:**
- Happy path: admin/admin123 → login success → redirect to dashboard → correct menus
- Happy path: teacher/teacher123 → login → teacher menus visible
- Error path: wrong password → error message shown
- Error path: backend down → network error message

**Verification:**
- Three default accounts can log in and see role-appropriate menus

- [ ] **Unit 4: User management page — mock → real API**

**Goal:** Users page calls real /api/users/* endpoints

**Requirements:** R3, R7

**Dependencies:** Unit 2

**Files:**
- Modify: `edu-platform/edu-admin/src/pages/system/users/index.tsx`

**Approach:**
- Remove `import { mockUsers } from '@/mocks/data'`
- Replace with `userApi.list()`, `userApi.create()`, `userApi.update()`, `userApi.delete()`
- Add `useEffect` for initial data fetch with loading state
- Add `roleApi.list()` for role assignment drawer
- Add `orgApi.tree()` for org assignment
- Handle pagination with backend `PageResult`
- Show `message.error()` on API failures

**Test scenarios:**
- Happy path: Page loads → spinner → user list appears with real data (3 default users)
- Happy path: Create user → refresh list → new user appears
- Happy path: Assign role to user → confirm → role updated
- Error path: Backend error → error toast, table stays visible
- Edge case: Empty search result → "no data" message

**Verification:**
- Users page shows real DB data, CRUD operations persist across page refreshes

- [ ] **Unit 5: Security keywords page — mock → real API**

**Goal:** Security page calls real /api/security/* endpoints

**Requirements:** R4, R7

**Dependencies:** Unit 2

**Files:**
- Modify: `edu-platform/edu-admin/src/pages/system/security/index.tsx`

**Approach:**
- Remove `import { mockKeywords, mockAuditLogs } from '@/mocks/data'`
- Keywords tab: `securityApi.listKeywords()`, CRUD + batch import
- Audit logs tab: `securityApi.auditLogs()` with pagination
- Policies tab: if exists, wire to `securityApi.listPolicies()` etc.
- Handle status toggle (enable/disable keyword)

**Test scenarios:**
- Happy path: Add keyword "test" → keyword appears in list
- Happy path: Send chat message containing "test" → audit log entry appears
- Integration: Keyword CRUD → `reloadKeywords()` on backend → next chat checks new keywords

**Verification:**
- Keywords CRUD works, audit logs paginate correctly

- [ ] **Unit 6: Model management page — mock → real API**

**Goal:** Models page calls real /api/models/* endpoints

**Requirements:** R5, R7

**Dependencies:** Unit 2

**Files:**
- Modify: `edu-platform/edu-admin/src/pages/models/index.tsx`

**Approach:**
- Remove `import { mockModels } from '@/mocks/data'`
- Card view: `modelApi.list(capability)` for tab filtering
- Add model: `modelApi.create()` with form data
- Status toggle: `modelApi.setStatus()`
- Set default: `modelApi.setDefault()`
- Delete: `modelApi.delete()`
- API key input: password field, masked display from backend

**Test scenarios:**
- Happy path: Add model (name, provider, API key) → card appears → shows masked key
- Happy path: Set as default → blue "default" badge appears
- Happy path: Disable model → card grays out
- Error path: Invalid API key → backend error → error toast

**Verification:**
- Model CRUD persists, tab filtering works, API keys shown masked

- [ ] **Unit 7: Chat page — direct OpenClaw → backend proxy**

**Goal:** Chat page sends messages through backend proxy `/api/ai/chat/stream` instead of direct OpenClaw connection

**Requirements:** R6, R7

**Dependencies:** Unit 2, Unit 1 (backend must be running)

**Files:**
- Modify: `edu-platform/edu-admin/src/pages/chat/index.tsx`

**Approach:**
- Remove direct OpenClaw Gateway calls (currently via Vite proxy `/gateway/v1/chat/completions`)
- Replace with `aiChatApi.chatStream()` → SSE through backend proxy
- Backend proxy handles: auth → security check → model permission → forward to OpenClaw → output audit
- Session management: `aiChatApi.sessions()` for sidebar, `aiChatApi.deleteSession()` for delete
- Gateway health: `aiChatApi.gatewayHealth()` for connection status indicator
- Keep mock fallback: if backend is unavailable, fall back to mock stream response

**Test scenarios:**
- Happy path: Send message → backend proxies to OpenClaw → SSE stream renders in chat
- Happy path: Message with security keyword → blocked response with friendly message
- Happy path: Session list shows real sessions from DB
- Error path: Backend down → fallback to mock or error message
- Error path: OpenClaw down → "AI service unavailable" error from backend

**Verification:**
- Chat messages route through backend (visible in backend logs), security checks apply, sessions persist

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| H2 SQL compatibility gaps | Test all tables + initial data at startup; fix mismatches iteratively |
| SSE streaming through backend may have different format than direct OpenClaw | Compare response formats; add adapter if needed |
| CRYPTO_SECRET_KEY not set in dev → model create fails | Set default in dev profile or skip encryption for dev |
| OpenClaw Gateway not running → chat won't work | Keep mock fallback in chat page |

## Sources & References

- Related code: `edu-platform/edu-admin/src/services/request.ts` (existing API layer)
- Related code: `edu-platform/edu-admin/src/mocks/data.ts` (mock data to replace)
- Related plan: `claude-doc/15-Phase3-后端第一批实施计划.md` (backend API spec)
- Learning: `docs/solutions/best-practices/spring-boot-phase-development-skill-chain-2026-04-12.md`
