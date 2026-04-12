package com.edu.ai.config;

import cn.dev33.satoken.stp.StpInterface;
import com.edu.ai.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class StpInterfaceImpl implements StpInterface {

    private final SysUserMapper sysUserMapper;

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        Long userId = getUserIdFromLoginId(loginId);
        if (userId == null) return List.of();
        return sysUserMapper.selectPermissionCodesByUserId(userId);
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        Long userId = getUserIdFromLoginId(loginId);
        if (userId == null) return List.of();
        return sysUserMapper.selectRoleCodesByUserId(userId);
    }

    private Long getUserIdFromLoginId(Object loginId) {
        if (loginId instanceof Long) return (Long) loginId;
        try {
            return Long.parseLong(loginId.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
