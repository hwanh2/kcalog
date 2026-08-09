/** 오늘 날짜를 YYYY-MM-DD로 — 서비스 기준 시간대(Asia/Seoul)로 고정.
 *  백엔드가 KST로 하루 경계를 잡으므로(findByDate), 프론트도 KST '오늘'을 보내 자정 근처 시간대 어긋남을 막는다.
 *  en-CA 로캘은 YYYY-MM-DD 형식을 낸다 */
export function todayLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}
