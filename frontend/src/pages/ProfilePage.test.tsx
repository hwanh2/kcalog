import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getKcalSuggestion, updateMember } from '../api/member'
import type { MemberResponse } from '../api/member'
import { makeMember, renderWithAuth } from '../test/utils'
import { ProfilePage } from './ProfilePage'

vi.mock('../api/member', () => ({
  getKcalSuggestion: vi.fn(),
  updateMember: vi.fn(),
}))

const getKcalSuggestionMock = vi.mocked(getKcalSuggestion)
const updateMemberMock = vi.mocked(updateMember)

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
  return renderWithAuth(<Route path="/profile" element={<ProfilePage />} />, {
    state: { status: 'authed', member },
    path: '/profile',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfilePage', () => {
  it('저장된 프로필·목표·최신 체중을 표시한다', () => {
    renderProfile()

    expect(screen.getByText('테스터')).toBeInTheDocument()
    expect(screen.getByText('최신 체중: 70 kg')).toBeInTheDocument()
    expect(screen.getByLabelText('키 (cm)')).toHaveValue('175')
    expect(screen.getByLabelText('목표 체중 (kg, 선택)')).toHaveValue('65')
    expect(screen.getByLabelText('일일 칼로리 목표')).toHaveValue('1930')
    expect(getKcalSuggestionMock).not.toHaveBeenCalled() // 변경 전엔 재계산 없음
  })

  it('활동량을 바꾸면 새 제안 칼로리를 조회해 보여주고, 적용 버튼으로 목표에 반영한다', async () => {
    const user = userEvent.setup()
    getKcalSuggestionMock.mockResolvedValue({ maintenanceKcal: 2400, carbTargetG: 220, proteinTargetG: 130, fatTargetG: 40, dailyKcalTarget: 2250 })
    renderProfile()

    await user.selectOptions(screen.getByLabelText('활동량'), 'HIGH')

    expect(await screen.findByText('2250 kcal')).toBeInTheDocument()
    expect(getKcalSuggestionMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityLevel: 'HIGH', weightKg: 70 }),
    )

    await user.click(screen.getByRole('button', { name: '제안 적용' }))
    expect(screen.getByLabelText('일일 칼로리 목표')).toHaveValue('2250')
  })

  it('변경된 필드만 담아 저장하고 회원 상태를 갱신한다', async () => {
    const user = userEvent.setup()
    updateMemberMock.mockResolvedValue(savedMember)
    const { reloadMember } = renderProfile()

    const kcalField = screen.getByLabelText('일일 칼로리 목표')
    await user.clear(kcalField)
    await user.type(kcalField, '2200')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMemberMock).toHaveBeenCalledWith({ dailyKcalTarget: 2200 }) // 변경분만
    expect(reloadMember).toHaveBeenCalled()
    expect(await screen.findByText('저장했습니다.')).toBeInTheDocument()
  })

  it('유효 범위 밖 목표는 저장하지 않고 오류를 표시한다', async () => {
    const user = userEvent.setup()
    renderProfile()

    const kcalField = screen.getByLabelText('일일 칼로리 목표')
    await user.clear(kcalField)
    await user.type(kcalField, '100')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('일일 칼로리 목표는 800~10000 범위여야 합니다')).toBeInTheDocument()
    expect(updateMemberMock).not.toHaveBeenCalled()
  })

  it('로그아웃 버튼은 auth의 로그아웃 처리를 호출한다', async () => {
    const user = userEvent.setup()
    const { signOut } = renderProfile()

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(signOut).toHaveBeenCalled()
  })
})
