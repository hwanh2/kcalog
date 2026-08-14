import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteFavorite, getFoods, saveFavorite } from '../../api/food'
import type { Food } from '../../api/food'
import type { MealType } from '../../api/meal'
import { useSafeMutation } from '../../lib/useSafeMutation'
import { ErrorNotice } from '../../ui/ErrorNotice'
import { ListSkeleton } from '../../ui/ListSkeleton'
import { SegmentedTabs } from '../../ui/SegmentedTabs'
import { ClockIcon, SparklesIcon, StarIcon } from '../../ui/icons'
import { AiRecordPanel } from '../meal/AiRecordPanel'
import type { EditableItem } from '../meal/mealItems'
import { fromFood } from '../meal/mealItems'
import { EmptyFavorites } from './EmptyFavorites'
import { FoodDraftSheet } from './FoodDraftSheet'
import type { DraftValues } from './FoodDraftSheet'
import { FoodList } from './FoodList'
import { FoodQuantitySheet } from './FoodQuantitySheet'
import { normalizeName, searchFoods } from './search'

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

  const { data: foods, isPending } = useQuery({ queryKey: ['foods'], queryFn: getFoods })

  const refreshFoods = () => void queryClient.invalidateQueries({ queryKey: ['foods'] })
  // 성공 안내는 두지 않는다 — ★이 채워지고 비워지는 것 자체가 결과다(design D4).
  // 실패만 알린다.
  const favoriteMutation = useSafeMutation(saveFavorite, {
    errorMessage: '즐겨찾기에 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
    onSuccess: () => {
      refreshFoods()
      setStarred(null)
      setDraft(null)
    },
  })
  const removeFavoriteMutation = useSafeMutation(deleteFavorite, {
    errorMessage: '즐겨찾기에서 빼지 못했어요. 잠시 후 다시 시도해주세요.',
    onSuccess: refreshFoods,
  })

  const all = foods ?? []
  const favorites = all.filter((food) => food.source === 'FAVORITE')
  const favoriteNames = new Set(favorites.map((food) => normalizeName(food.name)))
  const visible = searchFoods(tab === 'favorite' ? favorites : all, query)

  /** ★ — 이미 있으면 빼고, 없으면 값을 확인하는 저장 시트를 연다 */
  function toggleFavorite(food: Food, saved: boolean) {
    if (!saved) {
      setStarred(food)
      return
    }
    const target = favorites.find((f) => normalizeName(f.name) === normalizeName(food.name))
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
          favoriteMutation.clearError()
          removeFavoriteMutation.clearError()
        }}
      />

      <div className="mt-3">
        {/* 즐겨찾기 해제 실패는 목록 위에 — ★이 그대로인 이유를 여기서 알려준다 */}
        <ErrorNotice message={removeFavoriteMutation.error} className="mb-2" />

        {tab === 'ai' ? (
          <AiRecordPanel
            mealType={mealType}
            autoCamera={autoCamera}
            saving={saving}
            onSave={(items, jobId) => onRecordItems(items, jobId)}
            onManual={() => setDraft({ mode: 'record', name: '' })}
          />
        ) : isPending ? (
          <ListSkeleton rows={4} />
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
          error={favoriteMutation.error}
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
          error={draft.mode === 'favorite' ? favoriteMutation.error : null}
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
