package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "sec_audit_log", autoResultMap = true)
public class SecAuditLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String sessionId;
    private String inputText;
    private String outputText;
    private String hitRule;
    private String actionTaken;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> details;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
