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
 * 음식기록 탭에 날짜 선택이 생기면서 과거 분기가 실제로 쓰인다.
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

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * YYYY-MM-DD → 요일 한 글자("월").
 * 체중 추세선과 음식기록 주간 띠가 함께 쓴다 — 한 곳에 두지 않으면 요일 계산 규칙이 갈린다.
 */
export function koreanWeekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/**
 * 그 날짜가 속한 주(월~일) 7일. 주의 시작은 월요일 —
 * 한국에서 달력·주간 리포트가 모두 월요일부터라 여기만 일요일 시작이면 어긋난다.
 */
export function weekDates(dateStr: string): string[] {
  const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getUTCDay() // 0=일
  const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = addDays(dateStr, toMonday)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
