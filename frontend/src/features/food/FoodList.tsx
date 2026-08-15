import type { Food } from '../../api/food'
import { Button } from '../../ui/form'
import { MacroChips } from '../../ui/MacroChips'
import { formatQuantity } from '../../lib/number'
import { normalizeName } from './search'

/**
 * 음식 목록 — 한 줄에 하나씩(★ · 이름/기준량 · 탄단지 · kcal · 담기).
 * ★은 즐겨찾기 토글이다: 채워져 있으면 내 라이브러리에 있는 음식이고, 누르면 저장·해제된다.
 *
 * 검색 입력은 여기 없다 — 검색은 목록의 일부가 아니라 목록을 고르는 수단이라 부모가 갖는다(design D7).
 * `query`는 계속 받는다: 결과 없음 화면의 "'X' 을(를) 찾지 못했어요"가 그 값을 쓴다.
 */
export function FoodList({
  foods,
  query,
  favoriteNames,
  onPick,
  onToggleFavorite,
  onCreate,
  empty,
}: {
  foods: Food[]
  query: string
  favoriteNames: Set<string>
  onPick: (food: Food) => void
  onToggleFavorite: (food: Food, saved: boolean) => void
  onCreate?: (name: string) => void
  empty: React.ReactNode
}) {
  const trimmed = query.trim()
  return (
    <>
      {foods.length === 0 ? (
        <div className="mt-4">
          {trimmed === '' ? (
            empty
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted">'{trimmed}' 을(를) 찾지 못했어요.</p>
              {onCreate && (
                <Button type="button" variant="secondary" onClick={() => onCreate(trimmed)} className="mt-3">
                  '{trimmed}' 직접 추가하기
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {foods.map((food) => {
            const saved = food.source === 'FAVORITE' || favoriteNames.has(normalizeName(food.name))
            return (
              <li key={`${food.source}-${food.id}`}>
                <div className="flex items-center gap-3 rounded-tile border border-border bg-surface p-2.5">
                  <button
                    type="button"
                    aria-label={saved ? `${food.name} 즐겨찾기 해제` : `${food.name} 즐겨찾기에 저장`}
                    aria-pressed={saved}
                    onClick={() => onToggleFavorite(food, saved)}
                    className={`shrink-0 text-lg ${saved ? 'text-brand-ink' : 'text-border'}`}
                  >
                    ★
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="text-sm font-semibold text-ink">{food.name}</span>
                      <span className="ml-1.5 text-[11px] font-medium text-muted">
                        {formatQuantity(food.quantity)}
                        {food.unit}
                      </span>
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <MacroChips carbG={food.carbG} proteinG={food.proteinG} fatG={food.fatG} tone="text" />
                      <span className="text-[11px] font-medium tabular-nums text-muted">{food.kcal}kcal</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`${food.name} 담기`}
                    onClick={() => onPick(food)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile bg-brand-soft text-lg font-bold text-brand-ink"
                  >
                    +
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
