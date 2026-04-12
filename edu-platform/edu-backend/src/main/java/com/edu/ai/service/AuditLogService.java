package com.edu.ai.service;

import com.edu.ai.entity.SecAuditLog;
import com.edu.ai.mapper.SecAuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final SecAuditLogMapper auditLogMapper;

    @Async
    public void logAudit(Long userId, String sessionId, String inputText,
                         String outputText, String hitRule, String action) {
        SecAuditLog auditLog = new SecAuditLog();
        auditLog.setUserId(userId);
        auditLog.setSessionId(sessionId);
        auditLog.setInputText(inputText);
        auditLog.setOutputText(outputText);
        auditLog.setHitRule(hitRule);
        auditLog.setActionTaken(action);
        auditLogMapper.insert(auditLog);
    }
}
