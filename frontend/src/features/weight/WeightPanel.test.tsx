import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWeights, recordWeight } from '../../api/weight'
import { WeightPanel } from './WeightPanel'

vi.mock('../../api/weight', () => ({
  getWeights: vi.fn(),
  recordWeight: vi.fn(),
}))
const getWeightsMock = vi.mocked(getWeights)
const recordWeightMock = vi.mocked(recordWeight)

const DATE = '2026-08-08'

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <WeightPanel date={DATE} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WeightPanel', () => {
  it('기존 기록이 있으면 입력을 채우고 추이를 그린다', async () => {
    getWeightsMock.mockResolvedValue([
      { logDate: '2026-08-07', weightKg: 71 },
      { logDate: DATE, weightKg: 70.5 },
    ])
    renderPanel()

    await waitFor(() => expect(screen.getByLabelText('체중 (kg)')).toHaveValue('70.5'))
    expect(screen.getByRole('button', { name: '체중 수정' })).toBeInTheDocument()
    expect(screen.getByText('70.5 kg')).toBeInTheDocument() // 추이 최신값
    expect(screen.getByRole('img', { name: '체중 추이 그래프' })).toBeInTheDocument()
  })

  it('체중 저장 — recordWeight를 날짜와 함께 호출', async () => {
    const user = userEvent.setup()
    getWeightsMock.mockResolvedValue([])
    recordWeightMock.mockResolvedValue({ logDate: DATE, weightKg: 68.2 })
    renderPanel()

    await user.type(screen.getByLabelText('체중 (kg)'), '68.2')
    await user.click(screen.getByRole('button', { name: '체중 저장' }))

    await waitFor(() =>
      expect(recordWeightMock).toHaveBeenCalledWith({ weightKg: 68.2, logDate: DATE }),
    )
  })

  it('범위 밖 값은 저장하지 않고 오류 표시', async () => {
    const user = userEvent.setup()
    getWeightsMock.mockResolvedValue([])
    renderPanel()

    await user.type(screen.getByLabelText('체중 (kg)'), '300')
    await user.click(screen.getByRole('button', { name: '체중 저장' }))

    expect(screen.getByText(/30~250kg 범위/)).toBeInTheDocument()
    expect(recordWeightMock).not.toHaveBeenCalled()
  })

  it('기록이 없으면 추이 대신 안내', async () => {
    getWeightsMock.mockResolvedValue([])
    renderPanel()

    expect(await screen.findByText('최근 체중 기록이 없어요.')).toBeInTheDocument()
  })
})
