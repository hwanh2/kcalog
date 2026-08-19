import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboard } from '../api/dashboard'
import type { Dashboard } from '../api/dashboard'
import { getMeals } from '../api/meal'
import type { Meal } from '../api/meal'
import { getWeights } from '../api/weight'
import type { MemberResponse } from '../api/member'
import { getBriefing } from '../api/coach'
import { AuthContext } from '../auth/context'
import { makeMember } from '../test/utils'
import { HomePage } from './HomePage'

vi.mock('../api/dashboard', () => ({ getDashboard: vi.fn() }))
vi.mock('../api/meal', () => ({ getMeals: vi.fn() }))
vi.mock('../api/weight', () => ({ getWeights: vi.fn() }))
vi.mock('../api/coach', () => ({ getBriefing: vi.fn() }))
const getDashboardMock = vi.mocked(getDashboard)
const getMealsMock = vi.mocked(getMeals)
const getWeightsMock = vi.mocked(getWeights)

const dashboard: Dashboard = {
  totalKcal: 1050,
  carbG: 115,
  proteinG: 45,
  fatG: 32,
  dailyKcalTarget: 2000,
  remainingKcal: 950,
  carbTargetG: 250,
  proteinTargetG: 150,
  fatTargetG: 44,
  timeline: [],
}

const lunch: Meal = {
  id: 1,
  eatenAt: '2026-08-08T03:00:00Z',
  mealType: 'LUNCH',
  source: 'AI',
  totalKcal: 650,
  carbG: 75,
  proteinG: 30,
  fatG: 22,
  imageUrl: null,
  items: [{ name: '김치찌개', kcal: 650, carbG: 75, proteinG: 30, fatG: 22, quantity: 1, unit: '인분' }],
}

function renderPage(memberOverrides: Partial<MemberResponse> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <AuthContext
      value={{
        state: { status: 'authed', member: makeMember({ nickname: '김지훈', ...memberOverrides }) },
        reloadMember: vi.fn(),
        signOut: vi.fn(),
      }}
    >
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getDashboardMock.mockResolvedValue(dashboard)
  getMealsMock.mockResolvedValue([])
  getWeightsMock.mockResolvedValue([])
  vi.mocked(getBriefing).mockResolvedValue({
    hasData: false,
    headline: '',
    message: '',
    recommendations: [],
    stats: { lossKg: null, adherencePct: null, streakDays: null },
    source: 'NONE',
  })
})

