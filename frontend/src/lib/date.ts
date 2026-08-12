/** 서비스 기준 시간대 — 백엔드 Clock(Asia/Seoul)과 맞춘다 */
const ZONE = 'Asia/Seoul'

/** 하루가 바뀌는 시각(시) — 백엔드 ServiceDay.BOUNDARY의 거울 */
const SERVICE_DAY_BOUNDARY_HOUR = 5

/** 달력 날짜를 YYYY-MM-DD로 — 자정 기준. 체중처럼 달력 날짜를 쓰는 기능 전용.
 *  en-CA 로캘은 YYYY-MM-DD 형식을 낸다 */
export function todayLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date())
}

/**
 * 섭취 기준의 "오늘" — 05시에 하루가 바뀐다(백엔드 ServiceDay와 동일 규칙).
 * 새벽 2시에 먹은 야식은 전날의 기록이므로, 그 시각에 앱을 열면 전날 날짜를 봐야 방금 담은 기록이 보인다.
 * 식사 기록·홈 대시보드·리포트처럼 섭취를 다루는 화면이 쓴다(체중은 todayLocalDate).
 */
export function todayServiceDate(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - SERVICE_DAY_BOUNDARY_HOUR * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(shifted)
}

/**
 * 그 날짜로 기록할 섭취 시각(ISO).
 * 오늘(서비스 하루 기준)이면 지금 시각 그대로, 과거 날짜면 그 날의 정오로 둔다 —
 * 과거 날짜에 새벽 시각을 쓰면 05시 경계 때문에 하루 전으로 밀려버린다.
 * <p>
 * 지금 화면에는 과거 날짜로 담는 경로가 없다(음식기록 탭은 오늘만 다룬다).
 * 과거 분기는 날짜 선택이 생길 때를 위해 남겨둔 것이며, 그때까지는 테스트로만 지켜진다.
 */
export function eatenAtFor(date: string, now: Date = new Date()): string {
  if (date === todayServiceDate(now)) {
    return now.toISOString()
  }
  return new Date(`${date}T12:00:00+09:00`).toISOString()
}

/** YYYY-MM-DD에 일수를 더한다(음수면 과거). UTC 정오 기준으로 계산해 DST·시간대 영향 없음 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
