package com.edu.ai.service;

import com.edu.ai.dto.ChatMessage;
import com.edu.ai.dto.ChatRequest;
import com.edu.ai.entity.KgBuildTask;
import com.edu.ai.mapper.KgBuildTaskMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class KgBuildAsyncService {

    private final KgBuildTaskMapper buildTaskMapper;
    private final OpenClawClient openClawClient;

    @Async
    public void extractAsync(Long taskId, Long graphId, String documentText) {
        try {
            buildTaskMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<KgBuildTask>()
                    .set(KgBuildTask::getStatus, "extracting").set(KgBuildTask::getProgress, 10).eq(KgBuildTask::getId, taskId));

            String prompt = "你是一个知识图谱实体关系抽取专家。请从以下教育文本中抽取实体和关系。\n\n" +
                    "实体类型：chapter(章), section(节), concept(知识点), formula(公式), method(方法)\n" +
                    "关系类型：CONTAINS(包含), PREREQUISITE(前置依赖), RELATES_TO(关联)\n\n" +
                    "请以JSON格式返回：{\"entities\":[{\"name\":\"...\",\"type\":\"...\",\"description\":\"...\"}], " +
                    "\"relations\":[{\"source\":\"...\",\"target\":\"...\",\"type\":\"...\"}]}\n\n" +
                    "文本内容：\n" + (documentText.length() > 3000 ? documentText.substring(0, 3000) : documentText);

            ChatRequest request = new ChatRequest();
            ChatMessage msg = new ChatMessage();
            msg.setRole("user");
            msg.setContent(prompt);
            request.setMessages(List.of(msg));
            String response = openClawClient.chatCompletion(request);

            // Store result as JSON string (H2 compatible — no JSONB)
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
