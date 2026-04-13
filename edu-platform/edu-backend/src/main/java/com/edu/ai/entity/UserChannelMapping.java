package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("user_channel_mapping")
public class UserChannelMapping {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String channelType;
    private String channelUserId;
    private Long platformUserId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
