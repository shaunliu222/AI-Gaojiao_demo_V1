package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("res_file_permission")
public class ResFilePermission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long fileId;
    private String targetType;
    private Long targetId;
    private String permission;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
