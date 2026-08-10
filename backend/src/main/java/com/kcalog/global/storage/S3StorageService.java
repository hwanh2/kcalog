package com.kcalog.global.storage;

import com.kcalog.global.common.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * S3 호환 스토리지 구현 — MinIO/S3/R2 공통(endpoint·pathStyle 설정으로 분기).
 * 버킷 존재 보장은 최초 저장 시 지연 수행(빈 생성 시점에는 네트워크 접근 없음 — 테스트는 fake로 대체).
 */
@Slf4j
@Service
public class S3StorageService implements StorageService {

    private final S3Client s3;
    private final String bucket;
    private final AtomicBoolean bucketEnsured = new AtomicBoolean(false);

    public S3StorageService(S3Client s3, AppProperties props) {
        this.s3 = s3;
        this.bucket = props.storage().bucket();
    }

    @Override
    public String put(long memberId, byte[] bytes, String contentType) {
        ensureBucket();
        String key = memberId + "/" + UUID.randomUUID();
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(bytes));
        return key;
    }

    @Override
    public StoredImage get(String key) {
        ResponseBytes<GetObjectResponse> object =
                s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(key).build());
        return new StoredImage(object.asByteArray(), object.response().contentType());
    }

    @Override
    public void delete(String key) {
        try {
            s3.deleteObject(b -> b.bucket(bucket).key(key));
        } catch (NoSuchKeyException | NoSuchBucketException e) {
            log.debug("삭제 대상 없음(무시): {}", key);
        }
    }

    /** 로컬 MinIO 편의 — 버킷이 없으면 만든다. 운영은 사전 생성돼 head가 통과한다. */
    private void ensureBucket() {
        if (bucketEnsured.get()) return;
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (NoSuchBucketException e) {
            log.info("버킷 생성: {}", bucket);
            s3.createBucket(b -> b.bucket(bucket));
        }
        bucketEnsured.set(true);
    }
}
