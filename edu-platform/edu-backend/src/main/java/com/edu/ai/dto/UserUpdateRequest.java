package com.edu.ai.dto;

import lombok.Data;

@Data
public class UserUpdateRequest {
    private String name;
    private String email;
    private String phone;
    private String avatar;
    private String password;
    private Short status;
}
