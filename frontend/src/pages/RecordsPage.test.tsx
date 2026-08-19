import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFoods } from '../api/food'
import type { Food } from '../api/food'
import { deleteMeal, getMeals, saveMeal, updateMeal } from '../api/meal'
import type { Meal } from '../api/meal'
import { MEAL_TYPE_LABELS, defaultMealType } from '../features/meal/mealDefaults'
import { addDays, todayServiceDate } from '../lib/date'
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

  it('그 끼니에 기록이 없으면 그림과 함께 안내한다 — 한 줄이 큰 카드에 떠 있으면 알약처럼 보인다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/기록이 없어요/)).toBeInTheDocument()
    expect(screen.getByText(/아래에서 사진으로 찍거나/)).toBeInTheDocument()
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
    await openCatalog()
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(await screen.findByRole('button', { name: '기록하기' }))

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

    await openCatalog()
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(screen.getByRole('button', { name: '수량 늘리기' }))
    await user().click(screen.getByRole('button', { name: '수량 늘리기' })) // 1 → 2 (0.5씩)

    expect(screen.getByText('140')).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: '기록하기' }))

    await waitFor(() => expect(saveMealMock).toHaveBeenCalled())
    expect(saveMealMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ items: [expect.objectContaining({ kcal: 140, quantity: 2 })] }),
    )
  })

  it('검색 결과가 없으면 직접 추가를 제안한다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    await openCatalog()
    await user().type(await screen.findByLabelText('음식 이름 검색'), '짜장라면')

    expect(await screen.findByRole('button', { name: "'짜장라면' 직접 추가하기" })).toBeInTheDocument()
  })

  it('별칭으로도 찾는다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()

    await openCatalog()
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
    await openCatalog()
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(await screen.findByRole('button', { name: '기록하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/저장하지 못했어요/)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('다시 시도하면 같은 항목을 그대로 보낸다 — 처음부터 다시 입력하지 않아도 된다', async () => {
    getMealsMock.mockResolvedValue([])
    saveMealMock.mockRejectedValue(new Error('network'))
    renderPage()

    await user().click(await screen.findByRole('button', { name: /저녁/ }))
    await openCatalog()
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(await screen.findByRole('button', { name: '기록하기' }))
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

describe('RecordsPage — 날짜', () => {
  it('기본은 오늘 — 그날 기록을 부른다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records')

    await waitFor(() => expect(getMealsMock).toHaveBeenCalledWith(todayServiceDate()))
  })

  it('?date=로 들어오면 그 날짜를 본다 — 홈에서 날짜를 옮기고 넘어온 경우', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records?date=2026-08-06')

    await waitFor(() => expect(getMealsMock).toHaveBeenCalledWith('2026-08-06'))
    expect(screen.getByLabelText('날짜 선택')).toHaveValue('2026-08-06')
  })

  it('미래 날짜는 무시하고 오늘을 본다 — 아직 먹지 않은 날에 담을 이유가 없다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage(`/records?date=${addDays(todayServiceDate(), 3)}`)

    await waitFor(() => expect(getMealsMock).toHaveBeenCalledWith(todayServiceDate()))
  })

  it('형식이 아닌 값도 무시한다 — 주소창은 아무 값이나 담을 수 있다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records?date=어제')

    await waitFor(() => expect(getMealsMock).toHaveBeenCalledWith(todayServiceDate()))
  })

  it('주간 띠에서 다른 날을 누르면 그 날짜를 본다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records?date=2026-08-06') // 목요일

    await screen.findByLabelText('날짜 선택')
    await user().click(screen.getByRole('button', { name: '8월 4일 화요일' })) // 같은 주 화요일

    await waitFor(() => expect(getMealsMock).toHaveBeenCalledWith('2026-08-04'))
  })

  /*
    화면을 포그라운드에 열어둔 채 05시를 넘긴 경우. `today`는 마운트와 visibilitychange에서만
    갱신되므로 그때 낡는데, 낡은 날짜로 담으면 `eatenAtFor`가 과거 분기를 타 **전날 정오**로
    저장된다. 05시 경계가 존재하는 이유인 야식 사용자가 정확히 이 경우다(PR #42 리뷰).
  */
  it('열어둔 채 05시를 넘겨 담아도 새 서비스일의 지금 시각으로 기록한다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      // KST 8/16 04:59 → 서비스일은 아직 8/15
      vi.setSystemTime(new Date('2026-08-15T19:59:00Z'))
      const typer = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      getMealsMock.mockResolvedValue([])
      renderPage('/records')

      // 화면을 그대로 둔 채 경계를 넘긴다 — visibilitychange는 일어나지 않는다
      vi.setSystemTime(new Date('2026-08-15T20:01:00Z')) // KST 8/16 05:01 → 서비스일 8/16

      await openCatalog(typer)
      await typer.click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
      await typer.click(screen.getByRole('button', { name: '기록하기' }))

      await waitFor(() => expect(saveMealMock).toHaveBeenCalled())
      const saved = saveMealMock.mock.calls[0][0].eatenAt
      // 회귀했을 때 저장되던 값 — 전날 정오
      expect(saved).not.toBe(new Date('2026-08-15T12:00:00+09:00').toISOString())
      // 새 서비스일(8/16)에 들어가야 한다. ±ms는 타이머가 흘러 정확히 못 박는다
      expect(todayServiceDate(new Date(saved))).toBe('2026-08-16')
    } finally {
      vi.useRealTimers()
    }
  })

  it('지난 날짜에 담으면 그 날의 정오로 기록한다 — 지금 시각을 쓰면 오늘로 들어간다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage('/records?date=2026-08-06')

    await openCatalog()
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(screen.getByRole('button', { name: '기록하기' }))

    await waitFor(() => expect(saveMealMock).toHaveBeenCalled())
    expect(saveMealMock.mock.calls[0][0].eatenAt).toBe(new Date('2026-08-06T12:00:00+09:00').toISOString())
  })
})

