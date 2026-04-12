package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "model_config", autoResultMap = true)
public class ModelConfig {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String alias;
    private String provider;
    private String modelName;
    private String apiKey;
    private String endpointUrl;
    private String capability;
    private Integer contextWindow;
    private Integer maxOutput;
    private Integer userLimit;
    private Boolean isDefault;
    private Boolean isPublic;
    private String status;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> config;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
