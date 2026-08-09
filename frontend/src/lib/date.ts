/** 오늘 날짜를 로컬 시간대 기준 YYYY-MM-DD로 — 대시보드·기록 조회의 기본 날짜 */
export function todayLocalDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}
