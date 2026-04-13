package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.edu.ai.common.PageResult;
import com.edu.ai.common.R;
import com.edu.ai.entity.ResCategory;
import com.edu.ai.entity.ResFile;
import com.edu.ai.entity.ResParseTask;
import com.edu.ai.mapper.ResCategoryMapper;
import com.edu.ai.service.MinioService;
import com.edu.ai.service.ResFileService;
import com.edu.ai.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Resource Center")
@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResFileController {

    private final ResFileService resFileService;
    private final SysUserService sysUserService;
    private final MinioService minioService;
    private final ResCategoryMapper categoryMapper;

    @Operation(summary = "Upload file")
    @PostMapping("/upload")
    public R<ResFile> upload(@RequestParam("file") MultipartFile file,
                             @RequestParam(required = false) Long categoryId) {
        Long userId = StpUtil.getLoginIdAsLong();
        return R.ok(resFileService.uploadFile(file, categoryId, userId));
    }

    @Operation(summary = "List resources with permission filtering")
    @GetMapping
    public R<PageResult<ResFile>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) Long categoryId) {
        Long userId = StpUtil.getLoginIdAsLong();
        List<String> roles = sysUserService.getRoleCodes(userId);
        IPage<ResFile> result = resFileService.pageFiles(page, size, keyword, fileType, categoryId, userId, roles);
        return R.ok(PageResult.of(result));
    }

    @Operation(summary = "Get resource detail")
    @GetMapping("/{id}")
    public R<ResFile> detail(@PathVariable Long id) {
        return R.ok(resFileService.getById(id));
    }

    @Operation(summary = "Delete resource")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        ResFile file = resFileService.getById(id);
        if (file != null && file.getStoragePath() != null) {
            minioService.delete(file.getStoragePath());
        }
        resFileService.removeById(id);
        return R.ok();
    }

    @Operation(summary = "Set resource public/private")
    @PutMapping("/{id}/permission")
    public R<Void> setPublic(@PathVariable Long id, @RequestParam boolean isPublic) {
        resFileService.setPublic(id, isPublic);
        return R.ok();
    }

    @Operation(summary = "Get parse status")
    @GetMapping("/{id}/parse-status")
    public R<ResParseTask> parseStatus(@PathVariable Long id) {
        return R.ok(resFileService.getParseStatus(id));
    }

    @Operation(summary = "List categories")
    @GetMapping("/categories")
    public R<List<ResCategory>> categories() {
        return R.ok(categoryMapper.selectList(null));
    }

    @Operation(summary = "Create category")
    @PostMapping("/categories")
    public R<ResCategory> createCategory(@RequestBody ResCategory category) {
        categoryMapper.insert(category);
        return R.ok(category);
    }
}
