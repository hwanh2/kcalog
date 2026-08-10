package com.kcalog.support;

import com.kcalog.global.storage.StorageService;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 통합 테스트용 인메모리 스토리지 — MinIO 컨테이너 없이 저장·조회·삭제를 재현한다.
 * 실제 S3 접근을 하지 않아 Testcontainers Postgres 단일 컨테이너 구성을 유지한다.
 */
public class InMemoryStorageService implements StorageService {

    private final Map<String, StoredImage> store = new ConcurrentHashMap<>();

    @Override
    public String put(long memberId, byte[] bytes, String contentType) {
        String key = memberId + "/" + UUID.randomUUID();
        store.put(key, new StoredImage(bytes.clone(), contentType));
        return key;
    }

    @Override
    public StoredImage get(String key) {
        StoredImage image = store.get(key);
        if (image == null) {
            throw NoSuchKeyException.builder().message("no such key: " + key).build();
        }
        return image;
    }

    @Override
    public void delete(String key) {
        store.remove(key);
    }

    public boolean has(String key) {
        return store.containsKey(key);
    }
}
