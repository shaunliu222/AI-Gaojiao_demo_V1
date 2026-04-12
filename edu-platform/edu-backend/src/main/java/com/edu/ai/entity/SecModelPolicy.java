package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sec_model_policy")
public class SecModelPolicy {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long roleId;
    private Long modelId;
    private Boolean allowed;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
