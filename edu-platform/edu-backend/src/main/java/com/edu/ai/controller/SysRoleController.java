package com.edu.ai.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaMode;
import com.edu.ai.common.R;
import com.edu.ai.entity.SysRole;
import com.edu.ai.service.SysRoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Role Management")
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class SysRoleController {

    private final SysRoleService sysRoleService;

    @Operation(summary = "List all roles")
    @GetMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<List<SysRole>> list() {
        return R.ok(sysRoleService.lambdaQuery().orderByAsc(SysRole::getSortOrder).list());
    }

    @Operation(summary = "Create role")
    @PostMapping
    @SaCheckRole("admin")
    public R<SysRole> create(@RequestBody SysRole role) {
        sysRoleService.save(role);
        return R.ok(role);
    }

    @Operation(summary = "Update role")
    @PutMapping("/{id}")
    @SaCheckRole("admin")
    public R<Void> update(@PathVariable Long id, @RequestBody SysRole role) {
        role.setId(id);
        sysRoleService.updateById(role);
        return R.ok();
    }

    @Operation(summary = "Delete role")
    @DeleteMapping("/{id}")
    @SaCheckRole("admin")
    public R<Void> delete(@PathVariable Long id) {
        sysRoleService.removeById(id);
        return R.ok();
    }
}
