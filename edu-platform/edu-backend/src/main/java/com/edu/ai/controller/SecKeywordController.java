package com.edu.ai.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaMode;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.edu.ai.common.PageResult;
import com.edu.ai.common.R;
import com.edu.ai.entity.SecKeyword;
import com.edu.ai.mapper.SecKeywordMapper;
import com.edu.ai.service.SecurityCheckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Security Keywords")
@RestController
@RequestMapping("/api/security/keywords")
@RequiredArgsConstructor
public class SecKeywordController {

    private final SecKeywordMapper keywordMapper;
    private final SecurityCheckService securityCheckService;

    @Operation(summary = "List keywords")
    @GetMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<PageResult<SecKeyword>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category) {
        LambdaQueryWrapper<SecKeyword> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.like(SecKeyword::getWord, keyword);
        }
        if (StringUtils.hasText(category)) {
            wrapper.eq(SecKeyword::getCategory, category);
        }
        wrapper.orderByDesc(SecKeyword::getCreatedAt);
        IPage<SecKeyword> result = keywordMapper.selectPage(new Page<>(page, size), wrapper);
        return R.ok(PageResult.of(result));
    }

    @Operation(summary = "Add keyword")
    @PostMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<SecKeyword> create(@RequestBody SecKeyword kw) {
        if (kw.getStatus() == null) kw.setStatus((short) 1);
        if (kw.getSeverity() == null) kw.setSeverity("block");
        keywordMapper.insert(kw);
        securityCheckService.reloadKeywords();
        return R.ok(kw);
    }

    @Operation(summary = "Update keyword")
    @PutMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> update(@PathVariable Long id, @RequestBody SecKeyword kw) {
        kw.setId(id);
        keywordMapper.updateById(kw);
        securityCheckService.reloadKeywords();
        return R.ok();
    }

    @Operation(summary = "Delete keyword")
    @DeleteMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> delete(@PathVariable Long id) {
        keywordMapper.deleteById(id);
        securityCheckService.reloadKeywords();
        return R.ok();
    }

    @Operation(summary = "Batch import keywords")
    @PostMapping("/batch-import")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Integer> batchImport(@RequestBody List<SecKeyword> keywords) {
        int count = 0;
        for (SecKeyword kw : keywords) {
            if (kw.getStatus() == null) kw.setStatus((short) 1);
            if (kw.getSeverity() == null) kw.setSeverity("block");
            keywordMapper.insert(kw);
            count++;
        }
        securityCheckService.reloadKeywords();
        return R.ok(count);
    }

    @Operation(summary = "Toggle keyword status")
    @PutMapping("/{id}/status")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> toggleStatus(@PathVariable Long id, @RequestParam Short status) {
        SecKeyword kw = new SecKeyword();
        kw.setId(id);
        kw.setStatus(status);
        keywordMapper.updateById(kw);
        securityCheckService.reloadKeywords();
        return R.ok();
    }
}
