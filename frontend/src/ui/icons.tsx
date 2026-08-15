/** 인라인 SVG 아이콘 — 라이브러리 없이 쓰고, 라벨이 함께 있으므로 장식으로 취급한다(aria-hidden) */

const base = {
  'aria-hidden': true,
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** 자주 먹는 — 되풀이되는 것이라 시계 */
export function ClockIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

/** 완료 — 이미 처리된 상태를 알리는 배지에 쓴다 */
export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.5}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

/** 즐겨찾기 */
export function StarIcon() {
  return (
    <svg {...base}>
      <path d="M12 4l2.5 5.1 5.5.8-4 3.9.9 5.5L12 16.7 7.1 19.3l.9-5.5-4-3.9 5.5-.8z" />
    </svg>
  )
}

/**
 * 식사 — 포크와 나이프.
 * 칼날은 닫힌 도형으로 그린다(예전 path는 오른쪽 변이 없어 잘린 것처럼 보였다).
 */
export function UtensilsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      {/* 포크 — 바깥 두 갈래(U자) + 가운데 갈래가 그대로 손잡이로 내려온다 */}
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      {/* 나이프 — 칼날(닫힘) + 손잡이 */}
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
      <path d="M21 15v7" />
    </svg>
  )
}

/** 촬영 */
export function CameraIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

/** 닫기·지우기 */
export function CloseIcon() {
  return (
    <svg {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** 설명 덧붙이기 — 말풍선에 더하기 */
export function NoteIcon() {
  return (
    <svg {...base}>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M12 8v5M9.5 10.5h5" />
    </svg>
  )
}

/** AI 분석 — 사진·설명을 넣으면 알아서 채워준다는 뜻의 반짝임 */
export function SparklesIcon() {
  return (
    <svg {...base}>
      <path d="M13 3l1.6 3.9L18.5 8.5l-3.9 1.6L13 14l-1.6-3.9L7.5 8.5l3.9-1.6z" />
      <path d="M6 14l.9 2.1L9 17l-2.1.9L6 20l-.9-2.1L3 17l2.1-.9z" />
    </svg>
  )
}

/** 프로필 — 앱 헤더와 음식기록 날짜 머리가 같은 아이콘을 쓴다(DESIGN.md 5: 같은 뜻에는 같은 아이콘) */
export function UserIcon({ size = 22 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  )
}
