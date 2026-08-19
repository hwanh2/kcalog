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

/*
  플랜 만들기는 실제로 6초를 쓴다(단계마다 2초). 그 시간을 그대로 기다리면 결과 화면까지 가는
  테스트마다 6초씩 붙는다 — **시간만** 줄이고 화면은 진짜를 그린다.
  최소 시간을 실제로 채우는지는 실기기 확인 몫이다(tasks 6.4).
*/
vi.mock('../features/onboarding/PlanBuilding', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/onboarding/PlanBuilding')>()),
  PLAN_BUILD_MS: 20,
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

/**
 * 5단계 결과를 기다린다 — 플랜을 만드는 화면이 최소 BUILD_MS(2초)를 채운 뒤에야 결과가 나온다.
 * findBy 기본 타임아웃(1초)으로는 못 기다리므로 여기서 한 번만 늘려 둔다.
 *
 * '시작하기' 버튼으로 기다리면 안 된다 — 그 버튼은 만드는 중에도 셸에 이미 떠 있어서
 * 기다림이 즉시 통과해 버린다. 결과에만 있는 것을 본다.
 */
const findResult = () => screen.findByText('탄단지 목표', {}, { timeout: 4000 })

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

  /*
    시작값은 조절 횟수를 줄이려는 것이다 — 여성을 고른 사람에게 남성 평균을 보여주면
    두 칸 모두 크게 움직여야 한다. 성별 선택이 실제로 시작값을 갈아끼우는지 본다.
  */
  it('성별에 따라 키·몸무게 시작값이 달라진다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(screen.getByRole('button', { name: /여성/ }))
    await user.click(next())

    expect(screen.getByLabelText('키')).toHaveValue('162')
    expect(screen.getByLabelText('몸무게')).toHaveValue('58')
    expect(screen.getByLabelText('나이')).toHaveValue('25')
  })

  it('고친 값은 성별을 바꿔도 지켜진다 — 되돌아가 성별만 고친 경우', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(screen.getByRole('button', { name: /남성/ }))
    await user.click(next())
    await user.clear(screen.getByLabelText('키'))
    await user.type(screen.getByLabelText('키'), '180')

    // 1단계로 돌아가 성별만 바꾼다
    await user.click(screen.getByRole('button', { name: '이전 단계' }))
    await user.click(screen.getByRole('button', { name: /여성/ }))
    await user.click(next())

    expect(screen.getByLabelText('키')).toHaveValue('180')
  })

  /*
    방향과 목표 체중이 어긋나도 막지 않는다 — 지금 체중을 잘못 넣었는지, 정말 그러려는 것인지
    우리가 알 수 없다. 다만 넘어가기 전에 한 번은 보여준다.
  */
  it('감량인데 목표가 더 무거우면 알려주되 막지는 않는다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user) // 남성 기본 75kg
    await user.click(screen.getByRole('button', { name: /체중 감량/ }))
    await user.type(screen.getByLabelText(/목표 체중/), '80')

    expect(screen.getByRole('status')).toHaveTextContent('감량인데 목표가 더 무거워요')
    expect(screen.getByRole('status')).toHaveTextContent('75kg')
    expect(next()).toBeEnabled()
  })

  it('증량인데 목표가 더 가벼우면 알려준다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 증량/ }))
    await user.type(screen.getByLabelText(/목표 체중/), '70')

    expect(screen.getByRole('status')).toHaveTextContent('증량인데 목표가 더 가벼워요')
  })

  it('방향과 목표가 맞으면 아무 안내도 뜨지 않는다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 감량/ }))
    await user.type(screen.getByLabelText(/목표 체중/), '68')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('범위 밖 키는 그 자리(2단계)에서 오류를 보여주고 다음 단계로 넘기지 않는다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(screen.getByRole('button', { name: /남성/ }))
    await user.click(next())
    await user.clear(screen.getByLabelText('키'))
    await user.type(screen.getByLabelText('키'), '90') // 범위 밖
    await user.click(next())

    // 값이 보이는 화면에서 바로 알려주고, 단계는 그대로 머문다
    expect(screen.getByText('키는 100~230cm 범위여야 합니다')).toBeInTheDocument()
    expect(screen.getByText('키와 몸무게, 나이')).toBeInTheDocument()
    expect(getKcalSuggestionMock).not.toHaveBeenCalled()

    // 고치면 진행된다
    await user.clear(screen.getByLabelText('키'))
    await user.type(screen.getByLabelText('키'), '175')
    await user.click(next())
    expect(screen.getByText('평소 활동량은 어느 정도인가요?')).toBeInTheDocument()
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

    await findResult()
    expect(screen.getByText('2,430')).toBeInTheDocument() // 유지칼로리
    expect(screen.getByText('241g')).toBeInTheDocument() // 탄수 목표
  })

  it('감량을 고르면 목표 체중(선택) 입력이 나타나고, 넣으면 제출에 포함된다', async () => {
    const user = userEvent.setup()
    const { reloadMember } = renderOnboarding()

    await goToGoalStep(user)
    expect(screen.queryByLabelText(/목표 체중/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /체중 감량/ }))
    await user.type(screen.getByLabelText(/목표 체중/), '65')
    await user.click(next())

    await findResult()
    await user.click(screen.getByRole('button', { name: '시작하기' }))

    await waitFor(() =>
      expect(completeOnboardingMock).toHaveBeenCalledWith(
        expect.objectContaining({ goal: 'CUT', targetWeightKg: 65, dailyKcalTarget: 1930 }),
      ),
    )
    await waitFor(() => expect(reloadMember).toHaveBeenCalled())
  })

  /*
    근육량 목표는 탄단지 비율을 가르는 유일한 신호다(design D3). 화면에서 켜도 요청에 실리지
    않으면 아무 일도 일어나지 않고, 그 사실이 화면에 드러나지 않는다 — 제안·제출 양쪽을 본다.
  */
  it('근육량 목표를 켜면 제안 계산과 제출에 함께 실린다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    // 토글은 목표 단계에 있다 — 방향을 고른 바로 아래
    await user.click(screen.getByLabelText(/근육량도 목표인가요/))
    await user.click(next())

    await waitFor(() =>
      expect(getKcalSuggestionMock).toHaveBeenCalledWith(
        expect.objectContaining({ muscleGoal: true }),
      ),
    )

    await findResult()
    await user.click(screen.getByRole('button', { name: '시작하기' }))
    await waitFor(() =>
      expect(completeOnboardingMock).toHaveBeenCalledWith(
        expect.objectContaining({ muscleGoal: true }),
      ),
    )
  })

  it('근육량 목표를 켜지 않으면 false로 보낸다 — 기본은 낮은 쪽이다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    await user.click(next())

    await waitFor(() =>
      expect(getKcalSuggestionMock).toHaveBeenCalledWith(
        expect.objectContaining({ muscleGoal: false }),
      ),
    )
  })

  /*
    결과 화면은 숫자를 처음 보는 자리다. 근거가 없으면 "앱이 정해준 값"으로 읽히고,
    그러면 고칠 생각도 못 한다 — 목표가 어디서 나왔는지와 단백질 기준을 함께 보여준다.
    g/kg는 실제 값(150g / 75kg)에서 되짚어 계산하므로 상·하한에 잘려도 화면과 어긋나지 않는다.
  */
  /*
    계산은 순식간이라 결과가 즉시 튀어나온다 — 그러면 방금 답한 것들이 쓰였는지 알 수 없다.
    무엇을 계산 중인지 보여주는 화면을 거치고, 그동안 '시작하기'는 눌리지 않아야 한다.
  */
  /*
    카드 안 한 줄은 "무엇"만 말한다 — "왜"가 없으면 목표를 스스로 조절할 생각을 못 한다.
    숫자가 들어간 설명이라 값이 틀어지면 틀린 것을 가르치게 되므로 문구째로 확인한다.
  */
  it('결과 화면이 왜 이 플랜인지까지 설명한다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 감량/ }))
    await user.click(next())
    await findResult()

    // 이 앱에서 가장 중요한 한 가지 — 매일 기록해야 추정값이 내 몸의 값으로 바뀐다
    expect(screen.getByText('매일 기록해야 정확해져요')).toBeInTheDocument()
    expect(screen.getByText(/실제로 먹은 양과 체중 변화/)).toBeInTheDocument()

    expect(screen.getByText(/200~300kcal만 더 빼면/)).toBeInTheDocument()
    // 탄수 4kcal/g · 지방 9kcal/g → 20g과 9g이 맞바꿔진다
    expect(screen.getByText(/탄수화물 20g을 덜고 지방 9g을 더하면/)).toBeInTheDocument()
    expect(screen.getByText(/체중에 맞춰 먼저/)).toBeInTheDocument()
  })

  it('결과 전에 플랜을 만드는 화면을 거친다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    await user.click(next())

    expect(screen.getByRole('status')).toHaveTextContent('계산하고 있어요')
    expect(screen.queryByText('탄단지 목표')).not.toBeInTheDocument()
    // 지금 손댈 수 있는 것이 없으므로 위저드 껍데기(단계·뒤로가기·진행 막대·CTA)를 벗는다
    expect(screen.queryByRole('button', { name: '시작하기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '이전 단계' })).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText('STEP 5')).not.toBeInTheDocument()

    await findResult()
    expect(screen.getByRole('button', { name: '시작하기' })).toBeEnabled()
  })

  it('계산에 실패하면 값이 보이는 4단계로 되돌린다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockRejectedValue(new Error('boom'))
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    await user.click(next())

    // 빈 5단계에 남겨두면 할 수 있는 것이 없다
    expect(await screen.findByText(/계산에 실패했어요/, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('목표를 선택해주세요')).toBeInTheDocument()
  })

  it('결과 화면이 목표와 탄단지의 근거를 함께 보여준다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockResolvedValue({ ...SUGGESTION, proteinTargetG: 150 })
    renderOnboarding()

    await goToGoalStep(user) // 남성 기본 75kg
    await user.click(screen.getByRole('button', { name: /체중 감량/ }))
    await user.click(next())
    await findResult()

    expect(screen.getByText(/500kcal 적게/)).toBeInTheDocument()
    // 150g / 75kg = 2.0
    expect(screen.getByText(/체중 1kg당 2.0g/)).toBeInTheDocument()
  })



  it('목표 섭취량을 수정해 제출하면 수정값이 저장된다', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await goToGoalStep(user)
    await user.click(screen.getByRole('button', { name: /체중 유지/ }))
    await user.click(next())

    await findResult()
    const kcal = screen.getByLabelText(/목표 섭취량/)
    await user.clear(kcal)
    await user.type(kcal, '2000')
    await user.click(screen.getByRole('button', { name: '시작하기' }))

    await waitFor(() =>
      expect(completeOnboardingMock).toHaveBeenCalledWith(
        expect.objectContaining({ dailyKcalTarget: 2000 }),
      ),
    )
  })
})
