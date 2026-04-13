package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "kg_edge", autoResultMap = true)
public class KgEdge {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long graphId;
    private Long sourceNodeId;
    private Long targetNodeId;
    private String edgeType;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> properties;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
