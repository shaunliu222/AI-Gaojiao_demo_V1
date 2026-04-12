package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.AiChatSession;
import com.edu.ai.mapper.AiChatSessionMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AiChatSessionService extends ServiceImpl<AiChatSessionMapper, AiChatSession> {

    public List<AiChatSession> getUserSessions(Long userId) {
        return lambdaQuery()
                .eq(AiChatSession::getUserId, userId)
                .orderByDesc(AiChatSession::getUpdatedAt)
                .list();
    }

    public AiChatSession createSession(Long userId, String agentId, String title) {
        AiChatSession session = new AiChatSession();
        session.setUserId(userId);
        session.setAgentId(agentId);
        session.setTitle(title);
        session.setMessageCount(0);
        save(session);
        return session;
    }

    public void updateLastMessage(Long sessionId, String lastMessage) {
        lambdaUpdate()
                .set(AiChatSession::getLastMessage, lastMessage)
                .setSql("message_count = message_count + 1")
                .eq(AiChatSession::getId, sessionId)
                .update();
    }

    public boolean deleteUserSession(Long userId, Long sessionId) {
        return remove(new LambdaQueryWrapper<AiChatSession>()
                .eq(AiChatSession::getId, sessionId)
                .eq(AiChatSession::getUserId, userId));
    }
}
