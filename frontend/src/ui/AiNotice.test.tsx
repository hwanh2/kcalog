import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AiLabel, AiNotice } from './AiNotice'

describe('생성형 AI 고지', () => {
  it('웹 빌드에서도 고지 문장과 결과 표시를 그린다', () => {
    render(
      <>
        <AiNotice>AI가 추정해요</AiNotice>
        <AiLabel />
      </>,
    )

    expect(screen.getByText('AI가 추정해요')).toBeInTheDocument()
    expect(screen.getByText('AI 추정')).toBeInTheDocument()
  })
})
