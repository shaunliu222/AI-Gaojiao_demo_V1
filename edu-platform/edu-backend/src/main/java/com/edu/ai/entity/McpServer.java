package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "mcp_server", autoResultMap = true)
public class McpServer {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String endpointUrl;
    private String transportType;
    private String authType;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> authConfig;
    private String status;
    private Long ownerId;
    private Boolean isPublic;
    @TableLogic
    private Short deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
