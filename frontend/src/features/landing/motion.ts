/**
 * 연출을 걸어도 되는 환경인가.
 *
 * 움직임을 줄여달라는 설정이면 걸지 않고, `IntersectionObserver`가 없으면(구형 브라우저·테스트
 * 환경) 연출 자체를 포기한다. **기본값은 항상 "연출 없음"이다** — 연출이 안 도는 것보다
 * 연출을 전제로 숨겨둔 콘텐츠가 안 보이는 쪽이 훨씬 나쁘다.
 */
export function canAnimate(): boolean {
  if (typeof window === 'undefined') return false
  if (!('IntersectionObserver' in window)) return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true
}
