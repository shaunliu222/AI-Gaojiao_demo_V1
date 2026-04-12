package com.edu.ai.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaMode;
import cn.dev33.satoken.stp.StpUtil;
import com.edu.ai.common.R;
import com.edu.ai.entity.ModelConfig;
import com.edu.ai.service.ModelService;
import com.edu.ai.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Model Management")
@RestController
@RequestMapping("/api/models")
@RequiredArgsConstructor
public class ModelController {

    private final ModelService modelService;
    private final SysUserService sysUserService;

    @Operation(summary = "List models by capability")
    @GetMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<List<ModelConfig>> list(@RequestParam(defaultValue = "all") String capability) {
        return R.ok(modelService.listByCapability(capability));
    }

    @Operation(summary = "Get available models for current user")
    @GetMapping("/available")
    public R<List<ModelConfig>> available() {
        Long userId = StpUtil.getLoginIdAsLong();
        List<String> roleCodes = sysUserService.getRoleCodes(userId);
        return R.ok(modelService.getAvailableModels(roleCodes));
    }

    @Operation(summary = "Get model detail")
    @GetMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<ModelConfig> detail(@PathVariable Long id) {
        ModelConfig model = modelService.getById(id);
        if (model == null) return R.fail(404, "Model not found");
        return R.ok(model);
    }

    @Operation(summary = "Add model")
    @PostMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<ModelConfig> create(@RequestBody ModelConfig model) {
        return R.ok(modelService.createModel(model));
    }

    @Operation(summary = "Update model")
    @PutMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> update(@PathVariable Long id, @RequestBody ModelConfig model) {
        model.setId(id);
        modelService.updateById(model);
        return R.ok();
    }

    @Operation(summary = "Delete model")
    @DeleteMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> delete(@PathVariable Long id) {
        modelService.removeById(id);
        return R.ok();
    }

    @Operation(summary = "Enable/disable model")
    @PutMapping("/{id}/status")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> setStatus(@PathVariable Long id, @RequestParam String status) {
        modelService.lambdaUpdate().set(ModelConfig::getStatus, status)
                .eq(ModelConfig::getId, id).update();
        return R.ok();
    }

    @Operation(summary = "Set as default model")
    @PutMapping("/{id}/default")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> setDefault(@PathVariable Long id) {
        modelService.setDefault(id);
        return R.ok();
    }

    @Operation(summary = "Get model permissions")
    @GetMapping("/{id}/permissions")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<List<Long>> getPermissions(@PathVariable Long id) {
        return R.ok(modelService.getPermissionRoleIds(id));
    }

    @Operation(summary = "Set model permissions")
    @PutMapping("/{id}/permissions")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> setPermissions(@PathVariable Long id, @RequestBody List<Long> roleIds) {
        modelService.setPermissions(id, roleIds);
        return R.ok();
    }
}
