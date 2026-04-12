package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.edu.ai.common.R;
import com.edu.ai.dto.LoginRequest;
import com.edu.ai.dto.LoginResponse;
import com.edu.ai.entity.SysUser;
import com.edu.ai.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Auth", description = "Authentication")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final SysUserService sysUserService;

    @Operation(summary = "Login")
    @PostMapping("/login")
    public R<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        SysUser user = sysUserService.getByUsername(request.getUsername());
        if (user == null || !sysUserService.checkPassword(request.getPassword(), user.getPassword())) {
            return R.fail(401, "Invalid username or password");
        }
        if (user.getStatus() != 1) {
            return R.fail(403, "Account is disabled");
        }

        StpUtil.login(user.getId());

        List<String> roleCodes = sysUserService.getRoleCodes(user.getId());
        List<String> permissions = sysUserService.getPermissionCodes(user.getId());

        return R.ok(LoginResponse.builder()
                .token(StpUtil.getTokenValue())
                .username(user.getUsername())
                .name(user.getName())
                .role(roleCodes.isEmpty() ? "" : roleCodes.get(0))
                .avatar(user.getAvatar() != null ? user.getAvatar()
                        : "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.getUsername())
                .permissions(permissions)
                .build());
    }

    @Operation(summary = "Get current user info")
    @GetMapping("/userinfo")
    public R<LoginResponse> userinfo() {
        Long userId = StpUtil.getLoginIdAsLong();
        SysUser user = sysUserService.getById(userId);
        if (user == null) {
            return R.fail(401, "User not found");
        }

        List<String> roleCodes = sysUserService.getRoleCodes(userId);
        List<String> permissions = sysUserService.getPermissionCodes(userId);

        return R.ok(LoginResponse.builder()
                .token(StpUtil.getTokenValue())
                .username(user.getUsername())
                .name(user.getName())
                .role(roleCodes.isEmpty() ? "" : roleCodes.get(0))
                .avatar(user.getAvatar() != null ? user.getAvatar()
                        : "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.getUsername())
                .permissions(permissions)
                .build());
    }

    @Operation(summary = "Logout")
    @PostMapping("/logout")
    public R<Void> logout() {
        StpUtil.logout();
        return R.ok();
    }
}
