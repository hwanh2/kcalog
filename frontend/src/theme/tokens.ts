/**
 * 색 토큰 — `src/index.css`의 `@theme`와 **값이 같아야 한다**.
 * 여기 있는 이유는 대비를 테스트로 검증하기 위해서다(CSS는 테스트에서 읽을 수 없다).
 * 토큰을 추가·수정하면 양쪽을 함께 고친다. tokens.test.ts가 기준 미달을 잡는다.
 *
 * 면(SURFACE)과 글씨(INK)를 나눈 이유 — WCAG 대비 기준은 텍스트에만 걸린다.
 * 진행 막대·버튼 바탕·아이콘 면은 목업 v2의 밝은 값을 그대로 쓰고,
 * 같은 색 계열을 글씨로 쓸 때만 어두운 짝을 쓴다.
 */

/** 배경·막대·버튼 바탕으로 쓰는 색 — 대비 기준의 대상이 아니다 */
export const SURFACE = {
  canvas: '#f8fafc',
  surface: '#ffffff',
  track: '#eef1f6',
  border: '#e2e8f0',
  brand: '#ff6b00',
  brandDark: '#e55a00',
  brandSoft: '#fff5ed',
  carb: '#f59e0b',
  carbSoft: '#fef3c7',
  protein: '#ef4444',
  proteinSoft: '#fee2e2',
  fat: '#06b6d4',
  fatSoft: '#cffafe',
  successSoft: '#ecfdf5',
  /* 코치 캐릭터(새싹) — 그림에만 쓰는 면이라 대비 기준의 대상이 아니다 */
  sprout: '#4fa84f',
  sproutLight: '#7fd07f',
  sproutDark: '#3d8c3d',
  sproutBlush: '#ffb98c',
  sproutFace: '#6b3410',
  /** 파괴적 확인 버튼의 바탕 — INK.danger와 같은 값이지만 쓰임이 면이라 여기에도 둔다 */
  danger: '#b91c1c',
} as const

/**
 * 글씨로 쓰는 색. 매크로 계열은 Tailwind 색상표의 **700 단계**로 통일했다(앰버·로즈·시안).
 *
 * ⚠️ **`-ink`가 곧 "AA 안전"은 아니다.** `carbInk`·`proteinInk`·`fatInk`는 PAIRS에서
 * 검증되지만 `brandInk`는 KNOWN_EXCEPTIONS의 미달 색이다(3.21~3.64:1). 브랜드 계열만
 * 예외라는 걸 모르고 `text-brand-ink`를 새 화면에 쓰면 기준을 지켰다고 오인할 수 있다.
 */
export const INK = {
  ink: '#0f172a',
  /**
   * slate-500(#64748b)과 600(#475569) 사이의 값.
   * 500은 track(#eef1f6) 위에서 4.20으로 미달하고 — 비활성 세그먼트 라벨이 여기 올라간다 —
   * 600은 본문 먹색과 너무 가까워져 1차·2차 텍스트의 위계가 무너진다.
   */
  muted: '#5b6878',
  onBrand: '#ffffff',
  /**
   * 브랜드 글씨·포커스 링. `#ff6b00`의 색조(H≈25°)를 그대로 두고 명도만 12% 내린 값이다.
   *
   * ⚠️ 흰 배경 3.64:1 — 본문 기준(4.5:1)에는 **미달**이고 KNOWN_EXCEPTIONS에 있다.
   * AA를 지키려면 `#b84d00`(4.52)까지 내려가야 하는데 눈에 띄게 칙칙해져,
   * 브랜드 인상을 우선해 여기서 멈추기로 했다(2026-08-13 결정).
   * 포커스 링으로 쓰일 때는 비텍스트 기준(3:1)을 넘으므로 문제 없다.
   */
  brandInk: '#e05e00',
  carbInk: '#b45309', // amber-700
  proteinInk: '#b91c1c', // red-700
  fatInk: '#0e7490', // cyan-700
  success: '#047857', // emerald-700
  danger: '#b91c1c', // red-700 — proteinInk와 같은 값이지만 의미가 다르므로 따로 둔다
} as const

/**
 * 글씨 색과 그 색이 실제로 얹히는 배경의 조합.
 * 화면에 없는 조합까지 검사하면 쓰지도 않는 제약이 생기므로, **실제 사용처만** 적는다.
 */
