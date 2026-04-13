---
title: "feat: WebSocket gateway client — full session sync with Feishu"
type: feat
status: active
date: 2026-04-13
---

# WebSocket Gateway Client — Full Session Sync

## Overview

Replace the HTTP REST API proxy (`/v1/chat/completions`) with a WebSocket connection to OpenClaw Gateway, using the native `chat.send` RPC method. This makes Web chat messages go through the same `dispatchInboundMessage()` → Agent Runtime → Session Transcript → ReplyDispatcher pipeline as Feishu Channel messages, enabling full bidirectional sync.

## Problem Frame

Current HTTP API (`POST /v1/chat/completions`) is stateless — each call is independent, doesn't enter OpenClaw's Session system, and doesn't trigger Channel message delivery. Feishu users and Web users talking to the same Agent have completely separate conversations.

## Requirements Trace

- R1. Web chat messages enter OpenClaw Session Transcript (same as Feishu)
- R2. Same user on Web and Feishu shares conversation context
- R3. Agent replies streamed back to Web via event frames
- R4. Security checks (keyword filter) still apply before forwarding
- R5. Connection management: auto-reconnect, graceful error handling

## Scope Boundaries

- NOT modifying OpenClaw core source code — using existing `gateway-client` ID + `backend` mode
- NOT implementing full WebSocket proxy to frontend (Spring Boot acts as WS client, frontend still uses SSE)
- NOT changing Feishu Channel configuration

## Key Technical Decisions

- **Client ID**: Use `gateway-client` (already in whitelist) with mode `backend` and role `operator`
- **Architecture**: Spring Boot backend maintains a persistent WebSocket connection to OpenClaw as a "backend client". Frontend still uses SSE via `/api/ai/chat/stream`. Backend bridges SSE↔WS.
- **SessionKey**: `agent:{agentId}:session:web-{userId}` — the `web-` prefix ensures Web sessions are identifiable but follow the standard format
- **Connection lifecycle**: Singleton WebSocket connection created on first chat request, auto-reconnect on disconnect. Connection shared across all users (messages differentiated by sessionKey).

## High-Level Technical Design

> *Directional guidance, not implementation specification.*

```
Frontend (SSE)                 Spring Boot                    OpenClaw Gateway (WS)
─────────────                  ────────────                   ─────────────────────
POST /api/ai/chat/stream  →   AiChatController
                               │ security check
                               │ build sessionKey
                               ▼
                               OpenClawWsClient
                               │ if not connected: connect()
                               │   → ws://localhost:18789
                               │   → connect frame {client: "gateway-client", mode: "backend", auth: {token}}
                               │   ← hello.ok
                               │
                               │ send request frame:
                               │   {method: "chat.send", params: {text, sessionKey}}
                               │
                               │ receive event frames:           → dispatchInboundMessage()
                               │   ← {type: "chat.delta", text}  → Agent Runtime
                               │   ← {type: "chat.delta", text}  → Session Transcript ✓
                               │   ← {type: "chat.done"}         → ReplyDispatcher ✓
                               ▼                                    (飞书 also gets notified)
                               SseEmitter.send(delta)
                               SseEmitter.complete()
─────────────                  ────────────                   ─────────────────────
← SSE event: data              
← SSE event: [DONE]
```

## Implementation Units

- [ ] **Unit 1: OpenClawWsClient — WebSocket connection + protocol**

**Goal:** Singleton WebSocket client that connects to OpenClaw Gateway using the native frame protocol

**Requirements:** R1, R3, R5

**Files:**
- Create: `edu-platform/edu-backend/src/main/java/com/edu/ai/service/OpenClawWsClient.java`

**Approach:**
- Use Java WebSocket client (`jakarta.websocket` or Spring `WebSocketClient`)
- Connect to `ws://localhost:18789` with OpenClaw frame protocol:
  1. Receive `connect.challenge` → respond
  2. Send `connect` frame: `{client: {id: "gateway-client", name: "edu-platform", mode: "backend"}, role: "operator", auth: {token: gatewayToken}}`
  3. Receive `hello.ok` → connected
