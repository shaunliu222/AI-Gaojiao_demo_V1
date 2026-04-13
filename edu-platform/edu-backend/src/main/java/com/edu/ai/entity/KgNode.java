package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "kg_node", autoResultMap = true)
public class KgNode {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long graphId;
    private String name;
    private String nodeType;
    private String description;
    private Long parentId;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> properties;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
