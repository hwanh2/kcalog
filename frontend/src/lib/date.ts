/** 오늘 날짜를 YYYY-MM-DD로 — 서비스 기준 시간대(Asia/Seoul)로 고정.
 *  백엔드가 KST로 하루 경계를 잡으므로(findByDate), 프론트도 KST '오늘'을 보내 자정 근처 시간대 어긋남을 막는다.
 *  en-CA 로캘은 YYYY-MM-DD 형식을 낸다 */
export function todayLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

/** YYYY-MM-DD에 일수를 더한다(음수면 과거). UTC 정오 기준으로 계산해 DST·시간대 영향 없음 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
