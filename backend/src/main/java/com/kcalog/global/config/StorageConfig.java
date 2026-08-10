package com.kcalog.global.config;

import com.kcalog.global.common.AppProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

/** S3 호환 클라이언트 — endpoint 설정 시 MinIO/R2, 비우면 AWS 기본. build 시점엔 연결하지 않는다. */
@Configuration
public class StorageConfig {

    @Bean
    public S3Client s3Client(AppProperties props) {
        AppProperties.Storage storage = props.storage();
        var builder = S3Client.builder()
                .region(Region.of(storage.region()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(storage.accessKey(), storage.secretKey())))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(storage.pathStyle())
                        .build());
        if (storage.endpoint() != null && !storage.endpoint().isBlank()) {
            builder.endpointOverride(URI.create(storage.endpoint()));
        }
        return builder.build();
    }
}
