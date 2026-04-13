package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("res_parse_task")
public class ResParseTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long fileId;
    private String taskType;
    private String status;
    private String result;
    private String errorMessage;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
