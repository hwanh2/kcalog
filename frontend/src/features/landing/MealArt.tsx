/**
 * 위에서 내려다본 한 상 — 랜딩의 "찍는다" 장면에 쓴다.
 *
 * 실제 음식 사진 자산이 없어서 **일러스트로 그린다.** 남의 사진을 가져다 쓰거나 사진처럼
 * 보이게 흉내내지 않는다 — 그림이라는 게 분명히 보이는 편이 낫다.
 * 색은 토큰만 쓴다(`fill-*` 유틸리티).
 */
export function MealArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      role="img"
      aria-label="위에서 내려다본 한 상 그림 — 찌개, 밥, 반찬"
    >
      {/* 상 */}
      <rect width="300" height="300" rx="24" className="fill-carb-soft" />
      <rect x="14" y="14" width="272" height="272" rx="18" className="fill-brand-soft" />

      {/* 찌개 */}
      <circle cx="112" cy="118" r="66" className="fill-surface" />
      <circle cx="112" cy="118" r="55" className="fill-protein" />
      <circle cx="112" cy="118" r="55" className="fill-ink/10" />
      <circle cx="96" cy="104" r="9" className="fill-carb" />
      <circle cx="128" cy="112" r="7" className="fill-surface/70" />
      <circle cx="108" cy="140" r="6" className="fill-carb/80" />
      <ellipse cx="130" cy="136" rx="11" ry="6" className="fill-fat/50" />

      {/* 밥 */}
      <circle cx="222" cy="104" r="46" className="fill-surface" />
      <circle cx="222" cy="104" r="36" className="fill-canvas" />
      <circle cx="212" cy="96" r="4" className="fill-border" />
      <circle cx="230" cy="110" r="3" className="fill-border" />

      {/* 반찬 둘 */}
      <circle cx="96" cy="226" r="34" className="fill-surface" />
      <circle cx="96" cy="226" r="25" className="fill-success" />
      <circle cx="96" cy="226" r="25" className="fill-surface/25" />

      <circle cx="182" cy="216" r="30" className="fill-surface" />
      <circle cx="182" cy="216" r="21" className="fill-carb" />
      <rect x="170" y="206" width="24" height="5" rx="2.5" className="fill-carb-soft/80" />
      <rect x="172" y="218" width="20" height="5" rx="2.5" className="fill-carb-soft/60" />

      {/* 젓가락 */}
      <rect x="238" y="176" width="7" height="96" rx="3.5" transform="rotate(9 238 176)" className="fill-carb-ink/70" />
      <rect x="252" y="176" width="7" height="96" rx="3.5" transform="rotate(9 252 176)" className="fill-carb-ink/70" />
    </svg>
  )
}
