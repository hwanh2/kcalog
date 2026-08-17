import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendFeedback } from '../../api/feedback'
import { FeedbackSheet } from './FeedbackSheet'

vi.mock('../../api/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/feedback')>()),
  sendFeedback: vi.fn(),
}))
const sendMock = vi.mocked(sendFeedback)

function renderSheet(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <FeedbackSheet appVersion="1.0.0" onClose={onClose} />
    </QueryClientProvider>,
  )
  return { onClose }
}

function sendButton() {
  return screen.getByRole('button', { name: /보내기/ })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FeedbackSheet', () => {
  it('내용과 앱 버전을 보낸다 — 기기 정보는 서버가 헤더에서 읽는다', async () => {
    const user = userEvent.setup()
    sendMock.mockResolvedValue({ id: 1, createdAt: '2026-08-17T00:00:00Z' })
    renderSheet()

    await user.type(screen.getByLabelText('의견 내용'), '  분석이 느려요  ')
    await user.click(sendButton())

    // TanStack Query가 두 번째 인자로 컨텍스트를 함께 넘기므로 첫 인자만 본다
    await waitFor(() => expect(sendMock).toHaveBeenCalled())
    expect(sendMock.mock.calls[0][0]).toEqual({ content: '분석이 느려요', appVersion: '1.0.0' })
  })

  it('빈 내용이면 보낼 수 없다 — 공백만 적은 것도 마찬가지다', async () => {
    const user = userEvent.setup()
    renderSheet()

    expect(sendButton()).toBeDisabled()

    await user.type(screen.getByLabelText('의견 내용'), '   ')
    expect(sendButton()).toBeDisabled()

    await user.type(screen.getByLabelText('의견 내용'), '한 글자')
    expect(sendButton()).toBeEnabled()
  })

  it('상한을 넘기면 화면에서 먼저 막는다 — 서버까지 갔다가 거절당할 이유가 없다', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByLabelText('의견 내용'))
    await user.paste('가'.repeat(2001))

    expect(screen.getByText('2001 / 2000')).toBeInTheDocument()
    expect(sendButton()).toBeDisabled()
  })

  it('보내고 나면 받았다고 알린다 — 답장은 약속하지 않는다', async () => {
    const user = userEvent.setup()
    sendMock.mockResolvedValue({ id: 1, createdAt: '2026-08-17T00:00:00Z' })
    renderSheet()

    await user.type(screen.getByLabelText('의견 내용'), '좋아요')
    await user.click(sendButton())

    expect(await screen.findByText('고맙습니다')).toBeInTheDocument()
    // 다시 보내는 칸이 남아 있으면 두 번 보낸 것으로 오해한다
    expect(screen.queryByLabelText('의견 내용')).not.toBeInTheDocument()
  })

  it('실패하면 알리고 적은 내용을 지우지 않는다 — 지우면 처음부터 다시 써야 한다', async () => {
    const user = userEvent.setup()
    sendMock.mockRejectedValue(new Error('끊김'))
    renderSheet()

    await user.type(screen.getByLabelText('의견 내용'), '분석이 느려요')
    await user.click(sendButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('의견을 보내지 못했어요')
    expect(screen.getByLabelText('의견 내용')).toHaveValue('분석이 느려요')
  })
})
