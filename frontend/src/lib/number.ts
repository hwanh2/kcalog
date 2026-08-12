/** 소수 첫째 자리 — 매크로(g) 표시·합산의 부동소수 잔차를 감춘다 */
export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** 소수 둘째 자리 — 수량(0.5 단위)의 부동소수 잔차를 감춘다 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** 수량 표기 — 1.0 → "1", 1.5 → "1.5" */
export function formatQuantity(value: number): string {
  return String(round2(value))
}
