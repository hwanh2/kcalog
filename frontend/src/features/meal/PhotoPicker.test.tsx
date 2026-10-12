import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhotoPicker } from './PhotoPicker'

afterEach(() => {
  vi.restoreAllMocks()
})

/** 어느 입력이 열렸는지만 본다. jsdom은 파일 대화상자를 띄우지 않는다 */
function spyInputClicks() {
  const clicked: string[] = []
  vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
    clicked.push(this.getAttribute('capture') ?? 'none')
  })
  return clicked
}

describe('PhotoPicker (웹 빌드)', () => {
  it('촬영 버튼은 카메라가 바로 열리는 입력을, 앨범 버튼은 사진첩 입력을 연다', async () => {
    const clicked = spyInputClicks()
    render(<PhotoPicker photoUrl={null} onPick={vi.fn()} onClear={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '촬영' }))
    await userEvent.click(screen.getByRole('button', { name: '앨범' }))

    expect(clicked).toEqual(['environment', 'none'])
  })

  it('고른 파일을 그대로 넘긴다', async () => {
    const onPick = vi.fn()
    render(<PhotoPicker photoUrl={null} onPick={onPick} onClear={vi.fn()} />)
    const file = new File(['fake'], 'meal.jpg', { type: 'image/jpeg' })

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)

    expect(onPick).toHaveBeenCalledWith(file)
  })
})
