package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("kg_graph")
public class KgGraph {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private Long ownerId;
    private Boolean isPublic;
    private Integer nodeCount;
    private Integer edgeCount;
    private String status;
    @TableLogic
    private Short deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
