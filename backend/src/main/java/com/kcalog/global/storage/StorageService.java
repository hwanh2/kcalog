package com.kcalog.global.storage;

/**
 * 사진 Object Storage 추상화 (design D3). 구현은 설정으로 교체(로컬 MinIO / 운영 S3·R2).
 * key는 회원 스코프(`{memberId}/{uuid}`)를 포함해 소유권 검증을 쉽게 한다.
 */
public interface StorageService {

    /** 이미지를 저장하고 접근 key(`{memberId}/{uuid}`)를 반환한다 */
    String put(long memberId, byte[] bytes, String contentType);

    /** key로 이미지 바이트·content-type을 조회한다 */
    StoredImage get(String key);

    /** key의 이미지를 삭제한다 (없어도 조용히 통과) */
    void delete(String key);

    /** 저장된 이미지 — 바이트와 content-type */
    record StoredImage(byte[] bytes, String contentType) {
    }
}
