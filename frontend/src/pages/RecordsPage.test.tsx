import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFoods } from '../api/food'
import type { Food } from '../api/food'
import { deleteMeal, getMeals, saveMeal, updateMeal } from '../api/meal'
import type { Meal } from '../api/meal'
import { MEAL_TYPE_LABELS, defaultMealType } from '../features/meal/mealDefaults'
import { RecordsPage } from './RecordsPage'

vi.mock('../api/meal', () => ({
  getMeals: vi.fn(),
  saveMeal: vi.fn(),
  updateMeal: vi.fn(),
  deleteMeal: vi.fn(),
}))
// 기록 카드·즐겨찾기 탭이 세트 API를 부른다 — 목킹하지 않으면 실제 fetch를 시도한다
vi.mock('../api/favoriteMeal', () => ({
  getFavoriteMeals: vi.fn(() => Promise.resolve([])),
  saveFavoriteMeal: vi.fn(),
  deleteFavoriteMeal: vi.fn(),
}))
vi.mock('../api/food', () => ({
  getFoods: vi.fn(),
  saveFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
}))

const getMealsMock = vi.mocked(getMeals)
const saveMealMock = vi.mocked(saveMeal)
const updateMealMock = vi.mocked(updateMeal)
const deleteMealMock = vi.mocked(deleteMeal)
const getFoodsMock = vi.mocked(getFoods)

const lunch: Meal = {
  id: 1,
  eatenAt: '2026-08-06T03:30:00Z', // 12:30 KST
  mealType: 'LUNCH',
  source: 'AI',
  totalKcal: 650,
  carbG: 75,
  proteinG: 30,
  fatG: 22,
  imageUrl: null,
  items: [
    { name: '김치찌개', kcal: 400, carbG: 30, proteinG: 20, fatG: 18, quantity: 1, unit: '인분' },
    { name: '공기밥', kcal: 250, carbG: 45, proteinG: 10, fatG: 4, quantity: null, unit: null },
  ],
}

const breakfast: Meal = {
  ...lunch,
  id: 2,
  mealType: 'BREAKFAST',
  totalKcal: 320,
  carbG: 34,
  proteinG: 22,
  fatG: 9,
  items: [{ name: '그릭요거트', kcal: 320, carbG: 34, proteinG: 22, fatG: 9, quantity: 1, unit: '컵' }],
}

const egg: Food = {
  id: 10,
  source: 'CATALOG',
  name: '삶은달걀',
  emoji: '🥚',
  aliases: ['계란'],
  quantity: 1,
  unit: '개',
  kcal: 70,
  carbG: 0.4,
  proteinG: 6.3,
  fatG: 4.8,
}

function renderPage(path = '/records') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <RecordsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getFoodsMock.mockResolvedValue([egg])
  saveMealMock.mockResolvedValue(lunch)
})

describe('RecordsPage — 끼니 세그먼트', () => {
  it('선택한 끼니의 기록만 보여주고 합계를 낸다', async () => {
    getMealsMock.mockResolvedValue([lunch, breakfast])
    renderPage()

    // 기본 선택 끼니가 무엇이든, 점심을 고르면 점심 기록만 보인다
    await user().click(await screen.findByRole('button', { name: /점심/ }))

    expect(screen.getByText('김치찌개 1인분 & 공기밥')).toBeInTheDocument()
    expect(screen.queryByText(/그릭요거트/)).not.toBeInTheDocument()
    expect(screen.getByText('점심 합계')).toBeInTheDocument()
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
  })

  it('세그먼트 배지에 끼니별 기록 수가 나온다', async () => {
    getMealsMock.mockResolvedValue([lunch, breakfast, { ...lunch, id: 3 }])
    renderPage()

    // 배지는 조회가 끝나야 붙으므로 이름에 숫자가 들어오는 것으로 기다린다
    const lunchTab = await screen.findByRole('button', { name: /점심\s*2/ })
    expect(within(lunchTab).getByText('2')).toBeInTheDocument()
  })

  it('그 끼니에 기록이 없으면 추가를 안내한다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/기록이 없어요/)).toBeInTheDocument()
  })

  it('섭취량이 있는 항목만 수량을 함께 보여준다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()
    await user().click(await screen.findByRole('button', { name: /점심/ }))

    // 김치찌개는 수량이 붙고, 수량 없는 공기밥은 이름만
    expect(screen.getByText('김치찌개 1인분 & 공기밥')).toBeInTheDocument()
  })
})

describe('RecordsPage — 담기', () => {
  it('자주먹는에서 담으면 선택된 끼니로 저장한다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    await user().click(await screen.findByRole('button', { name: /저녁/ }))
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(await screen.findByRole('button', { name: '저녁에 기록하기' }))

    await waitFor(() => expect(saveMealMock).toHaveBeenCalled())
    // TanStack Query가 mutationFn에 context를 함께 넘기므로 첫 인자만 본다
    expect(saveMealMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        mealType: 'DINNER',
        source: 'MANUAL',
        items: [expect.objectContaining({ name: '삶은달걀', kcal: 70, quantity: 1, unit: '개' })],
      }),
    )
  })

  it('수량을 늘리면 영양값이 비례해 저장된다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(screen.getByRole('button', { name: '수량 늘리기' }))
    await user().click(screen.getByRole('button', { name: '수량 늘리기' })) // 1 → 2 (0.5씩)

    expect(screen.getByText('140')).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: /에 기록하기/ }))

    await waitFor(() => expect(saveMealMock).toHaveBeenCalled())
    expect(saveMealMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ items: [expect.objectContaining({ kcal: 140, quantity: 2 })] }),
    )
  })

  it('검색 결과가 없으면 직접 추가를 제안한다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    await user().type(await screen.findByLabelText('음식 이름 검색'), '짜장라면')

    expect(await screen.findByRole('button', { name: "'짜장라면' 직접 추가하기" })).toBeInTheDocument()
  })

  it('별칭으로도 찾는다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    await user().type(await screen.findByLabelText('음식 이름 검색'), '계란')

    expect(await screen.findByRole('button', { name: '삶은달걀 담기' })).toBeInTheDocument()
  })
})

