import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTdee } from '../../api/tdee'
import type { TdeeInfo } from '../../api/tdee'
import { updateMember } from '../../api/member'
import { TdeeCard } from './TdeeCard'

vi.mock('../../api/tdee', () => ({ getTdee: vi.fn() }))
vi.mock('../../api/member', () => ({ updateMember: vi.fn() }))
const getTdeeMock = vi.mocked(getTdee)
const updateMemberMock = vi.mocked(updateMember)

const base: TdeeInfo = {
  status: 'OK',
  maintenanceKcal: 2220,
  source: 'ADAPTIVE',
  currentTargetKcal: 1900,
  recommendedTargetKcal: 1720,
  windowDays: 14,
  coverage: 1,
}

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TdeeCard />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TdeeCard', () => {
  it('실측(ADAPTIVE) 유지칼로리와 추천 목표·적용을 보여준다', async () => {
    getTdeeMock.mockResolvedValue(base)
    updateMemberMock.mockResolvedValue({} as never)
    const user = userEvent.setup()
    renderCard()

    await waitFor(() => expect(screen.getByText('2,220')).toBeInTheDocument())
    expect(screen.getByText('최근 14일 실측')).toBeInTheDocument()
    expect(screen.getByText('1,720 kcal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '적용' }))
    await waitFor(() => expect(updateMemberMock).toHaveBeenCalledWith({ dailyKcalTarget: 1720 }))
  })

  it('추천이 현재 목표와 같으면 적용 버튼 대신 안내', async () => {
    getTdeeMock.mockResolvedValue({ ...base, recommendedTargetKcal: 1900 })
    renderCard()

    await waitFor(() => expect(screen.getByText('현재 목표와 같아요')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '적용' })).not.toBeInTheDocument()
  })

  it('공식(FORMULA) 폴백은 정밀화 안내를 보여준다', async () => {
    getTdeeMock.mockResolvedValue({ ...base, status: 'INSUFFICIENT_DATA', source: 'FORMULA' })
    renderCard()

    await waitFor(() => expect(screen.getByText('공식 추정')).toBeInTheDocument())
    expect(screen.getByText(/정밀해져요/)).toBeInTheDocument()
  })

  it('유지칼로리를 못 내면 기록 유도 안내', async () => {
    getTdeeMock.mockResolvedValue({ ...base, maintenanceKcal: null, recommendedTargetKcal: null })
    renderCard()

    await waitFor(() => expect(screen.getByText(/유지칼로리를 계산해드려요/)).toBeInTheDocument())
  })
})
