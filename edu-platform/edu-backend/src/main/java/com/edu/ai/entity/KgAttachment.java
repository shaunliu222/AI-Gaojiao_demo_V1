package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("kg_attachment")
public class KgAttachment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long graphId;
    private String nodeId;
    private Long fileId;
    private String contentSnippet;
    private String vectorId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
