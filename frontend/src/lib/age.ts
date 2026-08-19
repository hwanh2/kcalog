/**
 * 나이 ↔ 출생연도. 화면은 **세는나이**를 쓴다(2002년생이면 2026년에 25세).
 *
 * 저장하는 값은 출생연도 하나뿐이고, 여기서만 나이로 바꾼다. 온보딩 입력과 프로필 표시가
 * 각자 계산하면 입력한 25가 프로필에서 24로 보이는 어긋남이 생긴다.
 *
 * 백엔드의 BMR 계산은 이 값을 쓰지 않는다. Mifflin-St Jeor는 만 나이 공식이라
 * `연도 − 출생연도`(연 나이)를 그대로 쓴다. 세는나이를 넣으면 한 살 많게 계산된다.
 * 화면용과 계산용이 다른 것은 의도된 것이고, 차이는 BMR에서 5kcal이다.
 */
export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear + 1
}

export function birthYearFromAge(age: number, now = new Date()): number {
  return now.getFullYear() - age + 1
}
