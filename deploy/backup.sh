#!/usr/bin/env bash
# 운영 DB 백업 — pg_dump → gzip → R2 업로드 → 보관 기간 지난 백업 정리.
# VM의 cron에서 하루 1회 실행한다:
#   0 18 * * * /home/<배포유저>/kcalog/backup.sh >> /home/<배포유저>/kcalog/backup.log 2>&1
#
# 관리형 DB를 쓰지 않으므로 자동 백업이 없다 — 이 스크립트가 유일한 방어선이다.

set -euo pipefail

cd "$(dirname "$0")"

# shellcheck disable=SC1091
set -a; . ./.env; set +a

: "${BACKUP_BUCKET:?BACKUP_BUCKET 미설정}"
: "${BACKUP_ENDPOINT:?BACKUP_ENDPOINT 미설정}"
: "${BACKUP_ACCESS_KEY:?BACKUP_ACCESS_KEY 미설정}"
: "${BACKUP_SECRET_KEY:?BACKUP_SECRET_KEY 미설정}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

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
