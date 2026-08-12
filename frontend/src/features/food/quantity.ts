/** 1.0 → "1", 1.5 → "1.5" — 수량 표기를 한 곳에서 맞춘다 */
export function formatQuantity(value: number): string {
  return String(Math.round(value * 100) / 100)
}
