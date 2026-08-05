import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { completeOnboarding, getKcalSuggestion } from '../api/member'
import { makeMember, renderWithAuth } from '../test/utils'
import { OnboardingPage } from './OnboardingPage'

vi.mock('../api/member', () => ({
  getKcalSuggestion: vi.fn(),
  completeOnboarding: vi.fn(),
}))

const getKcalSuggestionMock = vi.mocked(getKcalSuggestion)
const completeOnboardingMock = vi.mocked(completeOnboarding)

function renderOnboarding() {
  return renderWithAuth(<Route path="/onboarding" element={<OnboardingPage />} />, {
    state: { status: 'authed', member: makeMember({ onboardingCompleted: false }) },
    path: '/onboarding',
  })
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('성별'), 'MALE')
  await user.type(screen.getByLabelText('출생연도'), '1990')
  await user.type(screen.getByLabelText('키 (cm)'), '175')
  await user.type(screen.getByLabelText('현재 체중 (kg)'), '70')
  await user.type(screen.getByLabelText('목표 체중 (kg)'), '65')
  await user.selectOptions(screen.getByLabelText('활동량'), 'MID')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OnboardingPage', () => {
  it('유효 범위 밖 입력이면 항목별 오류를 보여주고 제안을 조회하지 않는다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.selectOptions(screen.getByLabelText('성별'), 'MALE')
    await user.type(screen.getByLabelText('출생연도'), '1990')
    await user.type(screen.getByLabelText('키 (cm)'), '90') // 범위 밖
    await user.type(screen.getByLabelText('현재 체중 (kg)'), '70')
    await user.type(screen.getByLabelText('목표 체중 (kg)'), '65')
    await user.selectOptions(screen.getByLabelText('활동량'), 'MID')
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByText('키는 100~230cm 범위여야 합니다')).toBeInTheDocument()
    expect(getKcalSuggestionMock).not.toHaveBeenCalled()
  })

  it('정상 입력 후 다음 — 제안 칼로리를 조회해 표시하고 입력값으로 채운다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockResolvedValue({ dailyKcalTarget: 1930 })
    renderOnboarding()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('1930 kcal')).toBeInTheDocument()
    expect(screen.getByLabelText('일일 칼로리 목표')).toHaveValue('1930')
    expect(getKcalSuggestionMock).toHaveBeenCalledWith({
      gender: 'MALE',
      birthYear: 1990,
      heightCm: 175,
      weightKg: 70,
      targetWeightKg: 65,
      activityLevel: 'MID',
    })
  })

  it('제안값을 수정해 제출하면 수정한 값으로 저장하고 회원 상태를 갱신한다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockResolvedValue({ dailyKcalTarget: 1930 })
    completeOnboardingMock.mockResolvedValue(makeMember({ onboardingCompleted: true }))
    const { reloadMember } = renderOnboarding()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: '다음' }))
    const kcalField = await screen.findByLabelText('일일 칼로리 목표')
    await user.clear(kcalField)
    await user.type(kcalField, '2000')
    await user.click(screen.getByRole('button', { name: '시작하기' }))

    expect(completeOnboardingMock).toHaveBeenCalledWith(
      expect.objectContaining({ dailyKcalTarget: 2000 }),
    )
    expect(reloadMember).toHaveBeenCalled()
  })

  it('서버 검증 400이면 항목별 오류를 표시하고 입력 스텝으로 돌아간다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockResolvedValue({ dailyKcalTarget: 1930 })
    completeOnboardingMock.mockRejectedValue(
      new ApiError(400, { errors: { weightKg: '체중은 30~250 범위여야 합니다' } }),
    )
    renderOnboarding()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(await screen.findByRole('button', { name: '시작하기' }))

    expect(await screen.findByText('체중은 30~250 범위여야 합니다')).toBeInTheDocument()
    expect(screen.getByLabelText('키 (cm)')).toBeInTheDocument() // 입력 스텝 복귀
  })
})
