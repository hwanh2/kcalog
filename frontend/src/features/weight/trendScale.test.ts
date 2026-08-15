import { describe, expect, it } from 'vitest'
import { trendScale } from './trendScale'

describe('trendScale', () => {
  it('마지막 점을 오른쪽 끝에 놓는다', () => {
    const { x } = trendScale({ values: [70, 71, 72], count: 3, width: 320, height: 150, padX: 20, padY: 20 })

    expect(x(0)).toBe(20)
    expect(x(2)).toBe(300)
  })

  /**
   * 체중 추세선은 y축 범위를 잡으려고 실측·추세 두 계열을 한 배열로 넘긴다(점 하나당 값 두 개).
   * x 개수를 그 배열 길이에서 유추하면 점들이 **왼쪽 절반에 몰리고**, 오른쪽 끝(오늘 자리)이 빈다 —
   * 방금 저장한 오늘 체중이 그래프에 안 들어간 것처럼 보였다.
   */
  it('값이 점보다 많아도(실측+추세) 점 개수만큼 나눈다', () => {
    const points = [
      { weightKg: 74, trendKg: 74 },
      { weightKg: 73, trendKg: 73.5 },
      { weightKg: 72.7, trendKg: 73 },
      { weightKg: 72.7, trendKg: 72.8 },
    ]
    const values = points.flatMap((p) => [p.weightKg, p.trendKg]) // 길이 8, 점은 4개

    const { x } = trendScale({ values, count: points.length, width: 320, height: 150, padX: 20, padY: 20 })

    expect(x(points.length - 1)).toBe(300) // 오른쪽 끝 — 값 길이(8)를 쓰면 160에 그친다
  })

  it('점이 하나면 가운데에 놓는다', () => {
    const { x } = trendScale({ values: [70], count: 1, width: 320, height: 150, padX: 20, padY: 20 })

    expect(x(0)).toBe(160)
  })

  it('값 폭이 minSpan보다 좁으면 그만큼 벌리고 가운데 정렬을 유지한다', () => {
    const { y } = trendScale({
      values: [70, 70.2],
      count: 2,
      width: 320,
      height: 100,
      padX: 0,
      padY: 10,
      minSpan: 1,
    })

    // 폭 0.2를 1로 벌리면 위아래로 0.4씩 남는다 → 두 값은 안쪽에 모인다
    expect(y(70)).toBeCloseTo(100 - 10 - 0.4 * 80, 5)
    expect(y(70.2)).toBeCloseTo(100 - 10 - 0.6 * 80, 5)
  })
})
