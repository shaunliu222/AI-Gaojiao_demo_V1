package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.AgentDefinition;
import com.edu.ai.entity.AgentPermission;
import com.edu.ai.mapper.AgentDefinitionMapper;
import com.edu.ai.mapper.AgentPermissionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentService extends ServiceImpl<AgentDefinitionMapper, AgentDefinition> {

    private final AgentPermissionMapper permissionMapper;

    public IPage<AgentDefinition> pageAgents(long page, long size, String keyword,
                                              String category, Long userId, List<String> roleCodes) {
        LambdaQueryWrapper<AgentDefinition> wrapper = new LambdaQueryWrapper<>();
        if (!roleCodes.contains("admin") && !roleCodes.contains("info_center")) {
            wrapper.and(w -> w.eq(AgentDefinition::getIsPublic, true)
                    .or().eq(AgentDefinition::getOwnerId, userId));
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(AgentDefinition::getName, keyword)
                    .or().like(AgentDefinition::getDescription, keyword));
        }
        if (StringUtils.hasText(category)) {
            wrapper.eq(AgentDefinition::getCategory, category);
        }
        wrapper.orderByDesc(AgentDefinition::getCreatedAt);
        return page(new Page<>(page, size), wrapper);
    }

    public List<AgentDefinition> listPublicAgents() {
        return lambdaQuery().eq(AgentDefinition::getIsPublic, true)
                .eq(AgentDefinition::getStatus, "published")
                .orderByDesc(AgentDefinition::getUseCount).list();
    }

    @Transactional
    public void setPermission(Long agentId, String targetType, Long targetId) {
        AgentPermission p = new AgentPermission();
        p.setAgentId(agentId);
        p.setTargetType(targetType);
        p.setTargetId(targetId);
        permissionMapper.insert(p);
    }
}
