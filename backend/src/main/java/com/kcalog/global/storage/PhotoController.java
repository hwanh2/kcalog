package com.kcalog.global.storage;

import com.kcalog.global.common.LoginMemberId;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * 사진 프록시 — 소유 회원만 조회(design D3). key는 `{memberId}/{name}` 스코프라
 * 경로의 memberId와 로그인 회원이 일치하는지로 소유권을 검증한다(DB 조회 불필요).
 */
@RestController
public class PhotoController {

    private final StorageService storageService;

    public PhotoController(StorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/api/photos/{ownerId}/{name}")
    public ResponseEntity<byte[]> photo(@LoginMemberId Long memberId,
                                        @PathVariable Long ownerId,
                                        @PathVariable String name) {
        if (!memberId.equals(ownerId)) {
            throw new ResponseStatusException(NOT_FOUND, "사진을 찾을 수 없습니다");
        }
        try {
            StorageService.StoredImage image = storageService.get(ownerId + "/" + name);
            MediaType contentType = image.contentType() != null
                    ? MediaType.parseMediaType(image.contentType()) : MediaType.IMAGE_JPEG;
            // 브라우저 콘텐츠 스니핑 차단 — 저장된 content-type으로 svg 등이 스크립트로 해석되지 않게(방어)
            return ResponseEntity.ok()
                    .header("X-Content-Type-Options", "nosniff")
                    .contentType(contentType)
                    .body(image.bytes());
        } catch (NoSuchKeyException e) {
            throw new ResponseStatusException(NOT_FOUND, "사진을 찾을 수 없습니다");
        }
    }
}
