import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PhotoPicker } from './PhotoPicker'

const pickPhoto = vi.fn()
const requestPhotoPermission = vi.fn()

vi.mock('../../platform', () => ({
  IS_TOSS: true,
  loadToss: () => Promise.resolve({ pickPhoto, requestPhotoPermission }),
}))

beforeEach(() => {
  pickPhoto.mockReset()
  requestPhotoPermission.mockReset()
})

function renderPicker(props: { autoCamera?: boolean } = {}) {
  const onPick = vi.fn()
  render(<PhotoPicker photoUrl={null} onPick={onPick} onClear={vi.fn()} {...props} />)
  return { onPick }
}

describe('PhotoPicker (토스 빌드)', () => {
  it('촬영한 사진을 jpeg 파일로 넘긴다', async () => {
    pickPhoto.mockResolvedValueOnce({ status: 'picked', image: new Blob(['x'], { type: 'image/jpeg' }) })
    const { onPick } = renderPicker()

    await userEvent.click(screen.getByRole('button', { name: '촬영' }))

    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1))
    expect(pickPhoto).toHaveBeenCalledWith('camera')
    const file = onPick.mock.calls[0][0] as File
    expect(file.type).toBe('image/jpeg')
  })

  it('앨범 버튼은 앨범을 연다', async () => {
    pickPhoto.mockResolvedValueOnce({ status: 'cancelled' })
    const { onPick } = renderPicker()

    await userEvent.click(screen.getByRole('button', { name: '앨범' }))

    await waitFor(() => expect(pickPhoto).toHaveBeenCalledWith('album'))
    expect(onPick).not.toHaveBeenCalled()
  })

  it('권한을 거부하면 안내와 다시 요청하는 버튼을 보여 준다', async () => {
    pickPhoto
      .mockResolvedValueOnce({ status: 'denied' })
      .mockResolvedValueOnce({ status: 'picked', image: new Blob(['x']) })
    requestPhotoPermission.mockResolvedValueOnce(true)
    const { onPick } = renderPicker()

    await userEvent.click(screen.getByRole('button', { name: '촬영' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('카메라 권한이 필요해요')

    await userEvent.click(screen.getByRole('button', { name: '권한 허용하기' }))

    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1))
    expect(requestPhotoPermission).toHaveBeenCalledWith('camera')
  })

  it('홈 촬영 카드로 들어오면 카메라를 한 번만 연다', async () => {
    pickPhoto.mockResolvedValue({ status: 'cancelled' })
    renderPicker({ autoCamera: true })

    await waitFor(() => expect(pickPhoto).toHaveBeenCalledTimes(1))
    expect(pickPhoto).toHaveBeenCalledWith('camera')
  })
})
