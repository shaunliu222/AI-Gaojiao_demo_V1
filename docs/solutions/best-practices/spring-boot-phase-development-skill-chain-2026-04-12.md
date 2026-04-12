---
title: Spring Boot Phase Development with Skill Workflow Chain
date: 2026-04-12
category: best-practices
module: edu-platform
problem_type: best_practice
component: development_workflow
severity: medium
applies_when:
  - Implementing a new Phase (multi-module backend feature batch)
  - Any development task requiring more than 3 files of changes
  - Transitioning from planning to implementation to delivery
tags:
  - skill-workflow
  - phase-development
  - spring-boot
  - code-review
  - openclaw-integration
  - sa-token
  - mybatis-plus
---

# Spring Boot Phase Development with Skill Workflow Chain

## Context

During Phase 3 development of the edu-platform backend (4 modules, 61 Java files, 30+ API endpoints), the initial implementation skipped several critical workflow steps: `ce-work` for incremental execution, `ce-review` for code review, `simplify` for code quality, `commit` for git, and `ce-compound` for knowledge capture. This resulted in code shipped without review, missing security issues that were caught only after a manual review pass was triggered. (auto memory [claude])

The root cause was treating Skill invocation as optional rather than mandatory workflow stages. The correct approach is a strict 6-step Skill chain that ensures quality gates at every stage.

## Guidance

### The Mandatory Skill Chain

Every development task (Phase-level or standalone feature) must follow this chain in order:

```
/ce-plan → /ce-work → /ce-review → /simplify → /commit → /ce-compound
```

### Phase 3 Implementation Pattern (Spring Boot + MyBatis-Plus + Sa-Token)

The following module implementation order proved effective for Phase 3:

```
Phase A: Common Infrastructure
  - PageResult.java (pagination wrapper for MyBatis-Plus IPage)
  - CryptoUtil.java (AES-GCM for API key encryption)
  - MetaObjectHandler (auto-fill createdAt/updatedAt)
  - GlobalExceptionHandler (Sa-Token NotLoginException/NotRoleException)
  - init.sql updates (new tables, BCrypt passwords, permission data)

Phase B: Authentication (M10) — all other modules depend on this
  - Entity → Mapper → Service → Controller flow
  - SysUser/SysRole/SysOrg with user-role-org join tables
  - StpInterfaceImpl for Sa-Token permission loading from DB
  - Rewrite mock AuthController to use real DB + BCrypt

Phase C: Model Management (M17) — needed by AI gateway for permission checks
Phase D: Security Policies (M15) — needed by AI gateway for content filtering
Phase E: AI Gateway Proxy (M16) — depends on M15 + M17
  - OpenClawClient (WebClient → OpenClaw /v1/chat/completions)
  - SseEmitter for SSE streaming proxy
  - Request chain: auth → security check → model permission → forward → output audit
```

### Key Code Review Findings to Internalize

These issues were found during the ce-review pass and should be prevented in future Phases:

1. **Never hardcode crypto keys** — `CryptoUtil` had a `DEFAULT_KEY` fallback. Force `CRYPTO_SECRET_KEY` env var.
2. **Don't leak security filter details** — Error messages like "blocked: 敏感词" help attackers probe boundaries. Use generic messages.
3. **`@Async` self-invocation is a no-op** — Spring AOP proxy is bypassed. Extract async methods to a separate `@Service` bean.
4. **Bound thread pools** — `Executors.newCachedThreadPool()` is unbounded. Use `newFixedThreadPool(cores * 2)`.
5. **Add timeouts to `.block()` calls** — WebClient Mono without timeout can block indefinitely.
6. **Protect all query endpoints** — `GET /api/users/{id}/roles` without `@SaCheckRole` allows any user to enumerate others' roles.
7. **Never return encrypted values** — `createModel()` was returning the AES ciphertext to the client.

## Why This Matters

Skipping the Skill workflow chain means:
- **No code review** — security vulnerabilities (hardcoded keys, info leaks) ship to production
- **No git history** — changes are untracked, making rollback and blame impossible
- **No knowledge capture** — the same mistakes repeat in Phase 4, 5, 6
- **No quality gate** — dead code, unused parameters, and performance issues accumulate

The 6-step chain adds ~10 minutes per development session but catches P0/P1 issues before they become production incidents.

## When to Apply

- Every Phase implementation (Phase 4: Resource Center, Phase 5: Knowledge Graph, etc.)
- Any feature adding more than 3 files
- Any code touching authentication, security, or external API integration
- After completing a batch of related changes before moving to the next batch

## Examples

### Before (Phase 3 initial approach — wrong)

```
Read docs → Plan manually → Write all code → Report completion
(no review, no commit, no knowledge capture)
```

### After (correct workflow)

```
/ce-plan    → Structured plan in docs/plans/ with implementation units
/ce-work    → Execute each unit incrementally with verification
/ce-review  → 10+ reviewer agents find security, reliability, performance issues
/simplify   → Code reuse, quality, efficiency check
/commit     → Conventional commit with detailed message
/ce-compound → Document learnings for future Phases
```

### Module Implementation Template (per Phase)

```java
// Step 1: Entity (matches init.sql table)
@Data @TableName("xxx") public class Xxx { ... }

// Step 2: Mapper (extends BaseMapper, custom queries via @Select)
public interface XxxMapper extends BaseMapper<Xxx> { ... }

// Step 3: Service (extends ServiceImpl, business logic)
@Service public class XxxService extends ServiceImpl<XxxMapper, Xxx> { ... }

// Step 4: Controller (REST endpoints + @SaCheckRole)
@RestController @RequestMapping("/api/xxx")
@SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
public class XxxController { ... }
```

## Related

- `claude-doc/15-Phase3-后端第一批实施计划.md` — Phase 3 implementation plan
- `claude-doc/13-系统模块规划与实施计划.md` — Overall module plan (Phases 1-7)
- Memory: `feedback_skill_workflow.md` — Skill chain enforcement rule
