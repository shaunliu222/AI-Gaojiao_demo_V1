package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "agent_publish", autoResultMap = true)
public class AgentPublish {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long agentId;
    private String channelType;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> config;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
