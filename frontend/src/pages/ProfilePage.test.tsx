import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
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

describe('ProfilePage — 나이·성별 편집', () => {
  it('저장된 성별·출생연도가 채워지고, 출생연도 옆에 나이가 환산돼 붙는다', async () => {
    const user = userEvent.setup()
    renderProfile()
    await openEditSheet(user)

    expect(screen.getByLabelText('성별')).toHaveValue('MALE')
    // 화면은 세는나이 — 1990년생이면 올해가 2026년일 때 37세 (lib/age)
    const age = new Date().getFullYear() - 1990 + 1
    expect(screen.getByLabelText(`출생연도 (${age}세)`)).toHaveValue('1990')
  })

  it('바꾼 성별·출생연도만 담아 저장한다', async () => {
    const user = userEvent.setup()
    updateMemberMock.mockResolvedValue(savedMember)
    renderProfile()
    await openEditSheet(user)

    await user.selectOptions(screen.getByLabelText('성별'), 'FEMALE')
    const birthField = screen.getByLabelText(/출생연도/)
    await user.clear(birthField)
    await user.type(birthField, '1994')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMemberMock).toHaveBeenCalledWith({ gender: 'FEMALE', birthYear: 1994 })
  })

  it('제안 칼로리는 저장값이 아니라 **편집 중인** 성별·출생연도로 조회한다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockResolvedValue({
      maintenanceKcal: 1900,
      carbTargetG: 190,
      proteinTargetG: 110,
      fatTargetG: 35,
      dailyKcalTarget: 1600,
    })
    renderProfile()
    await openEditSheet(user)

    await user.selectOptions(screen.getByLabelText('성별'), 'FEMALE')

    expect(await screen.findByText('1600 kcal')).toBeInTheDocument()
    expect(getKcalSuggestionMock).toHaveBeenCalledWith(
      expect.objectContaining({ gender: 'FEMALE', birthYear: 1990 }),
    )
  })

  it('범위 밖 출생연도는 저장하지 않고 오류를 표시한다', async () => {
    const user = userEvent.setup()
    renderProfile()
    await openEditSheet(user)

    const birthField = screen.getByLabelText(/출생연도/)
    await user.clear(birthField)
    await user.type(birthField, '1800')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText(/출생연도는 1920~/)).toBeInTheDocument()
    expect(updateMemberMock).not.toHaveBeenCalled()
  })
})

describe('ProfilePage — 유지칼로리 다시 계산', () => {
  /** 두 진입점이 같은 곳으로 가면 하나는 거짓말이다 (design D3) */
  it('영양 목표의 버튼은 편집이 아니라 재계산 시트를 연다', async () => {
    const user = userEvent.setup()
    renderProfile()

    await user.click(await screen.findByRole('button', { name: '유지칼로리 다시 계산' }))

    expect(screen.getByRole('dialog', { name: '유지칼로리 다시 계산' })).toBeInTheDocument()
    expect(screen.queryByLabelText('키 (cm)')).not.toBeInTheDocument()
  })

  it('유지칼로리와 계산 근거·추천 목표를 함께 보여준다', async () => {
    const user = userEvent.setup()
    renderProfile()

    await user.click(await screen.findByRole('button', { name: '유지칼로리 다시 계산' }))

    expect(await screen.findByText('최근 14일 실측')).toBeInTheDocument()
    expect(screen.getByText('1,900 kcal')).toBeInTheDocument()
  })

  it('실측이면 무엇을 넣어 계산했는지 설명한다 — 배지는 방식만 말한다', async () => {
    const user = userEvent.setup()
    renderProfile()

    await user.click(await screen.findByRole('button', { name: '유지칼로리 다시 계산' }))

    const basis = await screen.findByRole('region', { name: '계산 근거' })
    expect(basis).toHaveTextContent('기록한 식사의 하루 평균 칼로리')
    expect(basis).toHaveTextContent('체중 추세가 움직인 만큼')
  })

  it('공식 추정이면 다른 근거를 설명한다 — 무엇을 더 하면 실측이 되는지까지', async () => {
    const user = userEvent.setup()
    getTdeeMock.mockResolvedValue({
      status: 'INSUFFICIENT_DATA',
      maintenanceKcal: 2400,
      source: 'FORMULA',
      currentTargetKcal: 1930,
      recommendedTargetKcal: 1900,
      windowDays: 14,
      coverage: 0.2,
    })
    renderProfile()

    await user.click(await screen.findByRole('button', { name: '유지칼로리 다시 계산' }))

    const basis = await screen.findByRole('region', { name: '계산 근거' })
    expect(basis).toHaveTextContent('성별·나이·키·현재 체중')
    expect(basis).toHaveTextContent(/14일/)
    expect(basis).not.toHaveTextContent('기록한 식사의 하루 평균 칼로리')
  })

  it('적용하면 목표가 바뀌고 회원 상태를 다시 읽는다 — 목표는 auth의 member가 들고 있다', async () => {
    const user = userEvent.setup()
    updateMemberMock.mockResolvedValue(savedMember)
    const { reloadMember } = renderProfile()

    await user.click(await screen.findByRole('button', { name: '유지칼로리 다시 계산' }))
    await user.click(await screen.findByRole('button', { name: '적용' }))

    expect(updateMemberMock).toHaveBeenCalledWith({ dailyKcalTarget: 1900 })
    expect(reloadMember).toHaveBeenCalled()
  })

  it('추천이 현재 목표와 같으면 적용을 권하지 않는다', async () => {
    const user = userEvent.setup()
    getTdeeMock.mockResolvedValue({
      status: 'OK',
      maintenanceKcal: 2400,
      source: 'ADAPTIVE',
      currentTargetKcal: 1930,
      recommendedTargetKcal: 1930,
      windowDays: 14,
      coverage: 0.8,
    })
    renderProfile()

    await user.click(await screen.findByRole('button', { name: '유지칼로리 다시 계산' }))

    expect(await screen.findByText('현재 목표와 같아요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '적용' })).not.toBeInTheDocument()
  })

  it('계산할 데이터가 없으면 숫자 대신 무엇을 하면 되는지 알린다', async () => {
    const user = userEvent.setup()
    getTdeeMock.mockResolvedValue({
      status: 'INSUFFICIENT_DATA',
      maintenanceKcal: null,
      source: 'FORMULA',
      currentTargetKcal: 1930,
      recommendedTargetKcal: null,
      windowDays: 14,
      coverage: 0,
    })
    renderProfile()

    await user.click(await screen.findByRole('button', { name: '유지칼로리 다시 계산' }))

    expect(
      await screen.findByText('체중과 식사를 꾸준히 기록하면 실제 데이터로 유지칼로리를 계산해드려요.'),
    ).toBeInTheDocument()
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

describe('ProfilePage — 탄단지 안내', () => {
  it('안내는 눌러야 열린다 — 매일 보는 화면에 상시 노출하지 않는다', async () => {
    const user = userEvent.setup()
    renderProfile()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: '탄단지 목표 안내 열기' }))

    const guide = await screen.findByRole('dialog', { name: '탄단지 목표 안내' })
    expect(within(guide).getByText(/일부를 지방으로 바꿔/)).toBeInTheDocument()
  })
})