export const PAIRS: { name: string; ink: string; on: string }[] = [
  // 본문·보조 텍스트는 세 층의 면 위에 모두 올라간다
  { name: 'ink on surface', ink: INK.ink, on: SURFACE.surface },
  { name: 'ink on canvas', ink: INK.ink, on: SURFACE.canvas },
  { name: 'ink on track', ink: INK.ink, on: SURFACE.track },
  { name: 'muted on surface', ink: INK.muted, on: SURFACE.surface },
  { name: 'muted on canvas', ink: INK.muted, on: SURFACE.canvas },
  { name: 'muted on track', ink: INK.muted, on: SURFACE.track },
  { name: 'muted on border', ink: INK.muted, on: SURFACE.border }, // 비활성 카운트 배지

  // 매크로 칩 — soft 배경 위 글씨
  { name: 'carbInk on carbSoft', ink: INK.carbInk, on: SURFACE.carbSoft },
  { name: 'proteinInk on proteinSoft', ink: INK.proteinInk, on: SURFACE.proteinSoft },
  { name: 'fatInk on fatSoft', ink: INK.fatInk, on: SURFACE.fatSoft },

  // 매크로 글씨 — 배경 없이 흰 면 위
  { name: 'carbInk on surface', ink: INK.carbInk, on: SURFACE.surface },
  { name: 'proteinInk on surface', ink: INK.proteinInk, on: SURFACE.surface },
  { name: 'fatInk on surface', ink: INK.fatInk, on: SURFACE.surface },

  // 상태 색
  { name: 'success on successSoft', ink: INK.success, on: SURFACE.successSoft },
  { name: 'danger on surface', ink: INK.danger, on: SURFACE.surface },
  { name: 'onBrand on danger', ink: INK.onBrand, on: SURFACE.danger }, // 삭제 확인 버튼
]

/**
 * AA를 만족하지 못하지만 **의도적으로 유지하는** 조합.
 *
 * 브랜드 면 위의 흰 글씨/아이콘(주요 버튼·카메라 FAB·활성 카운트 배지)이 2.86:1이다.
 * `#ff6b00`에 흰 글씨를 얹으면서 4.5:1을 만족시킬 방법은 없고, 큰 글씨 완화 기준(3:1)에도
 * 미치지 못해 **폰트를 키워도 해결되지 않는다.**
 *
 * 통과하는 대안(#c94d00 4.62 · #c2410c 5.18 · 먹색 글씨 6.25)을 실물로 비교한 뒤,
 * 브랜드 색을 서비스 정체성으로 보고 현재 값을 유지하기로 했다(2026-08-13 결정).
 *
 * 여기 남겨두는 이유는 **잊지 않기 위해서다.** 아래 테스트가 이 목록을 검증하므로,
 * 새 조합을 예외로 넣으려면 이 파일을 고쳐야 하고 그 변경이 리뷰에 드러난다.
 */
export const KNOWN_EXCEPTIONS: { name: string; ink: string; on: string; why: string }[] = [
  {
    name: 'onBrand on brand',
    ink: INK.onBrand,
    on: SURFACE.brand,
    why: '주요 버튼·FAB·활성 배지 — 브랜드 정체성 유지, 통과하는 오렌지는 모두 비비드함을 잃는다',
  },
  {
    name: 'onBrand on brandDark',
    ink: INK.onBrand,
    on: SURFACE.brandDark,
    why: '3.63:1 — 사진 위 안내 배지·로고/FAB 그라데이션의 어두운 끝. brand(2.86)보다는 낫지만 본문 기준에는 미달',
  },
  // 브랜드 글씨 — 밝은 면들 위에서 3.21~3.64:1.
  // AA를 지키려면 #b84d00(최악 4.52)까지 내려가야 하는데 눈에 띄게 칙칙해져 여기서 멈췄다.
  { name: 'brandInk on surface', ink: INK.brandInk, on: SURFACE.surface, why: '3.64:1' },
  { name: 'brandInk on canvas', ink: INK.brandInk, on: SURFACE.canvas, why: '3.48:1' },
  { name: 'brandInk on track', ink: INK.brandInk, on: SURFACE.track, why: '3.21:1' },
  { name: 'brandInk on brandSoft', ink: INK.brandInk, on: SURFACE.brandSoft, why: '3.39:1' },
]
