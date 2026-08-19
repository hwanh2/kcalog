/**
 * 코치 캐릭터. 화분에 심긴 새싹으로, 화분이 얼굴이고 잎이 머리다.
 *
 * `ui/icons.tsx`에 두지 않는 이유는 그쪽이 `currentColor`를 쓰는 단색 스트로크 아이콘이어서다.
 * 이 그림은 잎·화분·얼굴이 각각 다른 색이라 그 규칙에 맞지 않는다.
 *
 * 색은 토큰(`--color-sprout-*`, `--color-brand*`)에서 온다. SVG 안에 값을 박으면
 * 팔레트를 바꿀 때 여기만 남는다.
 */
export function SproutIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* 잎보다 먼저 그려 잎 아래로 깔린다 */}
      <path
        d="M24 27.5V19"
        stroke="var(--color-sprout-dark)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* 잎 두 장. 좌우 크기를 달리해야 도장처럼 보이지 않는다 */}
      <path d="M23 23.4c-8.4 0-13.6-5-13.6-11.6 7.3 0 13.6 4.4 13.6 11.6Z" fill="var(--color-sprout)" />
      <path d="M25 20.6c7.6 0 12.4-4.3 12.4-10.2-6.6 0-12.4 3.9-12.4 10.2Z" fill="var(--color-sprout-light)" />
      {/* 화분 */}
      <path
        d="M12.6 30.4h22.8l-2.6 11.4a3 3 0 0 1-2.9 2.3H18.1a3 3 0 0 1-2.9-2.3z"
        fill="var(--color-brand-dark)"
      />
      <rect x="10.8" y="27.2" width="26.4" height="5" rx="2.5" fill="var(--color-brand)" />
      {/* 볼은 눈보다 먼저 그려 눈에 겹치지 않는다 */}
      <ellipse cx="16.4" cy="37.6" rx="2.6" ry="1.8" fill="var(--color-sprout-blush)" />
      <ellipse cx="31.6" cy="37.6" rx="2.6" ry="1.8" fill="var(--color-sprout-blush)" />
      <circle cx="20" cy="35.4" r="2.3" fill="var(--color-sprout-face)" />
      <circle cx="28" cy="35.4" r="2.3" fill="var(--color-sprout-face)" />
      <path
        d="M21 39.4c.9 1.1 1.9 1.6 3 1.6s2.1-.5 3-1.6"
        stroke="var(--color-sprout-face)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
