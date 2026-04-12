package com.edu.ai.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.ModelUsageLog;
import com.edu.ai.mapper.ModelUsageLogMapper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class ModelUsageService extends ServiceImpl<ModelUsageLogMapper, ModelUsageLog> {

    @Async
    public void recordUsage(Long userId, Long modelId, String sessionId,
                            int inputTokens, int outputTokens, BigDecimal cost) {
        ModelUsageLog log = new ModelUsageLog();
        log.setUserId(userId);
        log.setModelId(modelId);
        log.setSessionId(sessionId);
        log.setInputTokens(inputTokens);
        log.setOutputTokens(outputTokens);
        log.setCost(cost != null ? cost : BigDecimal.ZERO);
        save(log);
    }
}