describe('HomePage 대시보드', () => {
  it('칼로리 링 — 남은 칼로리와 섭취/목표를 표시', async () => {
    renderPage()

    expect(await screen.findByText('남은 칼로리')).toBeInTheDocument()
    expect(screen.getAllByText('950').length).toBeGreaterThan(0) // 링 중앙 + 하단 '남은'
    expect(screen.getByText('1,050')).toBeInTheDocument() // 하단 '섭취'
    expect(screen.getByText('2,000')).toBeInTheDocument() // 하단 '목표'
  })

  it('탄단지 달성도 — 매크로별 목표 대비 g·%', async () => {
    renderPage()

    expect(await screen.findByText('오늘의 탄·단·지 달성도')).toBeInTheDocument()
    // 탄 115/250 = 46%
    expect(screen.getByText(/115g/)).toBeInTheDocument()
    expect(screen.getByText(/\/ 250g \(46%\)/)).toBeInTheDocument()
  })

  /*
    목표 숫자만 보면 "앱이 정해준 값"으로 읽힌다 — 기준선인 유지칼로리와 조절 폭을 여기서 알린다.
    숫자가 본문에 있으므로 문구가 아니라 **표의 값**을 확인한다 (design D12).
  */
  it('칼로리 헤더의 안내는 유지칼로리 기준선과 조절 폭을 보여준다', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('오늘의 칼로리')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '유지칼로리 안내 열기' }))

    const guide = await screen.findByRole('dialog', { name: '유지칼로리 안내' })
    expect(within(guide).getByText(/유지칼로리를 알아야/)).toBeInTheDocument()
    // 증량은 감량과 대칭이 아니다 — 이 문단이 빠지면 같은 숫자로 오해한다
    expect(within(guide).getByText('늘릴 때는 더 천천히')).toBeInTheDocument()

    /* 숫자는 단위가 <span>으로 쪼개져 있어 노드 단위로 잡히지 않는다 — 시트 전체 글에서 확인한다.
       하루 −500 → 한 달 −2.0kg, −300 → −1.2kg (체지방 1kg ≈ 7700kcal) */
    const text = guide.textContent ?? ''
    expect(text).toContain('−500')
    expect(text).toContain('−2.0')
    expect(text).toContain('−300')
    expect(text).toContain('−1.2')
  })

  /*
    목표를 매일 마주하는 자리다 — 오해도 여기서 생긴다. 다만 문구를 상시로 깔면 잔소리가 되므로
    (i)를 눌렀을 때만 열려야 한다 (design D9).
  */
  it('달성도 옆 안내는 눌러야 열린다', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('오늘의 탄·단·지 달성도')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '탄단지 목표 안내 열기' }))

    const guide = await screen.findByRole('dialog', { name: '탄단지 목표 안내' })
    expect(within(guide).getByText(/일부를 지방으로 바꿔/)).toBeInTheDocument()
    expect(within(guide).getByText(/모두 포함/)).toBeInTheDocument()
  })

  it('목표 초과 — "목표 초과"와 절대값 표시', async () => {
    getDashboardMock.mockResolvedValue({ ...dashboard, totalKcal: 2400, remainingKcal: -400 })
    renderPage()

    expect(await screen.findByText('목표 초과')).toBeInTheDocument()
    expect(screen.getByText('400')).toBeInTheDocument()
  })

  it('오늘 식사 목록 — 음식명·kcal·매크로 칩', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    expect(await screen.findByText('김치찌개')).toBeInTheDocument()
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
    expect(screen.getByText('탄 75g')).toBeInTheDocument()
  })

  it('사진 없는 기록도 자리표시가 들어간다 — 빈 칸이면 줄마다 글자 시작점이 어긋난다', async () => {
    getMealsMock.mockResolvedValue([lunch]) // imageUrl: null
    renderPage()

    await screen.findByText('김치찌개')
    expect(screen.queryByAltText('식사 사진')).not.toBeInTheDocument()
    // 식기 아이콘 자리표시 — 음식기록 탭과 같은 아이콘
    expect(document.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('끼니가 칩으로 구분된다 — 홈은 여러 끼니가 한 목록에 섞이는 유일한 자리다', async () => {
    getMealsMock.mockResolvedValue([
      lunch,
      { ...lunch, id: 2, mealType: 'DINNER', items: [{ ...lunch.items[0], name: '된장찌개' }] },
    ])
    renderPage()

    expect(await screen.findByText('점심')).toBeInTheDocument()
    expect(screen.getByText('저녁')).toBeInTheDocument()
  })

  it('아침부터 끼니 순서로 정렬한다 — 뒤늦게 채운 아침이 저녁 아래로 가면 안 된다', async () => {
    // 서버는 저장 시각 오름차순으로 준다: 저녁(18시 저장) → 아침(21시에 뒤늦게 채움)
    getMealsMock.mockResolvedValue([
      {
        ...lunch,
        id: 1,
        mealType: 'DINNER',
        eatenAt: '2026-08-08T09:00:00Z',
        items: [{ ...lunch.items[0], name: '된장찌개' }],
      },
      {
        ...lunch,
        id: 2,
        mealType: 'BREAKFAST',
        eatenAt: '2026-08-08T12:00:00Z',
        items: [{ ...lunch.items[0], name: '토스트' }],
      },
    ])
    renderPage()

    await screen.findByText('토스트')
    const names = screen.getAllByText(/토스트|된장찌개/).map((el) => el.textContent)
    expect(names).toEqual(['토스트', '된장찌개'])
  })

  it('기록 없는 날 — 안내 문구', async () => {
    renderPage()
    expect(await screen.findByText('오늘 기록한 식사가 없어요.')).toBeInTheDocument()
  })

  it('전체보기 — 음식기록 탭 링크', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: /전체보기/ })
    expect(link).toHaveAttribute('href', '/app/records')
  })

  it('체중 추세 카드 — 최근 체중·7일 변화·목표까지 남은 양·그래프', async () => {
    getWeightsMock.mockResolvedValue([
      { logDate: '2026-08-01', weightKg: 68.7 },
      { logDate: '2026-08-08', weightKg: 68.4 },
    ])
    renderPage()

    expect(await screen.findByText('68.4')).toBeInTheDocument()
    expect(screen.getByText('−0.3kg (7일)')).toBeInTheDocument()
    // 목표 65kg(makeMember 기본 픽스처는 null이라 아래 테스트에서 별도 확인)
    expect(screen.getByRole('img', { name: '체중 추세 그래프' })).toBeInTheDocument()
  })

  it('체중 추세 카드 — 목표 체중이 있으면 남은 양을 보여준다', async () => {
    getWeightsMock.mockResolvedValue([{ logDate: '2026-08-08', weightKg: 68.5 }])
    renderPage({ targetWeightKg: 65 })

    expect(await screen.findByText('목표까지 3.5kg')).toBeInTheDocument()
  })

  it('날짜 선택 — 캘린더에서 날짜를 고르면 그 날짜로 다시 조회', async () => {
    renderPage()
    await screen.findByText('남은 칼로리')

    fireEvent.change(screen.getByLabelText('날짜 선택'), { target: { value: '2026-08-01' } })

    await waitFor(() => expect(getMealsMock).toHaveBeenCalledWith('2026-08-01'))
  })

  it('조회 실패 — 에러 안내', async () => {
    getDashboardMock.mockRejectedValue(new Error('down'))
    renderPage()
    expect(await screen.findByText(/대시보드를 불러오지 못했어요/)).toBeInTheDocument()
  })

  it('오늘의 칼로리 헤더 — 코칭 한 줄과 카드 전체 리포트 링크', async () => {
    vi.mocked(getBriefing).mockResolvedValue({
      hasData: true,
      headline: '감량 페이스 순조로움',
      message: '잘 가고 있어요.',
      recommendations: [],
      stats: { lossKg: -0.3, adherencePct: 80, streakDays: 5 },
      source: 'LLM',
    })
    renderPage()

    expect(await screen.findByText('오늘의 칼로리')).toBeInTheDocument()
    expect(await screen.findByText('감량 페이스 순조로움')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '리포트 보기' })).toHaveAttribute('href', '/app/report')
  })

  /*
    카드 전체가 링크라 (i)를 링크 안에 넣으면 눌러도 리포트로 새어 나간다.
    링크를 형제로 깔고 버튼을 z-10으로 올린 이유가 이것이다 — 눌러서 시트가 뜨는지로 확인한다.
  */
  it('카드가 링크여도 (i)를 누르면 리포트로 새지 않고 안내가 열린다', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('오늘의 칼로리')
    await user.click(screen.getByRole('button', { name: '유지칼로리 안내 열기' }))

    expect(await screen.findByRole('dialog', { name: '유지칼로리 안내' })).toBeInTheDocument()
  })

  it('상단 인사말 — 시간대 인사 + 성 뗀 이름 + 님', async () => {
    renderPage()
    // 시간대에 따라 인사 문구는 달라지되 성(김)을 뗀 이름 + 님으로 끝난다
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/지훈님$/)
    expect(heading.textContent).not.toContain('김지훈')
  })

  it('오늘의 AI 코칭 카드 — 본문을 보여주고 AI PT로 이동', async () => {
    vi.mocked(getBriefing).mockResolvedValue({
      hasData: true,
      headline: '감량 페이스 순조로움',
      message: '오늘 아침 단백질이 조금 부족했어요.',
      recommendations: [],
      stats: { lossKg: null, adherencePct: null, streakDays: null },
      source: 'LLM',
    })
    renderPage()

    expect(await screen.findByText('오늘의 AI 코칭')).toBeInTheDocument()
    expect(screen.getByText('오늘 아침 단백질이 조금 부족했어요.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /오늘의 AI 코칭/ })).toHaveAttribute('href', '/app/ai-pt')
  })
})

