import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearMessages,
  getBriefing,
  getMessages,
  streamMessage,
} from '../api/coach'
import type { CoachingBriefing, CoachingChatMessage } from '../api/coach'
import { CoachPage } from './CoachPage'

vi.mock('../api/coach', () => ({
  getBriefing: vi.fn(),
  getMessages: vi.fn(),
  streamMessage: vi.fn(),
  clearMessages: vi.fn(),
}))
const getBriefingMock = vi.mocked(getBriefing)
const getMessagesMock = vi.mocked(getMessages)
const streamMessageMock = vi.mocked(streamMessage)
const clearMessagesMock = vi.mocked(clearMessages)

const briefing: CoachingBriefing = {
  hasData: true,
  headline: '감량 페이스 순조로워요',
  message: '지난 7일 동안 잘 가고 있어요. 오늘은 지방을 살짝 줄여봐요.',
  recommendations: [
    { category: 'meal', title: '점심 단백질', detail: '닭가슴살 샐러드 추천' },
    { category: 'hydration', title: '수분', detail: '물 1L 더 마시기' },
  ],
  stats: { lossKg: -0.7, adherencePct: 86, streakDays: 14 },
  source: 'LLM',
}

const insufficient: CoachingBriefing = {
  hasData: false,
  headline: '기록이 더 쌓이면 코칭을 시작해요',
  message: '식사와 체중을 며칠 기록하면 코칭을 만들어 드릴게요.',
  recommendations: [],
  stats: { lossKg: null, adherencePct: null, streakDays: null },
  source: 'NONE',
}

const msg = (id: number, role: 'USER' | 'ASSISTANT', content: string): CoachingChatMessage => ({
  id,
  role,
  content,
  createdAt: '2026-08-11T00:00:00Z',
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CoachPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getBriefingMock.mockResolvedValue(briefing)
  getMessagesMock.mockResolvedValue([])
  streamMessageMock.mockImplementation(async (_content, onToken) => {
    onToken('닭가슴살 ')
    onToken('샐러드 추천해요.')
    return msg(2, 'ASSISTANT', '닭가슴살 샐러드 추천해요.')
  })
  clearMessagesMock.mockResolvedValue(undefined)
})

describe('CoachPage', () => {
  it('브리핑 헤드라인·본문·3스탯·추천을 렌더한다', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('감량 페이스 순조로워요')).toBeInTheDocument())
    expect(screen.getByText('-0.7')).toBeInTheDocument()
    expect(screen.getByText('86')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('오늘의 추천')).toBeInTheDocument()
    expect(screen.getByText('점심 단백질')).toBeInTheDocument()
    expect(screen.getByText('닭가슴살 샐러드 추천')).toBeInTheDocument()
  })

  it('데이터가 부족하면 안내를 보여주고 스탯·추천은 숨긴다', async () => {
    getBriefingMock.mockResolvedValue(insufficient)
    renderPage()

    await waitFor(() =>
      expect(screen.getByText('기록이 더 쌓이면 코칭을 시작해요')).toBeInTheDocument(),
    )
    expect(screen.queryByText('오늘의 추천')).not.toBeInTheDocument()
    expect(screen.queryByText('달성률')).not.toBeInTheDocument()
  })

  it('질문을 보내면 스트리밍으로 응답을 받아 표시한다', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByLabelText('코치에게 물어보기')).toBeInTheDocument())
    await user.type(screen.getByLabelText('코치에게 물어보기'), '점심 뭐 먹을까요?')

    getMessagesMock.mockResolvedValue([
      msg(1, 'USER', '점심 뭐 먹을까요?'),
      msg(2, 'ASSISTANT', '닭가슴살 샐러드 추천해요.'),
    ])
    await user.click(screen.getByRole('button', { name: '보내기' }))

    await waitFor(() =>
      expect(streamMessageMock).toHaveBeenCalledWith(
        '점심 뭐 먹을까요?',
        expect.any(Function),
        expect.any(AbortSignal),
      ),
    )
    await waitFor(() => expect(screen.getByText('닭가슴살 샐러드 추천해요.')).toBeInTheDocument())
  })

  it('퀵칩을 누르면 그 문구로 질문을 보낸다', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: '오늘 뭐 먹을까?' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '오늘 뭐 먹을까?' }))

    await waitFor(() =>
      expect(streamMessageMock).toHaveBeenCalledWith(
        '오늘 뭐 먹을까?',
        expect.any(Function),
        expect.any(AbortSignal),
      ),
    )
  })

  it('초기화를 누르면 대화를 비운다', async () => {
    getMessagesMock.mockResolvedValue([msg(1, 'USER', '안녕'), msg(2, 'ASSISTANT', '안녕하세요!')])
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('안녕하세요!')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '초기화' }))

    await waitFor(() => expect(clearMessagesMock).toHaveBeenCalled())
  })
})
