package com.edu.ai.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.edu.ai.common.PageResult;
import com.edu.ai.common.R;
import com.edu.ai.dto.UserCreateRequest;
import com.edu.ai.dto.UserUpdateRequest;
import com.edu.ai.entity.SysUser;
import com.edu.ai.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "User Management")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class SysUserController {

    private final SysUserService sysUserService;

    @Operation(summary = "Page list users")
    @GetMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<PageResult<SysUser>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String keyword) {
        IPage<SysUser> result = sysUserService.pageUsers(page, size, keyword);
        // Clear password from response
        result.getRecords().forEach(u -> u.setPassword(null));
        return R.ok(PageResult.of(result));
    }

    @Operation(summary = "Get user detail")
    @GetMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<SysUser> detail(@PathVariable Long id) {
        SysUser user = sysUserService.getById(id);
        if (user == null) return R.fail(404, "User not found");
        user.setPassword(null);
        return R.ok(user);
    }

    @Operation(summary = "Create user")
    @PostMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<SysUser> create(@Valid @RequestBody UserCreateRequest request) {
        if (sysUserService.getByUsername(request.getUsername()) != null) {
            return R.fail(400, "Username already exists");
        }
        SysUser user = new SysUser();
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setAvatar(request.getAvatar());
        sysUserService.createUser(user);
        user.setPassword(null);
        return R.ok(user);
    }

    @Operation(summary = "Update user")
    @PutMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<Void> update(@PathVariable Long id, @RequestBody UserUpdateRequest request) {
        SysUser user = sysUserService.getById(id);
        if (user == null) return R.fail(404, "User not found");

        if (StringUtils.hasText(request.getName())) user.setName(request.getName());
        if (StringUtils.hasText(request.getEmail())) user.setEmail(request.getEmail());
        if (StringUtils.hasText(request.getPhone())) user.setPhone(request.getPhone());
        if (StringUtils.hasText(request.getAvatar())) user.setAvatar(request.getAvatar());
        if (request.getStatus() != null) user.setStatus(request.getStatus());
        if (StringUtils.hasText(request.getPassword())) {
            user.setPassword(sysUserService.encodePassword(request.getPassword()));
        }
        sysUserService.updateById(user);
        return R.ok();
    }

    @Operation(summary = "Delete user")
    @DeleteMapping("/{id}")
    @SaCheckRole("admin")
    public R<Void> delete(@PathVariable Long id) {
        sysUserService.removeById(id);
        return R.ok();
    }

    @Operation(summary = "Assign roles to user")
    @PutMapping("/{id}/roles")
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<Void> assignRoles(@PathVariable Long id, @RequestBody List<Long> roleIds) {
        sysUserService.assignRoles(id, roleIds);
        return R.ok();
    }

    @Operation(summary = "Assign orgs to user")
    @PutMapping("/{id}/orgs")
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<Void> assignOrgs(@PathVariable Long id, @RequestBody List<Long> orgIds) {
        sysUserService.assignOrgs(id, orgIds);
        return R.ok();
    }

    @Operation(summary = "Get user's role IDs")
    @GetMapping("/{id}/roles")
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<List<Long>> getUserRoles(@PathVariable Long id) {
        return R.ok(sysUserService.getUserRoleIds(id));
    }

    @Operation(summary = "Get user's org IDs")
    @GetMapping("/{id}/orgs")
    @SaCheckRole(value = {"admin", "info_center"}, mode = cn.dev33.satoken.annotation.SaMode.OR)
    public R<List<Long>> getUserOrgs(@PathVariable Long id) {
        return R.ok(sysUserService.getUserOrgIds(id));
    }
}
