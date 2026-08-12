import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteFavorite, getFoods, saveFavorite } from '../../api/food'
import type { Food } from '../../api/food'
import type { MealType } from '../../api/meal'
import { SegmentedTabs } from '../../ui/SegmentedTabs'
import { ClockIcon, SparklesIcon, StarIcon } from '../../ui/icons'
import { AiRecordPanel } from '../meal/AiRecordPanel'
import type { EditableItem } from '../meal/mealItems'
import { fromFood } from '../meal/mealItems'
import { EmptyFavorites } from './EmptyFavorites'
import { FoodDraftSheet } from './FoodDraftSheet'
import type { DraftValues } from './FoodDraftSheet'
import { FoodList, normalizeKey } from './FoodList'
import { FoodQuantitySheet } from './FoodQuantitySheet'
import { searchFoods } from './search'

type Tab = 'catalog' | 'favorite' | 'ai'

const TABS = [
  { id: 'catalog' as const, label: '자주 먹는', icon: <ClockIcon /> },
  { id: 'favorite' as const, label: '즐겨찾기', icon: <StarIcon /> },
  { id: 'ai' as const, label: 'AI 입력', icon: <SparklesIcon /> },
]

/**
 * "지금 추가하기" — 자주먹는·즐겨찾기·AI로 기록 3탭(design D17).
 * 담기는 모두 선택된 끼니로 들어가고(design D1), 저장은 부모가 수행한다.
 */
export function AddFoodPanel({
  mealType,
  autoCamera,
  saving,
  onRecordItems,
}: {
  mealType: MealType
  autoCamera?: boolean
  saving?: boolean
  onRecordItems: (items: EditableItem[], analysisJobId?: number) => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>(autoCamera ? 'ai' : 'catalog')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Food | null>(null)
  const [draft, setDraft] = useState<{ mode: 'record' | 'favorite'; name: string } | null>(null)
  const [starred, setStarred] = useState<Food | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data: foods, isPending } = useQuery({ queryKey: ['foods'], queryFn: getFoods })

  const refreshFoods = () => void queryClient.invalidateQueries({ queryKey: ['foods'] })
  const favoriteMutation = useMutation({
    mutationFn: saveFavorite,
    onSuccess: (saved) => {
      refreshFoods()
      setNotice(`'${saved.name}'을(를) 즐겨찾기에 저장했어요.`)
      setStarred(null)
      setDraft(null)
    },
  })
  const removeFavoriteMutation = useMutation({
    mutationFn: deleteFavorite,
    onSuccess: () => {
      refreshFoods()
      setNotice('즐겨찾기에서 뺐어요.')
    },
  })

  const all = foods ?? []
  const favorites = all.filter((food) => food.source === 'FAVORITE')
  const favoriteNames = new Set(favorites.map((food) => normalizeKey(food.name)))
  const visible = searchFoods(tab === 'favorite' ? favorites : all, query)

  /** ★ — 이미 있으면 빼고, 없으면 값을 확인하는 저장 시트를 연다 */
  function toggleFavorite(food: Food, saved: boolean) {
    if (!saved) {
      setStarred(food)
      return
    }
    const target = favorites.find((f) => normalizeKey(f.name) === normalizeKey(food.name))
    if (target) removeFavoriteMutation.mutate(target.id)
  }

  function record(values: DraftValues) {
    onRecordItems([
      fromFood({ name: values.name, unit: values.unit }, values.quantity, {
        kcal: values.kcal,
        carbG: values.carbG,
        proteinG: values.proteinG,
        fatG: values.fatG,
      }),
    ])
    setDraft(null)
  }

  return (
    // 위 기록 표와 확실히 갈라놓는다 — 넉넉한 여백 + 구분선 + 섹션 제목
    <section aria-label="지금 추가하기" className="mt-8 border-t border-border pt-5">
      <h2 className="mb-2 text-[13px] font-bold text-muted">지금 추가하기</h2>
      <SegmentedTabs
        label="추가 방법"
        items={TABS}
        selected={tab}
        onSelect={(next) => {
          setTab(next)
          setQuery('')
          setNotice(null)
        }}
      />

      <div className="mt-3">
        {notice && (
          <p role="status" className="mb-2 text-sm text-muted">
            {notice}
          </p>
        )}

        {tab === 'ai' ? (
          <AiRecordPanel
            mealType={mealType}
            autoCamera={autoCamera}
            saving={saving}
            onSave={(items, jobId) => onRecordItems(items, jobId)}
            onManual={() => setDraft({ mode: 'record', name: '' })}
          />
        ) : isPending ? (
          <p className="text-muted">불러오는 중…</p>
        ) : (
          <FoodList
            foods={visible}
            query={query}
            onQueryChange={setQuery}
            favoriteNames={favoriteNames}
            onPick={setPicked}
            onToggleFavorite={toggleFavorite}
            onCreate={(name) => setDraft({ mode: tab === 'favorite' ? 'favorite' : 'record', name })}
            empty={
              tab === 'favorite' ? (
                <EmptyFavorites />
              ) : (
                <p className="text-center text-sm text-muted">음식 목록이 비어 있어요.</p>
              )
            }
          />
        )}
      </div>

      {picked && (
        <FoodQuantitySheet
          food={picked}
          mealType={mealType}
          busy={saving}
          onSubmit={(quantity, nutrition) => {
            onRecordItems([fromFood(picked, quantity, nutrition)])
            setPicked(null)
          }}
          onClose={() => setPicked(null)}
        />
      )}

      {starred && (
        <FoodDraftSheet
          mode="favorite"
          initial={{
            name: starred.name,
            quantity: String(starred.quantity),
            unit: starred.unit,
            kcal: String(starred.kcal),
            carbG: String(starred.carbG),
            proteinG: String(starred.proteinG),
            fatG: String(starred.fatG),
          }}
          busy={favoriteMutation.isPending}
          onSubmit={(values, remember) =>
            favoriteMutation.mutate({ ...values, rememberForAnalysis: remember })
          }
          onClose={() => setStarred(null)}
        />
      )}

      {draft && (
        <FoodDraftSheet
          mode={draft.mode}
          mealType={mealType}
          initial={{ name: draft.name }}
          busy={saving || favoriteMutation.isPending}
          onSubmit={(values, remember) => {
            if (draft.mode === 'favorite') {
              favoriteMutation.mutate({ ...values, rememberForAnalysis: remember })
            } else {
              record(values)
            }
          }}
          onClose={() => setDraft(null)}
        />
      )}
    </section>
  )
}
