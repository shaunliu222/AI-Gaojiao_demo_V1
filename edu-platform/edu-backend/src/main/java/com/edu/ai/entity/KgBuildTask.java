package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "kg_build_task", autoResultMap = true)
public class KgBuildTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long graphId;
    private Long fileId;
    private String taskType;
    private String status;
    private Integer progress;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> result;
    private String errorMessage;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
