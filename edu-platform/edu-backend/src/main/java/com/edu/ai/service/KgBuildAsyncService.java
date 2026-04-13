package com.edu.ai.service;

import com.edu.ai.entity.KgBuildTask;
import com.edu.ai.mapper.KgBuildTaskMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class KgBuildAsyncService {

    private final KgBuildTaskMapper buildTaskMapper;

    @Value("${openclaw.gateway.url:http://localhost:18789}")
    private String gatewayUrl;

    @Value("${openclaw.gateway.token:}")
    private String gatewayToken;

    @Async
    public void extractAsync(Long taskId, Long graphId, String documentText) {
        try {
            buildTaskMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<KgBuildTask>()
                    .set(KgBuildTask::getStatus, "extracting").set(KgBuildTask::getProgress, 10).eq(KgBuildTask::getId, taskId));

            String text = documentText.length() > 2000 ? documentText.substring(0, 2000) : documentText;
            String prompt = "你是知识图谱抽取专家。从以下文本抽取实体和关系，直接返回JSON，不要包裹在代码块中。\n\n" +
                    "实体类型：chapter, section, concept, formula, method\n" +
                    "关系类型：CONTAINS, PREREQUISITE, RELATES_TO\n\n" +
                    "返回格式：{\"entities\":[{\"name\":\"...\",\"type\":\"...\",\"description\":\"...\"}],\"relations\":[{\"source\":\"...\",\"target\":\"...\",\"type\":\"...\"}]}\n\n" +
                    "文本：\n" + text;

            // Use dedicated WebClient with 5-minute timeout (not shared OpenClawClient)
            WebClient client = WebClient.builder()
                    .baseUrl(gatewayUrl)
                    .defaultHeader("Authorization", "Bearer " + gatewayToken)
                    .defaultHeader("x-openclaw-scopes", "operator.write")
                    .build();

            Map<String, Object> body = new HashMap<>();
            body.put("model", "openclaw");
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            body.put("stream", false);

            log.info("Starting LLM extraction for task {} (text length: {})", taskId, text.length());

            String response = client.post()
                    .uri("/v1/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofMinutes(5));

            log.info("LLM extraction response received for task {}", taskId);

            String resultJson = new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(Map.of("raw_response", response));

            buildTaskMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<KgBuildTask>()
                    .set(KgBuildTask::getStatus, "extracted").set(KgBuildTask::getProgress, 100)
                    .setSql("result = '" + resultJson.replace("'", "''") + "'")
                    .eq(KgBuildTask::getId, taskId));

            log.info("Extraction completed for task {}", taskId);
        } catch (Exception e) {
            log.error("Extraction failed for task {}", taskId, e);
            buildTaskMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<KgBuildTask>()
                    .set(KgBuildTask::getStatus, "failed").set(KgBuildTask::getErrorMessage, e.getMessage())
                    .eq(KgBuildTask::getId, taskId));
        }
    }
}
