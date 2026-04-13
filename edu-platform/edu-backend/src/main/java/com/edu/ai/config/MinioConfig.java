package com.edu.ai.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class MinioConfig {

    @Value("${minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${minio.access-key:minioadmin}")
    private String accessKey;

    @Value("${minio.secret-key:}")
    private String secretKey;

    @Value("${minio.bucket:edu-resources}")
    private String bucket;

    @Bean
    public MinioClient minioClient() {
        try {
            MinioClient client = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();
            if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket: {}", bucket);
            }
            return client;
        } catch (Exception e) {
            log.warn("MinIO not available: {}. File upload will fail at runtime.", e.getMessage());
            return MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey.isEmpty() ? "placeholder" : secretKey)
                    .build();
        }
    }
}
