package com.edu.ai.service;

import com.edu.ai.dto.ChatRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * HTTP client for communicating with OpenClaw Gateway.
 * Uses the OpenAI-compatible REST API at :18789/v1/chat/completions.
 */
@Slf4j
@Service
public class OpenClawClient {

    private final WebClient webClient;

    public OpenClawClient(
            @Value("${openclaw.gateway.url:http://localhost:18789}") String gatewayUrl,
            @Value("${openclaw.gateway.token:}") String gatewayToken) {
        this.webClient = WebClient.builder()
                .baseUrl(gatewayUrl)
                .defaultHeader("Authorization", "Bearer " + gatewayToken)
                .defaultHeader("x-openclaw-scopes", "operator.write")
                .defaultHeader("x-openclaw-message-channel", "api")
                .build();
    }

    /**
     * Synchronous chat completion (non-streaming).
     */
    public String chatCompletion(ChatRequest request) {
        return chatCompletion(request, null);
    }

    public String chatCompletion(ChatRequest request, String sessionKey) {
        Map<String, Object> body = buildRequestBody(request, false);

        var req = webClient.post()
                .uri("/v1/chat/completions")
                .header("x-openclaw-agent-id", request.getAgentId() != null ? request.getAgentId() : "")
                .contentType(MediaType.APPLICATION_JSON);
        if (sessionKey != null && !sessionKey.isEmpty()) {
            req = req.header("x-openclaw-session-key", sessionKey);
        }
        return req.bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block(Duration.ofSeconds(120));
    }

    /**
     * Streaming chat completion (SSE).
     * Returns a Flux of SSE data strings.
     */
    public Flux<String> chatCompletionStream(ChatRequest request) {
        return chatCompletionStream(request, null);
    }

    public Flux<String> chatCompletionStream(ChatRequest request, String sessionKey) {
        Map<String, Object> body = buildRequestBody(request, true);

        var req = webClient.post()
                .uri("/v1/chat/completions")
                .header("x-openclaw-agent-id", request.getAgentId() != null ? request.getAgentId() : "")
                .contentType(MediaType.APPLICATION_JSON);
        if (sessionKey != null && !sessionKey.isEmpty()) {
            req = req.header("x-openclaw-session-key", sessionKey);
        }
        return req.bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class);
    }

    /**
     * Health check.
     */
    public boolean healthCheck() {
        try {
            String result = webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return result != null;
        } catch (Exception e) {
            log.warn("OpenClaw health check failed: {}", e.getMessage());
            return false;
        }
    }

    private Map<String, Object> buildRequestBody(ChatRequest request, boolean stream) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", request.getModel() != null ? request.getModel() : "openclaw");
        body.put("messages", request.getMessages());
        body.put("stream", stream);
        return body;
    }
}