describe('RecordsPage — 저장 실패 복구', () => {
  it('저장이 실패하면 알리고 "다시 시도"를 준다', async () => {
    getMealsMock.mockResolvedValue([])
    saveMealMock.mockRejectedValue(new Error('network'))
    renderPage()

    await user().click(await screen.findByRole('button', { name: /저녁/ }))
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(await screen.findByRole('button', { name: '저녁에 기록하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/저장하지 못했어요/)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('다시 시도하면 같은 항목을 그대로 보낸다 — 처음부터 다시 입력하지 않아도 된다', async () => {
    getMealsMock.mockResolvedValue([])
    saveMealMock.mockRejectedValue(new Error('network'))
    renderPage()

    await user().click(await screen.findByRole('button', { name: /저녁/ }))
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(await screen.findByRole('button', { name: '저녁에 기록하기' }))
    await user().click(await screen.findByRole('button', { name: '다시 시도' }))

    await waitFor(() => expect(saveMealMock).toHaveBeenCalledTimes(2))
    expect(saveMealMock.mock.calls[1][0]).toEqual(saveMealMock.mock.calls[0][0])
  })
})

describe('RecordsPage — 기록 수정·삭제', () => {
  it('삭제 — 확인까지 해야 deleteMeal이 호출된다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    deleteMealMock.mockResolvedValue(undefined)
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await user().click(screen.getByRole('button', { name: /삭제$/ }))

    // 휴지통만 눌렀을 때는 아직 지우지 않는다
    expect(deleteMealMock).not.toHaveBeenCalled()

    await user().click(await screen.findByRole('button', { name: '삭제' }))

    expect(deleteMealMock).toHaveBeenCalledWith(1)
  })

  it('삭제 확인에서 취소하면 지우지 않는다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await user().click(screen.getByRole('button', { name: /삭제$/ }))
    await user().click(await screen.findByRole('button', { name: '취소' }))

    expect(deleteMealMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('삭제가 실패하면 확인 시트에 알리고 기록을 남겨둔다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    deleteMealMock.mockRejectedValue(new Error('network'))
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await user().click(screen.getByRole('button', { name: /삭제$/ }))
    await user().click(await screen.findByRole('button', { name: '삭제' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/지우지 못했어요/)
  })

  it('수정 — 항목 값을 바꿔 items로 updateMeal 호출', async () => {
    getMealsMock.mockResolvedValue([lunch])
    updateMealMock.mockResolvedValue({ ...lunch, totalKcal: 750 })
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await user().click(screen.getByRole('button', { name: /수정$/ }))
    const kcalField = screen.getAllByLabelText('칼로리 (kcal)')[0]
    await user().clear(kcalField)
    await user().type(kcalField, '500')
    await user().click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(updateMealMock).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ name: '김치찌개', kcal: 500 })]),
        }),
      ),
    )
  })

  it('수정 중 범위 밖 값은 저장하지 않는다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await user().click(screen.getByRole('button', { name: /수정$/ }))
    const kcalField = screen.getAllByLabelText('칼로리 (kcal)')[0]
    await user().clear(kcalField)
    await user().type(kcalField, '99999')
    await user().click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('0~10000 정수여야 합니다')).toBeInTheDocument()
    expect(updateMealMock).not.toHaveBeenCalled()
  })
})

describe('RecordsPage — FAB 진입', () => {
  it('?camera=1이면 AI 탭이 열려 있다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records?camera=1')

    // 세그먼트는 tabs가 아니라 눌림 상태를 가진 버튼이다(design D3)
    expect(await screen.findByRole('button', { name: 'AI 입력', pressed: true })).toBeInTheDocument()
    expect(screen.getByLabelText(/무엇을 드셨나요/)).toBeInTheDocument()
  })

  it('홈 카드가 실어 보낸 끼니를 그대로 쓴다 — 여기서 다시 시각을 보면 카드와 갈린다', async () => {
    getMealsMock.mockResolvedValue([])
    // 홈이 "저녁 촬영 및 기록"이라 적어놓고 15:01에 눌러도 도착 화면은 저녁이어야 한다
    renderPage('/records?camera=1&meal=DINNER')

    expect(await screen.findByRole('button', { name: /저녁/, pressed: true })).toBeInTheDocument()
  })

  it('모르는 끼니 값은 무시하고 시각으로 정한다 — 주소창은 아무 값이나 담을 수 있다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records?meal=BRUNCH')

    const expected = MEAL_TYPE_LABELS[defaultMealType(new Date())]
    expect(await screen.findByRole('button', { name: new RegExp(expected), pressed: true })).toBeInTheDocument()
  })

  it('끼니 없이 들어오면 시각으로 정한다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records')

    const expected = MEAL_TYPE_LABELS[defaultMealType(new Date())]
    expect(await screen.findByRole('button', { name: new RegExp(expected), pressed: true })).toBeInTheDocument()
  })
})

function user() {
  return userEvent.setup()
}
