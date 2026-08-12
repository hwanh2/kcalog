#!/usr/bin/env bash
# 운영 DB 백업 — pg_dump → gzip → R2 업로드 → 보관 기간 지난 백업 정리.
# VM의 cron에서 하루 1회 실행한다:
#   0 18 * * * /home/<배포유저>/kcalog/backup.sh >> /home/<배포유저>/kcalog/backup.log 2>&1
#
# 관리형 DB를 쓰지 않으므로 자동 백업이 없다 — 이 스크립트가 유일한 방어선이다.

set -euo pipefail

cd "$(dirname "$0")"

# .env는 compose의 env_file 파서용이라 값이 리터럴로 해석된다. 셸로 소싱하면(`. ./.env`)
# 값 안의 $·백틱·따옴표가 평가돼 오파싱되거나 의도치 않게 실행될 수 있으므로, 필요한 키만 그대로 읽는다.
read_env() {
	grep -m1 -E "^$1=" ./.env | cut -d= -f2- || true
}

BACKUP_BUCKET="$(read_env BACKUP_BUCKET)"
BACKUP_ENDPOINT="$(read_env BACKUP_ENDPOINT)"
BACKUP_ACCESS_KEY="$(read_env BACKUP_ACCESS_KEY)"
BACKUP_SECRET_KEY="$(read_env BACKUP_SECRET_KEY)"
BACKUP_REGION="$(read_env BACKUP_REGION)"
RETENTION_DAYS="$(read_env BACKUP_RETENTION_DAYS)"

: "${BACKUP_BUCKET:?BACKUP_BUCKET 미설정}"
: "${BACKUP_ENDPOINT:?BACKUP_ENDPOINT 미설정}"
: "${BACKUP_ACCESS_KEY:?BACKUP_ACCESS_KEY 미설정}"
: "${BACKUP_SECRET_KEY:?BACKUP_SECRET_KEY 미설정}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="kcalog-${STAMP}.sql.gz"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[$(date -u +%FT%TZ)] 덤프 시작"
docker compose -f compose.prod.yml exec -T db pg_dump -U kcalog kcalog | gzip > "$TMP/$FILE"

# 빈 덤프를 올리면 "백업이 있다"는 착각만 남는다 — 크기를 확인하고 진행한다
SIZE="$(stat -c %s "$TMP/$FILE")"
if [ "$SIZE" -lt 1024 ]; then
	echo "덤프가 비정상적으로 작다(${SIZE}B). 업로드하지 않는다." >&2
	exit 1
fi

# aws-cli는 컨테이너로 실행한다 — VM에 별도 설치가 필요 없다
aws_cli() {
	docker run --rm \
		-v "$TMP":/backup \
		-e AWS_ACCESS_KEY_ID="$BACKUP_ACCESS_KEY" \
		-e AWS_SECRET_ACCESS_KEY="$BACKUP_SECRET_KEY" \
		-e AWS_DEFAULT_REGION="${BACKUP_REGION:-auto}" \
		amazon/aws-cli "$@" --endpoint-url "$BACKUP_ENDPOINT"
}

echo "업로드: $FILE (${SIZE}B)"
aws_cli s3 cp "/backup/$FILE" "s3://$BACKUP_BUCKET/$FILE"

# 보관 기간이 지난 백업 삭제
CUTOFF="$(date -u -d "${RETENTION_DAYS} days ago" +%Y%m%d)"
echo "정리: ${CUTOFF} 이전 백업"
aws_cli s3 ls "s3://$BACKUP_BUCKET/" | awk '{print $4}' | while read -r key; do
	[ -n "$key" ] || continue
	day="$(printf '%s' "$key" | sed -n 's/^kcalog-\([0-9]\{8\}\)T.*/\1/p')"
	[ -n "$day" ] || continue
	if [ "$day" -lt "$CUTOFF" ]; then
		echo "삭제: $key"
		aws_cli s3 rm "s3://$BACKUP_BUCKET/$key"
	fi
done

echo "[$(date -u +%FT%TZ)] 완료"
