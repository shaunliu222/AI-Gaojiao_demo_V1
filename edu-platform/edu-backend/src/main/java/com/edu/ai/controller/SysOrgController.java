package com.edu.ai.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaMode;
import com.edu.ai.common.R;
import com.edu.ai.entity.SysOrg;
import com.edu.ai.service.SysOrgService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Organization Management")
@RestController
@RequestMapping("/api/orgs")
@RequiredArgsConstructor
public class SysOrgController {

    private final SysOrgService sysOrgService;

    @Operation(summary = "Get organization tree")
    @GetMapping("/tree")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<List<SysOrgService.OrgTreeNode>> tree() {
        return R.ok(sysOrgService.getOrgTree());
    }

    @Operation(summary = "Create organization")
    @PostMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<SysOrg> create(@RequestBody SysOrg org) {
        sysOrgService.save(org);
        return R.ok(org);
    }

    @Operation(summary = "Update organization")
    @PutMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> update(@PathVariable Long id, @RequestBody SysOrg org) {
        org.setId(id);
        sysOrgService.updateById(org);
        return R.ok();
    }

    @Operation(summary = "Delete organization")
    @DeleteMapping("/{id}")
    @SaCheckRole("admin")
    public R<Void> delete(@PathVariable Long id) {
        sysOrgService.removeById(id);
        return R.ok();
    }
}
