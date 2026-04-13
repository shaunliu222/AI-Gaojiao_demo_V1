package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("res_file")
public class ResFile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String originalName;
    private String fileType;
    private Long fileSize;
    private String storagePath;
    private Long categoryId;
    private String parseStatus;
    private String vectorStatus;
    private String markdownPath;
    private Long ownerId;
    private Boolean isPublic;
    @TableLogic
    private Short deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
