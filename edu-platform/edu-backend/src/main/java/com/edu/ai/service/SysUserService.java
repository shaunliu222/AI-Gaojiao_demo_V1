package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.SysUser;
import com.edu.ai.entity.SysUserRole;
import com.edu.ai.entity.SysUserOrg;
import com.edu.ai.mapper.SysUserMapper;
import com.edu.ai.mapper.SysUserRoleMapper;
import com.edu.ai.mapper.SysUserOrgMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SysUserService extends ServiceImpl<SysUserMapper, SysUser> {

    private final SysUserRoleMapper userRoleMapper;
    private final SysUserOrgMapper userOrgMapper;
    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    public SysUser getByUsername(String username) {
        return lambdaQuery().eq(SysUser::getUsername, username).one();
    }

    public boolean checkPassword(String rawPassword, String encodedPassword) {
        return ENCODER.matches(rawPassword, encodedPassword);
    }

    public String encodePassword(String rawPassword) {
        return ENCODER.encode(rawPassword);
    }

    public List<String> getRoleCodes(Long userId) {
        return baseMapper.selectRoleCodesByUserId(userId);
    }

    public List<String> getPermissionCodes(Long userId) {
        return baseMapper.selectPermissionCodesByUserId(userId);
    }

    public IPage<SysUser> pageUsers(long page, long size, String keyword, String roleCode) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(SysUser::getUsername, keyword)
                    .or().like(SysUser::getName, keyword)
                    .or().like(SysUser::getEmail, keyword));
        }
        wrapper.orderByDesc(SysUser::getCreatedAt);
        return page(new Page<>(page, size), wrapper);
    }

    @Transactional
    public SysUser createUser(SysUser user) {
        user.setPassword(encodePassword(user.getPassword()));
        user.setStatus((short) 1);
        user.setDeleted((short) 0);
        save(user);
        return user;
    }

    @Transactional
    public void assignRoles(Long userId, List<Long> roleIds) {
        userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getUserId, userId));
        for (Long roleId : roleIds) {
            SysUserRole ur = new SysUserRole();
            ur.setUserId(userId);
            ur.setRoleId(roleId);
            userRoleMapper.insert(ur);
        }
    }

    @Transactional
    public void assignOrgs(Long userId, List<Long> orgIds) {
        userOrgMapper.delete(new LambdaQueryWrapper<SysUserOrg>()
                .eq(SysUserOrg::getUserId, userId));
        for (Long orgId : orgIds) {
            SysUserOrg uo = new SysUserOrg();
            uo.setUserId(userId);
            uo.setOrgId(orgId);
            userOrgMapper.insert(uo);
        }
    }

    public List<Long> getUserRoleIds(Long userId) {
        return userRoleMapper.selectList(new LambdaQueryWrapper<SysUserRole>()
                        .eq(SysUserRole::getUserId, userId))
                .stream().map(SysUserRole::getRoleId).toList();
    }

    public List<Long> getUserOrgIds(Long userId) {
        return userOrgMapper.selectList(new LambdaQueryWrapper<SysUserOrg>()
                        .eq(SysUserOrg::getUserId, userId))
                .stream().map(SysUserOrg::getOrgId).toList();
    }
}
