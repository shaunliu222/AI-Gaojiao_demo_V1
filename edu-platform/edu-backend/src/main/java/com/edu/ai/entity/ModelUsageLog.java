package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("model_usage_log")
public class ModelUsageLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long modelId;
    private String sessionId;
    private Integer inputTokens;
    private Integer outputTokens;
    private BigDecimal cost;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
