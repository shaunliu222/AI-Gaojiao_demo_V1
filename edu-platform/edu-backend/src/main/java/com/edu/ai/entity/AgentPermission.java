package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("agent_permission")
public class AgentPermission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long agentId;
    private String targetType;
    private Long targetId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
