package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "channel_config", autoResultMap = true)
public class ChannelConfig {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String channelType;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> config;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
