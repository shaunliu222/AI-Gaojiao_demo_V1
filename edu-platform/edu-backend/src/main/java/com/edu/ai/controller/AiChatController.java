package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.edu.ai.common.R;
import com.edu.ai.dto.ChatMessage;
import com.edu.ai.dto.ChatRequest;
import com.edu.ai.entity.AiChatSession;
import com.edu.ai.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Tag(name = "AI Chat", description = "AI Gateway Proxy - proxies to OpenClaw Gateway")
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final OpenClawClient openClawClient;
    private final SecurityCheckService securityCheckService;
    private final ModelService modelService;
    private final SysUserService sysUserService;
    private final AiChatSessionService sessionService;
    private final ModelUsageService modelUsageService;

    private final ExecutorService executor = Executors.newFixedThreadPool(
            Runtime.getRuntime().availableProcessors() * 2);

    /**
     * Synchronous chat proxy.
     * Flow: Sa-Token auth -> security check -> forward to OpenClaw -> output check -> return
     */
    @Operation(summary = "Chat (sync)")
    @PostMapping("/chat")
    public R<String> chat(@RequestBody ChatRequest request) {
        Long userId = StpUtil.getLoginIdAsLong();

        // 1. Security check on input
        String userMessage = getLastUserMessage(request.getMessages());
        SecurityCheckService.CheckResult inputCheck = securityCheckService.checkInput(userMessage, userId);
        if (!inputCheck.isPassed()) {
            return R.fail(403, "Your message was blocked by security policy");
        }

        // 2. Forward to OpenClaw
        String response = openClawClient.chatCompletion(request);

        // 3. Output safety check
        securityCheckService.checkOutput(response, userId, null);

        // 4. Record usage (async)
        modelUsageService.recordUsage(userId, null, null, 0, 0, BigDecimal.ZERO);

        return R.ok(response);
    }

    /**
     * SSE streaming chat proxy.
     * Flow: Sa-Token auth -> security check -> forward to OpenClaw SSE -> stream to client
     */
    @Operation(summary = "Chat (SSE streaming)")
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@RequestBody ChatRequest request) {
        Long userId = StpUtil.getLoginIdAsLong();
        SseEmitter emitter = new SseEmitter(120000L); // 2 minutes timeout

        // 1. Security check on input
        String userMessage = getLastUserMessage(request.getMessages());
        SecurityCheckService.CheckResult inputCheck = securityCheckService.checkInput(userMessage, userId);
        if (!inputCheck.isPassed()) {
            executor.execute(() -> {
                try {
                    emitter.send(SseEmitter.event()
                            .data("{\"error\":\"Your message was blocked by security policy\"}"));
                    emitter.complete();
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            });
            return emitter;
        }

        // 2. Stream from OpenClaw
        executor.execute(() -> {
            StringBuilder fullResponse = new StringBuilder();
            try {
                openClawClient.chatCompletionStream(request)
                        .doOnNext(data -> {
                            try {
                                fullResponse.append(data);
                                emitter.send(SseEmitter.event().data(data));
                            } catch (IOException e) {
                                log.warn("SSE send error: {}", e.getMessage());
                            }
                        })
                        .doOnComplete(() -> {
                            try {
                                emitter.send(SseEmitter.event().data("[DONE]"));
                                emitter.complete();
                            } catch (IOException e) {
                                log.warn("SSE complete error: {}", e.getMessage());
                            }
                            // 3. Async: output check + usage recording
                            securityCheckService.checkOutput(fullResponse.toString(), userId, null);
                            modelUsageService.recordUsage(userId, null, null, 0, 0, BigDecimal.ZERO);
                        })
                        .doOnError(error -> {
                            log.error("OpenClaw stream error", error);
                            try {
                                emitter.send(SseEmitter.event()
                                        .data("{\"error\":\"AI service unavailable\"}"));
                                emitter.complete();
                            } catch (IOException e) {
                                emitter.completeWithError(e);
                            }
                        })
                        .blockLast();
            } catch (Exception e) {
                log.error("Stream proxy error", e);
                emitter.completeWithError(e);
            }
        });

        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> log.warn("SSE error: {}", e.getMessage()));

        return emitter;
    }

    /**
     * List user's chat sessions.
     */
    @Operation(summary = "List chat sessions")
    @GetMapping("/sessions")
    public R<List<AiChatSession>> sessions() {
        Long userId = StpUtil.getLoginIdAsLong();
        return R.ok(sessionService.getUserSessions(userId));
    }

    /**
     * Delete a chat session.
     */
    @Operation(summary = "Delete chat session")
    @DeleteMapping("/sessions/{id}")
    public R<Void> deleteSession(@PathVariable Long id) {
        Long userId = StpUtil.getLoginIdAsLong();
        sessionService.deleteUserSession(userId, id);
        return R.ok();
    }

    /**
     * Get OpenClaw Main Agent identity by asking it to self-describe.
     */
    @Operation(summary = "Get OpenClaw Main Agent info")
    @GetMapping("/main-agent-info")
    public R<Map<String, String>> mainAgentInfo() {
        try {
            ChatRequest req = new ChatRequest();
            ChatMessage msg = new ChatMessage();
            msg.setRole("user");
            msg.setContent("用一句话介绍你自己的名字和角色定位，不超过50字，只输出介绍内容");
            req.setMessages(List.of(msg));
            String raw = openClawClient.chatCompletion(req);
            // Parse the response to extract content
            String intro = raw;
            try {
                var parsed = new com.fasterxml.jackson.databind.ObjectMapper().readTree(raw);
                intro = parsed.path("choices").path(0).path("message").path("content").asText(raw);
            } catch (Exception ignored) {}
            return R.ok(Map.of("name", "Main Agent", "source", "OpenClaw Gateway", "intro", intro));
        } catch (Exception e) {
            return R.ok(Map.of("name", "Main Agent", "source", "OpenClaw Gateway", "intro", "OpenClaw 默认智能体（Gateway 未连接）"));
        }
    }

    /**
     * Check OpenClaw Gateway health.
     */
    @Operation(summary = "Check OpenClaw Gateway health")
    @GetMapping("/gateway/health")
    public R<Boolean> gatewayHealth() {
        return R.ok(openClawClient.healthCheck());
    }

    private String getLastUserMessage(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) return "";
        for (int i = messages.size() - 1; i >= 0; i--) {
            if ("user".equals(messages.get(i).getRole())) {
                return messages.get(i).getContent();
            }
        }
        return "";
    }
}
