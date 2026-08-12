/**
 * WCAG 2.1 대비 계산 — 색 토큰이 글씨로 쓰일 수 있는지 판정하는 데 쓴다.
 * 눈으로 하는 검토는 반드시 새므로, "이 토큰은 이 배경에서 읽힌다"를 테스트로 남긴다.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** #rgb · #rrggbb → [r, g, b] (0~255) */
function channels(hex: string): [number, number, number] {
  const body = hex.replace('#', '')
  const full = body.length === 3 ? [...body].map((c) => c + c).join('') : body
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

/** 상대 휘도 — 검정 0, 흰색 1 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 두 색의 대비비 — 1:1(같은 색) ~ 21:1(검정·흰색). 순서는 상관없다 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * WCAG AA 통과 여부.
 * large=true는 18pt(24px) 이상이거나 14pt(18.66px) 이상 굵은 글씨 — 기준이 3:1로 완화된다.
 */
export function meetsAA(ratio: number, { large = false }: { large?: boolean } = {}): boolean {
  return ratio >= (large ? 3 : 4.5)
}
