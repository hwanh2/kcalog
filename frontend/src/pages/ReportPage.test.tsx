import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReport } from '../api/report'
import type { Report } from '../api/report'
import { ReportPage } from './ReportPage'

vi.mock('../api/report', () => ({ getReport: vi.fn() }))
const getReportMock = vi.mocked(getReport)

const bucket = (label: string) => ({ label, startDate: '2026-08-03', kcal: 2000, carbG: 220, proteinG: 120, fatG: 60 })

const report: Report = {
  period: 'WEEK',
  rangeStart: '2026-08-03',
  rangeEnd: '2026-08-09',
  daysLogged: 6,
  avgKcal: 2100,
  targetKcal: 1900,
  onTargetDays: 2,
  avgCarbG: 220,
  avgProteinG: 120,
  avgFatG: 60,
  carbPct: 45,
  proteinPct: 25,
  fatPct: 30,
  carbTargetG: 226,
  proteinTargetG: 136,
  fatTargetG: 40,
  buckets: ['월', '화', '수', '목', '금', '토', '일'].map(bucket),
  tdeeSeries: [
    { label: '월', maintenanceKcal: 2200, source: 'ADAPTIVE' },
    { label: '화', maintenanceKcal: 2210, source: 'ADAPTIVE' },
  ],
  insights: [{ code: 'over-target', message: '칼로리 목표를 4일 초과했어요.' }],
}

const empty: Report = { ...report, daysLogged: 0, avgKcal: null, onTargetDays: null, insights: [], tdeeSeries: [], buckets: [] }

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ReportPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('ReportPage', () => {
  it('달성·일별 분포·인사이트 섹션을 렌더한다', async () => {
    getReportMock.mockResolvedValue(report)
    renderPage()

    await waitFor(() => expect(screen.getByText('목표 달성')).toBeInTheDocument())
    expect(screen.getByText('일별 분포')).toBeInTheDocument()
    expect(screen.getByText('칼로리 목표를 4일 초과했어요.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '유지칼로리 변화 그래프' })).toBeInTheDocument()
  })

  it('막대를 탭하면 툴팁으로 그날 탄단지를 보여준다', async () => {
    getReportMock.mockResolvedValue(report)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('일별 분포')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '월 상세' }))
    expect(screen.getByText('탄 220g')).toBeInTheDocument()
  })

  it('기간 토글(월간)로 바꾸면 그 기간을 조회한다', async () => {
    getReportMock.mockResolvedValue(report)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(getReportMock).toHaveBeenCalledWith('WEEK'))
    await user.click(screen.getByRole('tab', { name: '월간' }))
    await waitFor(() => expect(getReportMock).toHaveBeenCalledWith('MONTH'))
  })

  it('기록이 없으면 안내를 보여준다', async () => {
    getReportMock.mockResolvedValue(empty)
    renderPage()

    await waitFor(() => expect(screen.getByText(/기록이 없어요/)).toBeInTheDocument())
  })
})
