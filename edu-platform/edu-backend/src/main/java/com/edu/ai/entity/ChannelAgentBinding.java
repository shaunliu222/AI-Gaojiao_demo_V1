package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("channel_agent_binding")
public class ChannelAgentBinding {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long channelId;
    private Long agentId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
