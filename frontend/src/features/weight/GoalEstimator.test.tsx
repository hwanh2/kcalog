import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GoalEstimator } from './GoalEstimator'
import type { ProjectionInfo } from '../../api/weight'

describe('GoalEstimator', () => {
  it('목표가 없으면 렌더하지 않는다', () => {
    const projection: ProjectionInfo = {
      status: 'NO_GOAL', targetKg: null, projectedDate: null, weeks: null, weeklyRateKg: null,
    }
    const { container } = render(<GoalEstimator startKg={72} currentKg={70} projection={projection} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ON_TRACK — 목표까지 남은 양·페이스·예상일을 보여준다', () => {
    const projection: ProjectionInfo = {
      status: 'ON_TRACK', targetKg: 65, projectedDate: '2026-09-03', weeks: 5, weeklyRateKg: -0.42,
    }
    render(<GoalEstimator startKg={71.8} currentKg={68.4} projection={projection} />)

    expect(screen.getByText(/목표 체중 65 kg까지/)).toBeInTheDocument()
    expect(screen.getByText(/-3.4 kg/)).toBeInTheDocument() // 65 - 68.4
    expect(screen.getByText(/주당 평균 -0.42kg/)).toBeInTheDocument()
    expect(screen.getByText(/9월 3일 \(목\)/)).toBeInTheDocument()
    expect(screen.getByText(/시작 71.8kg/)).toBeInTheDocument()
    expect(screen.getByText(/현재 68.4kg/)).toBeInTheDocument()
  })

  it('INSUFFICIENT_DATA — 예상일 대신 안내', () => {
    const projection: ProjectionInfo = {
      status: 'INSUFFICIENT_DATA', targetKg: 65, projectedDate: null, weeks: null, weeklyRateKg: null,
    }
    render(<GoalEstimator startKg={71.8} currentKg={68.4} projection={projection} />)
    expect(screen.getByText(/기록이 더 쌓이면/)).toBeInTheDocument()
  })
})