describe('RecordsPage — 방금 담긴 줄', () => {
  /** 연출이 붙은 줄들 — 붙는 자리가 기록 줄(li)뿐이라 클래스로 바로 찾는다 */
  function marked(): Element[] {
    return [...document.querySelectorAll('.animate-settle-in')]
  }

  const egged: Meal = {
    ...lunch,
    id: 99,
    items: [{ name: '삶은달걀', kcal: 70, carbG: 0.4, proteinG: 6.3, fatG: 4.8, quantity: 1, unit: '개' }],
  }

  it('처음 열 때는 아무 줄도 새 줄이 아니다 — 전부 움직이면 방금 담은 게 묻힌다', async () => {
    getMealsMock.mockResolvedValue([lunch, egged])
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await screen.findByText(/김치찌개/)

    expect(marked()).toHaveLength(0)
  })

  it('담고 나면 새로 생긴 줄만 표시된다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await screen.findByText(/김치찌개/)

    // 저장 뒤 다시 조회하면 목록에 한 줄이 늘어 있다
    getMealsMock.mockResolvedValue([lunch, egged])
    await openCatalog()
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(screen.getByRole('button', { name: '기록하기' }))

    await waitFor(() => expect(marked()).toHaveLength(1))
    // 표시된 줄은 방금 들어온 그 줄이다 — 원래 있던 줄이 아니라
    expect(marked()[0].textContent).toContain('삶은달걀')
    expect(marked()[0].textContent).not.toContain('김치찌개')
  })

  it('한 번 나타난 뒤에는 다시 재생되지 않는다 — 끼니 탭을 오가면 줄이 다시 마운트된다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await screen.findByText(/김치찌개/)

    getMealsMock.mockResolvedValue([lunch, egged])
    await openCatalog()
    await user().click(await screen.findByRole('button', { name: '삶은달걀 담기' }))
    await user().click(screen.getByRole('button', { name: '기록하기' }))
    await waitFor(() => expect(marked()).toHaveLength(1))

    // 끼니를 옮겼다 돌아오면 그 줄은 언마운트→재마운트된다. 표식이 남아 있으면 그때 또 돈다
    await user().click(screen.getByRole('button', { name: /아침/ }))
    await user().click(screen.getByRole('button', { name: /점심/ }))
    // 기록 줄에만 있는 문구로 기다린다 — "삶은달걀"은 아래 음식 목록에도 있다
    await screen.findByText(/김치찌개/)

    expect(marked()).toHaveLength(0)
  })

  it('날짜를 옮기면 그 날 목록 전체를 기존으로 본다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    await user().click(await screen.findByRole('button', { name: /점심/ }))
    await screen.findByText(/김치찌개/)

    // 다른 날짜 — 목록이 통째로 바뀌지만 "새로 담긴 것"은 아니다.
    // 대기 문구는 **기록 줄에만 있는 것**이어야 한다: 아래 음식 목록에도 있는 이름을 기다리면
    // 그 목록에 먼저 걸려 새 기록이 그려지기 전에 단언이 돌아 헛통과한다
    getMealsMock.mockResolvedValue([
      { ...lunch, id: 51, items: [{ ...lunch.items[0], name: '연어스테이크' }] },
      { ...lunch, id: 52, items: [{ ...lunch.items[0], name: '연어스테이크' }] },
    ])
    fireEvent.change(screen.getByLabelText('날짜 선택'), { target: { value: '2026-08-05' } })

    await waitFor(() => expect(screen.getAllByText(/연어스테이크/)).toHaveLength(2))
    expect(marked()).toHaveLength(0)
  })
})

function user() {
  return userEvent.setup()
}

/** 열려 있는 탭은 AI라, 목록에서 담는 흐름은 "자주 먹는"으로 옮겨야 시작된다 */
async function openCatalog(typer = user()) {
  await typer.click(await screen.findByRole('button', { name: '자주 먹는' }))
}
