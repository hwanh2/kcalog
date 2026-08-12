import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboard } from '../api/dashboard'
import { getKcalSuggestion, updateMember } from '../api/member'
import type { MemberResponse } from '../api/member'
import { getReport } from '../api/report'
import { getTdee } from '../api/tdee'
import { getWeightSummary } from '../api/weight'
import { AuthContext } from '../auth/context'
import { makeMember } from '../test/utils'
import { ProfilePage } from './ProfilePage'

vi.mock('../api/member', () => ({
  getKcalSuggestion: vi.fn(),
  updateMember: vi.fn(),
}))
vi.mock('../api/weight', () => ({ getWeightSummary: vi.fn() }))
vi.mock('../api/tdee', () => ({ getTdee: vi.fn() }))
vi.mock('../api/dashboard', () => ({ getDashboard: vi.fn() }))
vi.mock('../api/report', () => ({ getReport: vi.fn() }))

const getKcalSuggestionMock = vi.mocked(getKcalSuggestion)
const updateMemberMock = vi.mocked(updateMember)
const getWeightSummaryMock = vi.mocked(getWeightSummary)
const getTdeeMock = vi.mocked(getTdee)
const getDashboardMock = vi.mocked(getDashboard)
const getReportMock = vi.mocked(getReport)

const savedMember = makeMember({
  onboardingCompleted: true,
  gender: 'MALE',
  birthYear: 1990,
  heightCm: 175,
  activityLevel: 'MID',
  targetWeightKg: 65,
  dailyKcalTarget: 1930,
  latestWeightKg: 70,
  goal: 'CUT',
})

function renderProfile(member: MemberResponse = savedMember) {
  const reloadMember = vi.fn().mockResolvedValue(undefined)
  const signOut = vi.fn().mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AuthContext value={{ state: { status: 'authed', member }, reloadMember, signOut }}>
        <MemoryRouter initialEntries={['/profile']}>
          <ProfilePage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
  return { reloadMember, signOut }
}

/** 편집 시트를 연다 — 폼은 이제 페이지가 아니라 시트 안에 있다 */
async function openEditSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /프로필 편집/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  getWeightSummaryMock.mockResolvedValue({
    points: [
      { logDate: '2026-08-01', weightKg: 75, trendKg: 75 },
      { logDate: '2026-08-12', weightKg: 70, trendKg: 70.4 },
    ],
    latestKg: 70,
    latestTrendKg: 70.4,
    bmi: null,
    streakDays: 12,
    projection: { status: 'NO_GOAL', targetKg: null, projectedDate: null, weeks: null, weeklyRateKg: null },
  })
  getTdeeMock.mockResolvedValue({
    status: 'OK',
    maintenanceKcal: 2400,
    source: 'ADAPTIVE',
    currentTargetKcal: 1930,
    recommendedTargetKcal: 1900,
    windowDays: 14,
    coverage: 0.8,
  })
  getDashboardMock.mockResolvedValue({
    totalKcal: 0,
    carbG: 0,
    proteinG: 0,
    fatG: 0,
    dailyKcalTarget: 1930,
    remainingKcal: 1930,
    carbTargetG: 241,
    proteinTargetG: 145,
    fatTargetG: 43,
    timeline: [],
  })
  getReportMock.mockResolvedValue({
    period: 'WEEK',
    rangeStart: '2026-08-03',
    rangeEnd: '2026-08-09',
    daysLogged: 5,
    avgKcal: 1720,
    targetKcal: 1930,
    onTargetDays: 3,
    avgCarbG: 200,
    avgProteinG: 120,
    avgFatG: 40,
    carbPct: 50,
    proteinPct: 30,
    fatPct: 20,
    carbTargetG: 241,
    proteinTargetG: 145,
    fatTargetG: 43,
    buckets: [],
    tdeeSeries: [],
    insights: [],
  })
})

