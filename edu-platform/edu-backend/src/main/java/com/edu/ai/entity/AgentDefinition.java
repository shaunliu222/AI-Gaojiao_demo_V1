package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "agent_definition", autoResultMap = true)
public class AgentDefinition {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private String avatar;
    private String category;
    private String agentType;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> config;
    private String status;
    private Long ownerId;
    private Boolean isPublic;
    private Long useCount;
    @TableLogic
    private Short deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
