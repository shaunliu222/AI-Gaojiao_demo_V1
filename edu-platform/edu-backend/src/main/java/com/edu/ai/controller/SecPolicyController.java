package com.edu.ai.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaMode;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.edu.ai.common.PageResult;
import com.edu.ai.common.R;
import com.edu.ai.entity.SecAuditLog;
import com.edu.ai.entity.SecPolicy;
import com.edu.ai.mapper.SecAuditLogMapper;
import com.edu.ai.mapper.SecPolicyMapper;
import com.edu.ai.service.SecurityCheckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Security Policies & Audit")
@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
public class SecPolicyController {

    private final SecPolicyMapper policyMapper;
    private final SecAuditLogMapper auditLogMapper;
    private final SecurityCheckService securityCheckService;

    // --- Policy CRUD ---

    @Operation(summary = "List policies")
    @GetMapping("/policies")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<List<SecPolicy>> listPolicies() {
        return R.ok(policyMapper.selectList(new LambdaQueryWrapper<SecPolicy>()
                .orderByDesc(SecPolicy::getCreatedAt)));
    }

    @Operation(summary = "Create policy")
    @PostMapping("/policies")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<SecPolicy> createPolicy(@RequestBody SecPolicy policy) {
        if (policy.getStatus() == null) policy.setStatus((short) 1);
        policyMapper.insert(policy);
        return R.ok(policy);
    }

    @Operation(summary = "Update policy")
    @PutMapping("/policies/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> updatePolicy(@PathVariable Long id, @RequestBody SecPolicy policy) {
        policy.setId(id);
        policyMapper.updateById(policy);
        return R.ok();
    }

    @Operation(summary = "Delete policy")
    @DeleteMapping("/policies/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> deletePolicy(@PathVariable Long id) {
        policyMapper.deleteById(id);
        return R.ok();
    }

    // --- Audit Logs ---

    @Operation(summary = "Query audit logs")
    @GetMapping("/audit-logs")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<PageResult<SecAuditLog>> auditLogs(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String hitRule) {
        LambdaQueryWrapper<SecAuditLog> wrapper = new LambdaQueryWrapper<>();
        if (userId != null) wrapper.eq(SecAuditLog::getUserId, userId);
        if (StringUtils.hasText(hitRule)) wrapper.like(SecAuditLog::getHitRule, hitRule);
        wrapper.orderByDesc(SecAuditLog::getCreatedAt);
        IPage<SecAuditLog> result = auditLogMapper.selectPage(new Page<>(page, size), wrapper);
        return R.ok(PageResult.of(result));
    }

    // --- Content Check (internal API, called by AI gateway) ---

    @Operation(summary = "Check content safety")
    @PostMapping("/check")
    public R<SecurityCheckService.CheckResult> check(@RequestBody CheckRequest request) {
        return R.ok(securityCheckService.checkInput(request.getText(), request.getUserId()));
    }

    @lombok.Data
    public static class CheckRequest {
        private String text;
        private Long userId;
    }
}
