package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.edu.ai.entity.SecAuditLog;
import com.edu.ai.entity.SecKeyword;
import com.edu.ai.mapper.SecAuditLogMapper;
import com.edu.ai.mapper.SecKeywordMapper;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityCheckService {

    private final SecKeywordMapper keywordMapper;
    private final SecAuditLogMapper auditLogMapper;

    // Simple keyword set for matching (can upgrade to Trie for large datasets)
    private volatile Set<KeywordEntry> keywords = ConcurrentHashMap.newKeySet();

    @PostConstruct
    public void init() {
        reloadKeywords();
    }

    public void reloadKeywords() {
        List<SecKeyword> active = keywordMapper.selectList(
                new LambdaQueryWrapper<SecKeyword>().eq(SecKeyword::getStatus, 1));
        Set<KeywordEntry> newSet = ConcurrentHashMap.newKeySet();
        for (SecKeyword kw : active) {
            newSet.add(new KeywordEntry(kw.getWord().toLowerCase(), kw.getSeverity(), kw.getCategory()));
        }
        this.keywords = newSet;
        log.info("Loaded {} security keywords", newSet.size());
    }

    public CheckResult checkInput(String text, Long userId) {
        if (text == null || text.isEmpty()) {
            return CheckResult.pass();
        }
        String lower = text.toLowerCase();
        for (KeywordEntry kw : keywords) {
            if (lower.contains(kw.word)) {
                // Log the hit
                logAudit(userId, null, text, null, kw.word, kw.severity);
                if ("block".equals(kw.severity)) {
                    return CheckResult.blocked(kw.word, kw.category);
                } else if ("warn".equals(kw.severity)) {
                    return CheckResult.warned(kw.word, kw.category);
                }
            }
        }
        return CheckResult.pass();
    }

    public CheckResult checkOutput(String text, Long userId, String sessionId) {
        if (text == null || text.isEmpty()) {
            return CheckResult.pass();
        }
        String lower = text.toLowerCase();
        for (KeywordEntry kw : keywords) {
            if (lower.contains(kw.word)) {
                logAudit(userId, sessionId, null, text, kw.word, kw.severity);
                if ("block".equals(kw.severity)) {
                    return CheckResult.blocked(kw.word, kw.category);
                }
            }
        }
        return CheckResult.pass();
    }

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

    @Data
    public static class CheckResult {
        private boolean passed;
        private String hitWord;
        private String category;
        private String action;

        public static CheckResult pass() {
            CheckResult r = new CheckResult();
            r.passed = true;
            return r;
        }

        public static CheckResult blocked(String word, String category) {
            CheckResult r = new CheckResult();
            r.passed = false;
            r.hitWord = word;
            r.category = category;
            r.action = "blocked";
            return r;
        }

        public static CheckResult warned(String word, String category) {
            CheckResult r = new CheckResult();
            r.passed = true; // warn still passes
            r.hitWord = word;
            r.category = category;
            r.action = "warned";
            return r;
        }
    }

    @Data
    private static class KeywordEntry {
        private final String word;
        private final String severity;
        private final String category;
    }
}
