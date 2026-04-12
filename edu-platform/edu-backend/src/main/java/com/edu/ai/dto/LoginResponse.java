package com.edu.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LoginResponse {
    private String token;
    private String username;
    private String name;
    private String role;
    private String avatar;
    private List<String> permissions;
}
