# photo-storage Specification

## Purpose
TBD - created by archiving change add-photo-async-analysis. Update Purpose after archive.
## Requirements
### Requirement: 사진 저장 추상화
시스템은 사진 바이너리를 Object Storage에 저장·조회·삭제하는 추상화(`StorageService`)를 제공해야 한다(SHALL). 구현은 설정으로 교체 가능해야 하며(MUST), 로컬 개발은 MinIO, 운영은 S3 또는 R2를 사용한다. 저장 시 고유 key를 반환해야 하고(MUST), 코드·문서에 접근 키(시크릿)를 하드코딩하지 않아야 한다(MUST NOT).

#### Scenario: 사진 저장
- **WHEN** 서비스가 이미지 바이트와 content-type으로 저장을 요청하면
- **THEN** 스토리지에 저장되고 이후 조회·삭제에 쓸 고유 key가 반환된다

#### Scenario: 구현 교체
- **WHEN** 배포 환경 설정이 S3/R2를 가리키면
- **THEN** 애플리케이션 코드 변경 없이 해당 스토리지로 저장·조회된다

#### Scenario: 운영 설정 누락
- **WHEN** 운영 프로파일에서 스토리지 접근 정보가 없으면
- **THEN** 기동이 실패(fail-closed)해 잘못된 상태로 뜨지 않는다

### Requirement: 사진 접근 — 소유자 한정
시스템은 저장된 사진을 소유 회원만 조회할 수 있게 해야 한다(SHALL). 타인의 사진 key로 접근하면 거부해야 한다(MUST).

#### Scenario: 본인 사진 조회
- **WHEN** 회원이 자신의 분석/식사에 연결된 사진을 조회하면
- **THEN** 사진이 반환된다

#### Scenario: 타인 사진 접근 차단
- **WHEN** 회원이 자신의 것이 아닌 사진 key로 접근하면
- **THEN** 접근이 거부된다(404/403)

### Requirement: 사진 수명주기
시스템은 사진을 연결된 리소스의 생명주기에 맞춰 정리해야 한다(SHALL). 확정 식사 기록이 삭제되면 연결된 사진도 삭제해야 하며(MUST), 확인되지 않은 분석 작업의 사진은 보존 기간이 지나면 정리해야 한다(MUST).

#### Scenario: 식사 삭제 시 사진 삭제
- **WHEN** 회원이 사진이 연결된 식사 기록을 삭제하면
- **THEN** 스토리지의 해당 사진도 삭제된다

#### Scenario: 미확인 작업 사진 정리
- **WHEN** 확인 저장되지 않은 분석 작업이 보존 기간을 넘기면
- **THEN** 그 작업과 사진이 정리로 삭제된다

