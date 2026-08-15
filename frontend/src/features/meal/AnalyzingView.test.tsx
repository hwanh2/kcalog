import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnalyzingView } from './AnalyzingView'
import { PHOTO_PREVIEW_CLASS } from './photoPreview'

describe('AnalyzingView', () => {
  it('사진을 입력 단계와 같은 크기로 그린다 — 넘어가면서 작아지면 다른 사진처럼 보인다', () => {
    render(<AnalyzingView photoUrl="blob:photo" />)

    // 같은 상수를 쓰므로 한쪽만 바뀌는 일이 없다. 예전에는 여기만 w-52 + object-cover였다.
    const img = screen.getByRole('img', { name: '분석 중인 사진' })
    for (const cls of PHOTO_PREVIEW_CLASS.split(' ')) expect(img).toHaveClass(cls)
  })

  it('사진이 없으면(설명만) 스캔할 대상이 없어 사진을 그리지 않는다', () => {
    render(<AnalyzingView photoUrl={null} />)

    expect(screen.queryByRole('img', { name: '분석 중인 사진' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('설명을 읽고 있어요')
  })

  it('무엇을 기다리는지 알린다', () => {
    render(<AnalyzingView photoUrl="blob:photo" />)

    expect(screen.getByRole('status')).toHaveTextContent('사진 속 음식을 찾고 있어요')
  })
})
