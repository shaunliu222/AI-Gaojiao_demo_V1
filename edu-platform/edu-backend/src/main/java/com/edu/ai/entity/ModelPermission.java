package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("model_permission")
public class ModelPermission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long modelId;
    private Long roleId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
