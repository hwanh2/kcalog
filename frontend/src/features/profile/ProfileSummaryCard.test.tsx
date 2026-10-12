import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeMember } from '../../test/utils'
import { ProfileSummaryCard } from './ProfileSummaryCard'

describe('ProfileSummaryCard', () => {
  it('이름이 없는 회원(토스)은 "오늘식단 회원"으로 보여 준다', () => {
    render(<ProfileSummaryCard member={makeMember({ nickname: null })} streakDays={null} />)

    expect(screen.getByText('오늘식단 회원')).toBeInTheDocument()
  })
})
