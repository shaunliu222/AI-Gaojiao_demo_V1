package com.edu.ai.config;

import com.edu.ai.common.CryptoUtil;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CryptoConfig {

    @Value("${crypto.secret-key:}")
    private String secretKey;

    @PostConstruct
    public void init() {
        if (secretKey != null && !secretKey.isEmpty()) {
            CryptoUtil.setSecretKey(secretKey);
        }
    }
}