describe('ProfilePage — 요약', () => {
  it('이름·신체 정보·연속 기록을 보여준다', async () => {
    renderProfile()

    expect(screen.getByText('테스터')).toBeInTheDocument()
    expect(screen.getByText('175cm')).toBeInTheDocument()
    expect(screen.getByText('감량')).toBeInTheDocument()
    expect(await screen.findByText(/12일 연속 기록/)).toBeInTheDocument()
  })

  it('체중 진행률을 시작·현재·목표로 보여준다', async () => {
    renderProfile()

    // 75 → 70, 목표 65 → 절반(50%)
    expect(await screen.findByText('목표까지 50%')).toBeInTheDocument()
    expect(screen.getByText('75kg → 65kg')).toBeInTheDocument()
    expect(screen.getByText('남은 감량 5kg')).toBeInTheDocument()
  })

  it('목표 체중이 없으면 진행률 대신 안내를 보여준다', async () => {
    renderProfile(makeMember({ ...savedMember, targetWeightKg: null }))

    expect(await screen.findByText('목표 체중을 정하면 진행률을 보여드려요.')).toBeInTheDocument()
  })

  it('유지 칼로리와 목표 섭취를 나란히 보여준다', async () => {
    renderProfile()

    expect(await screen.findByText('2,400')).toBeInTheDocument() // TDEE
    expect(screen.getByText('1,930')).toBeInTheDocument() // 목표
    expect(screen.getByText('-470kcal')).toBeInTheDocument() // 차이
    expect(screen.getByText('241g')).toBeInTheDocument() // 탄수화물 목표
  })

  it('주간 요약에 최근 3주가 나온다', async () => {
    renderProfile()

    expect(await screen.findByText('주간 요약')).toBeInTheDocument()
    expect(screen.getAllByText('1,720 kcal')).toHaveLength(3)
  })
})

describe('ProfilePage — 편집', () => {
  it('프로필 편집을 누르면 시트에 저장값이 채워져 열린다', async () => {
    const user = userEvent.setup()
    renderProfile()

    await openEditSheet(user)

    expect(screen.getByLabelText('키 (cm)')).toHaveValue('175')
    expect(screen.getByLabelText('목표 체중 (kg, 선택)')).toHaveValue('65')
    expect(screen.getByLabelText('일일 칼로리 목표')).toHaveValue('1930')
    expect(getKcalSuggestionMock).not.toHaveBeenCalled() // 변경 전엔 재계산 없음
  })

  it('활동량을 바꾸면 새 제안 칼로리를 조회해 보여주고, 적용 버튼으로 목표에 반영한다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockResolvedValue({
      maintenanceKcal: 2400,
      carbTargetG: 220,
      proteinTargetG: 130,
      fatTargetG: 40,
      dailyKcalTarget: 2250,
    })
    renderProfile()
    await openEditSheet(user)

    await user.selectOptions(screen.getByLabelText('활동량'), 'HIGH')

    expect(await screen.findByText('2250 kcal')).toBeInTheDocument()
    expect(getKcalSuggestionMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityLevel: 'HIGH', weightKg: 70 }),
    )

    await user.click(screen.getByRole('button', { name: '제안 적용' }))
    expect(screen.getByLabelText('일일 칼로리 목표')).toHaveValue('2250')
  })

  it('변경된 필드만 담아 저장하고 회원 상태를 갱신한 뒤 시트를 닫는다', async () => {
    const user = userEvent.setup()
    updateMemberMock.mockResolvedValue(savedMember)
    const { reloadMember } = renderProfile()
    await openEditSheet(user)

    const kcalField = screen.getByLabelText('일일 칼로리 목표')
    await user.clear(kcalField)
    await user.type(kcalField, '2200')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMemberMock).toHaveBeenCalledWith({ dailyKcalTarget: 2200 }) // 변경분만
    expect(reloadMember).toHaveBeenCalled()
  })

  it('유효 범위 밖 목표는 저장하지 않고 오류를 표시한다', async () => {
    const user = userEvent.setup()
    renderProfile()
    await openEditSheet(user)

    const kcalField = screen.getByLabelText('일일 칼로리 목표')
    await user.clear(kcalField)
    await user.type(kcalField, '100')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('일일 칼로리 목표는 800~10000 범위여야 합니다')).toBeInTheDocument()
    expect(updateMemberMock).not.toHaveBeenCalled()
  })
})

describe('ProfilePage — 설정', () => {
  it('로그아웃 버튼은 auth의 로그아웃 처리를 호출한다', async () => {
    const user = userEvent.setup()
    const { signOut } = renderProfile()

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(signOut).toHaveBeenCalled()
  })
})
