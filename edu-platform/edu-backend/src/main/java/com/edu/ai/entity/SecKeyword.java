package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sec_keyword")
public class SecKeyword {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String word;
    private String category;
    private String severity;
    private Short status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
