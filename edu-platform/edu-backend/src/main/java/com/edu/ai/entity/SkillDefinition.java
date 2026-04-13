package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "skill_definition", autoResultMap = true)
public class SkillDefinition {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private String skillType;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> config;
    private Long ownerId;
    private Boolean isPublic;
    private Short status;
    @TableLogic
    private Short deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
