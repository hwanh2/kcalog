/**
 * 체중 차트 좌표 투영 — 값 배열을 SVG 좌표로 옮기는 계산만 담당한다(렌더링 없음).
 * 홈 미니 카드와 체중 탭 추세선이 같은 스케일 규칙을 쓰도록 한 곳에 모았다.
 */
export interface TrendScale {
  /** i번째 점의 x좌표 (점이 하나면 가운데) */
  x: (index: number) => number
  /** 값 v의 y좌표 (위로 갈수록 큰 값) */
  y: (value: number) => number
}

export function trendScale({
  values,
  width,
  height,
  padX,
  padY,
  minSpan = 0,
}: {
  values: number[]
  width: number
  height: number
  padX: number
  padY: number
  /** 값 폭이 이보다 좁으면 이 폭으로 벌려 선이 납작해지지 않게 한다 */
  minSpan?: number
}): TrendScale {
  const n = values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const raw = max - min
  const span = Math.max(raw, minSpan) || 1
  // 최소 폭으로 벌린 만큼 위아래로 균등하게 나눠 가운데 정렬을 유지한다
  const lo = min - (span - raw) / 2

  return {
    x: (index) => (n <= 1 ? width / 2 : padX + (index / (n - 1)) * (width - 2 * padX)),
    y: (value) => height - padY - ((value - lo) / span) * (height - 2 * padY),
  }
}
