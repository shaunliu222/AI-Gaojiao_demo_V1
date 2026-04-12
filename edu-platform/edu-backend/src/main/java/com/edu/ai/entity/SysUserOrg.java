package com.edu.ai.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName("sys_user_org")
public class SysUserOrg {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long orgId;
}
