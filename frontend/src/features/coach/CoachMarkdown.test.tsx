import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CoachMarkdown } from './CoachMarkdown'

describe('CoachMarkdown', () => {
  it('**굵게**를 strong으로 렌더한다', () => {
    render(<CoachMarkdown text="오늘은 **단백질**에 집중해요" />)
    const strong = screen.getByText('단백질')
    expect(strong.tagName).toBe('STRONG')
  })

  it('불릿 목록을 ul/li로 렌더한다', () => {
    render(<CoachMarkdown text={'추천:\n- 닭가슴살\n- 현미밥'} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('닭가슴살').tagName).toBe('LI')
  })

  it('인라인 코드를 code로 렌더한다', () => {
    render(<CoachMarkdown text="목표는 `1800kcal` 예요" />)
    expect(screen.getByText('1800kcal').tagName).toBe('CODE')
  })
})
