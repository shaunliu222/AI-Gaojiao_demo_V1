package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "comp_assessment", autoResultMap = true)
public class CompAssessment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long graphId;
    private String jobNodeId;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> result;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> gapAnalysis;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
