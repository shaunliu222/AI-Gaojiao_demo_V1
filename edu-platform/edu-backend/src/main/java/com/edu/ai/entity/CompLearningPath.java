package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "comp_learning_path", autoResultMap = true)
public class CompLearningPath {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long assessmentId;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> pathData;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
