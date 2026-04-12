package com.edu.ai.dto;

import lombok.Data;

import java.util.List;

@Data
public class ChatRequest {
    private String model;
    private List<ChatMessage> messages;
    private Boolean stream;
    private String agentId;
}