- `sendChatMessage(text, sessionKey)` → send `request` frame: `{method: "chat.send", params: {text, sessionKey}}`
- Receive `event` frames with `chat.delta` / `chat.done` types → callback to registered listener
- Auto-reconnect on disconnect with exponential backoff
- Thread-safe: multiple users share one connection, responses routed by request seq number

**Patterns to follow:**
- `OpenClawClient.java` for config injection pattern

**Test scenarios:**
- Happy path: connect → hello.ok → send chat.send → receive delta events → done
- Error path: Gateway not available → graceful fallback to HTTP API
- Reconnect: connection drops → auto-reconnect within 5s

**Verification:**
- WebSocket connection established; chat.send returns streamed delta events

- [ ] **Unit 2: AiChatController — switch to WebSocket client**

**Goal:** Chat endpoints use WebSocket client instead of HTTP API

**Requirements:** R1, R4

**Dependencies:** Unit 1

**Files:**
- Modify: `edu-platform/edu-backend/src/main/java/com/edu/ai/controller/AiChatController.java`

**Approach:**
- `/api/ai/chat/stream`: try OpenClawWsClient first → if WS not connected, fall back to HTTP API
- Security check still runs before sending to WS
- Bridge WS events → SseEmitter events
- SessionKey format: `agent:{agentId}:session:web-{userId}`

**Test scenarios:**
- Happy path: POST /api/ai/chat/stream → WS chat.send → delta events → SSE to frontend
- Fallback: WS disconnected → falls back to HTTP API transparently
- Integration: message appears in OpenClaw session transcript

**Verification:**
- Web chat goes through WS; session transcript shows the conversation

- [ ] **Unit 3: Feishu session key alignment**

**Goal:** Ensure Feishu Channel messages use compatible sessionKey format

**Requirements:** R2

**Dependencies:** Unit 1

**Files:**
- Modify: `openclaw-config/mcp-edu-server.yaml` (document Feishu session config)

**Approach:**
- OpenClaw's Feishu Channel generates sessionKey based on channel user ID
- To share context: both Web and Feishu must resolve to the same sessionKey for the same platform user
- Use `user_channel_mapping` from previous integration to map feishu_user_id → platform_user_id
- SessionKey: `agent:{agentId}:session:user-{platformUserId}` (unified across both)
- Document the configuration needed in OpenClaw's Feishu Channel settings

**Test scenarios:**
- Integration: Web user sends "hello" → Feishu same user sends "继续" → Agent has context of "hello"

**Verification:**
- Cross-channel conversation continuity verified

- [ ] **Unit 4: Connection management + error handling + docs**

**Goal:** Production-ready connection management and updated deployment docs

**Requirements:** R5

**Dependencies:** Unit 1-3

**Files:**
- Modify: `edu-platform/edu-backend/src/main/java/com/edu/ai/service/OpenClawWsClient.java`
- Modify: `edu-platform/DEPLOY.md`

**Approach:**
- Health check endpoint: GET /api/ai/gateway/ws-status returns connection state
- Auto-reconnect with exponential backoff (1s → 2s → 4s → max 30s)
- Graceful shutdown: close WS on application stop
- DEPLOY.md: add WS connection setup notes

**Test scenarios:**
- Resilience: kill Gateway → WS reconnects after restart → chat resumes

**Verification:**
- Connection survives Gateway restart; DEPLOY.md updated

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| OpenClaw WS frame protocol undocumented details | claude-doc/5 has detailed analysis; test against live Gateway |
| `connect.challenge` may require crypto signing | Check if token auth bypasses challenge; gateway-client mode may skip it |
| Concurrent users on single WS connection | Route responses by request sequence number; use ConcurrentHashMap for pending requests |
| Feishu sessionKey format differs from Web | Unify to `agent:{id}:session:user-{platformUserId}` format; may need OpenClaw config adjustment |

## Sources & References

- OpenClaw WS protocol: `claude-doc/5-Gateway组件深度分析.md` lines 295-324
- Client ID whitelist: `claude-doc/6-Gateway核心代码复用性分析.md` — `gateway-client` + `backend` mode
- SessionKey format: `agent:<agentId>:session:<sessionId>` (line 360)
- Existing HTTP client: `edu-platform/edu-backend/src/main/java/com/edu/ai/service/OpenClawClient.java`
