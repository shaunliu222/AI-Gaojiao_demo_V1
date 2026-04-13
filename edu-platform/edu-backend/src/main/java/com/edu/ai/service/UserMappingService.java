package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.UserChannelMapping;
import com.edu.ai.mapper.UserChannelMappingMapper;
import org.springframework.stereotype.Service;

@Service
public class UserMappingService extends ServiceImpl<UserChannelMappingMapper, UserChannelMapping> {

    public Long getPlatformUserId(String channelType, String channelUserId) {
        UserChannelMapping mapping = getOne(new LambdaQueryWrapper<UserChannelMapping>()
                .eq(UserChannelMapping::getChannelType, channelType)
                .eq(UserChannelMapping::getChannelUserId, channelUserId));
        return mapping != null ? mapping.getPlatformUserId() : null;
    }

    public void bindUser(String channelType, String channelUserId, Long platformUserId) {
        UserChannelMapping mapping = new UserChannelMapping();
        mapping.setChannelType(channelType);
        mapping.setChannelUserId(channelUserId);
        mapping.setPlatformUserId(platformUserId);
        save(mapping);
    }

    public String getSessionKey(String channelType, String channelUserId, String agentId) {
        Long platformUserId = getPlatformUserId(channelType, channelUserId);
        if (platformUserId == null) return null;
        return "agent:" + (agentId != null ? agentId : "main") + ":user:" + platformUserId;
    }
}