describe('촬영 유도 카드', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('촬영 흐름으로 간다 — 예전 /meals/new는 없는 라우트라 눌러도 화면만 비었다', async () => {
    renderPage()

    const link = await screen.findByRole('link', { name: /촬영 및 기록/ })
    expect(link.getAttribute('href')).toMatch(/^\/app\/records\?camera=1&meal=/)
  })

  it('카드에 적힌 끼니를 그대로 실어 보낸다 — 도착 화면이 다시 시각을 보면 갈린다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 7, 15, 19, 0, 0))
    renderPage()

    await screen.findByText('저녁 촬영 및 기록')
    expect(screen.getByRole('link', { name: /촬영 및 기록/ })).toHaveAttribute(
      'href',
      '/app/records?camera=1&meal=DINNER',
    )
  })

  it('아무것도 기록하지 않은 채 저녁에 열어도 "아침"이라 하지 않는다', async () => {
    // 기록 이력이 아니라 시각으로 정한다 — 넘어갈 음식기록 탭이 시각으로 정하기 때문이다(design D1).
    // shouldAdvanceTime — 안 주면 가짜 시계가 멈춰 react-query의 대기가 끝나지 않는다
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 7, 15, 19, 0, 0)) // 저녁 7시
    renderPage()

    expect(await screen.findByText('저녁 촬영 및 기록')).toBeInTheDocument()
    expect(screen.queryByText('아침 촬영 및 기록')).not.toBeInTheDocument()
  })

  it('점심에 열면 점심을 권한다 — 아침을 이미 기록했는지와 무관하게', async () => {
    getMealsMock.mockResolvedValue([lunch]) // 점심이 이미 있어도 시각이 기준이다
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 7, 15, 12, 30, 0))
    renderPage()

    expect(await screen.findByText('점심 촬영 및 기록')).toBeInTheDocument()
  })
})
