import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeOnboarding, getKcalSuggestion } from '../api/member'
import { makeMember, renderWithAuth } from '../test/utils'
import { OnboardingPage } from './OnboardingPage'

vi.mock('../api/member', () => ({
  getKcalSuggestion: vi.fn(),
  completeOnboarding: vi.fn(),
}))

const getKcalSuggestionMock = vi.mocked(getKcalSuggestion)
const completeOnboardingMock = vi.mocked(completeOnboarding)

const SUGGESTION = {
  maintenanceKcal: 2430,
  dailyKcalTarget: 1930,
  carbTargetG: 241,
  proteinTargetG: 145,
  fatTargetG: 43,
}

function renderOnboarding() {
  return renderWithAuth(<Route path="/onboarding" element={<OnboardingPage />} />, {
    state: { status: 'authed', member: makeMember({ onboardingCompleted: false }) },
    path: '/onboarding',
  })
}

const next = () => screen.getByRole('button', { name: '다음' })

/** 1~3단계를 기본값으로 통과해 목표 선택(4단계)까지 간다 */
async function goToGoalStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /남성/ }))
  await user.click(next())
  await user.click(next()) // 키·몸무게·나이는 기본값 사용
  await user.click(screen.getByRole('button', { name: /보통/ }))
  await user.click(next())
}

beforeEach(() => {
  vi.clearAllMocks()
  getKcalSuggestionMock.mockResolvedValue(SUGGESTION)
  completeOnboardingMock.mockResolvedValue(makeMember({ onboardingCompleted: true }))
})

describe('OnboardingPage 위저드', () => {
  it('성별을 고르기 전에는 다음으로 넘어갈 수 없다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    expect(screen.getByText('성별을 알려주세요')).toBeInTheDocument()
    expect(next()).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /남성/ }))
    expect(next()).toBeEnabled()
  })

  it('단계를 넘기면 진행 표시가 갱신되고 뒤로 가서 수정할 수 있다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(screen.getByRole('button', { name: /남성/ }))
    await user.click(next())
    expect(screen.getByText('키와 몸무게, 나이')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')

    await user.click(screen.getByRole('button', { name: '이전 단계' }))
    expect(screen.getByText('성별을 알려주세요')).toBeInTheDocument()
  })

  it('범위 밖 키를 넣으면 오류를 보여주고 제안을 조회하지 않는다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(screen.getByRole('button', { name: /남성/ }))
    await user.click(next())
    await user.clear(screen.getByLabelText('키'))
    await user.type(screen.getByLabelText('키'), '90') // 범위 밖
    await user.click(next())
    await user.click(screen.getByRole('button', { name: /보통/ }))
    await user.click(next())
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    await user.click(next())

    expect(getKcalSuggestionMock).not.toHaveBeenCalled()
  })

  it('목표 체중 없이 방향만으로 제안을 받아 완료 화면을 보여준다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    await user.click(next())

    await waitFor(() =>
      expect(getKcalSuggestionMock).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'MALE', activityLevel: 'MID', goal: 'MAINTAIN' }),
      ),
    )
    // 목표 체중은 보내지 않는다
    expect(getKcalSuggestionMock.mock.calls[0][0]).not.toHaveProperty('targetWeightKg')

    expect(await screen.findByText('2,430')).toBeInTheDocument() // 유지칼로리
    expect(screen.getByText('241g')).toBeInTheDocument() // 탄수 목표
    expect(screen.getByRole('button', { name: '홈으로 시작하기' })).toBeInTheDocument()
  })

  it('감량을 고르면 목표 체중(선택) 입력이 나타나고, 넣으면 제출에 포함된다', async () => {
    const user = userEvent.setup()
    const { reloadMember } = renderOnboarding()

    await goToGoalStep(user)
    expect(screen.queryByLabelText(/목표 체중/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /체중 감량/ }))
    await user.type(screen.getByLabelText(/목표 체중/), '65')
    await user.click(next())

    await screen.findByRole('button', { name: '홈으로 시작하기' })
    await user.click(screen.getByRole('button', { name: '홈으로 시작하기' }))

    await waitFor(() =>
      expect(completeOnboardingMock).toHaveBeenCalledWith(
        expect.objectContaining({ goal: 'CUT', targetWeightKg: 65, dailyKcalTarget: 1930 }),
      ),
    )
    await waitFor(() => expect(reloadMember).toHaveBeenCalled())
  })

  it('목표 섭취량을 수정해 제출하면 수정값이 저장된다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    await user.click(next())

    const kcal = await screen.findByLabelText(/목표 섭취량/)
    await user.clear(kcal)
    await user.type(kcal, '2000')
    await user.click(screen.getByRole('button', { name: '홈으로 시작하기' }))

    await waitFor(() =>
      expect(completeOnboardingMock).toHaveBeenCalledWith(
        expect.objectContaining({ dailyKcalTarget: 2000 }),
      ),
    )
  })
})
