import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteFavoriteMeal, getFavoriteMeals } from '../../api/favoriteMeal'
import type { FavoriteMeal } from '../../api/favoriteMeal'
import type { MealType } from '../../api/meal'
import { useMutationWithError } from '../../lib/useMutationWithError'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { MacroChips } from '../../ui/MacroChips'
import type { EditableItem } from '../meal/mealItems'
import { FavoriteMealApplySheet } from './FavoriteMealApplySheet'

/**
 * "내 세트" — 저장해 둔 음식 조합. 즐겨찾기 탭 위쪽에 음식 목록과 **구분해** 놓는다.
 * 담기는 단위가 달라(한 끼 vs 음식 하나) 한 줄로 섞으면 무엇이 한 상인지 알 수 없다.
 *
 * 세트가 없으면 아무것도 그리지 않는다 — 빈 자리가 음식 목록을 아래로 밀어내면 손해다.
 */
export function FavoriteMealSection({
  mealType,
  saving,
  onMealTypeChange,
  onRecordItems,
}: {
  mealType: MealType
  saving?: boolean
  onMealTypeChange: (next: MealType) => void
  onRecordItems: (items: EditableItem[]) => void
}) {
  const queryClient = useQueryClient()
  const [applying, setApplying] = useState<FavoriteMeal | null>(null)
  const [deleting, setDeleting] = useState<FavoriteMeal | null>(null)

  const { data: sets } = useQuery({ queryKey: ['favoriteMeals'], queryFn: getFavoriteMeals })

  const removeMutation = useMutationWithError(deleteFavoriteMeal, {
    errorMessage: '세트를 지우지 못했어요. 잠시 후 다시 시도해주세요.',
    onSuccess: () => {
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['favoriteMeals'] })
    },
  })

  if (!sets || sets.length === 0) return null

  return (
    <section aria-label="내 세트" className="mb-4">
      <h3 className="mb-2 text-[13px] font-bold text-muted">내 세트</h3>

      {/*
        삭제 실패 안내는 확인 시트가 맡는다 — 실패해도 시트가 열린 채 남으므로 여기에도 두면
        같은 문구가 두 곳에서 alert로 읽힌다.
      */}

      <ul className="space-y-2">
        {sets.map((set) => (
          // 안쪽 여백도 음식 줄(p-2.5)과 맞춘다 — 오른쪽 인셋이 달라지면 + 가 몇 px 어긋난다
          <li key={set.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5">
            {/*
              담기는 줄 전체가 아니라 **+ 버튼**이다 — 아래 음식 목록과 같은 모양이라야
              "이건 어떻게 담는 거지"를 두 번 배우지 않는다. 삭제(휴지통)는 그 옆에 그대로.
            */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{set.name}</p>
              <p className="text-[11px] tabular-nums text-muted">
                음식 {set.itemCount}개 · {set.totalKcal.toLocaleString()} kcal
              </p>
              <div className="mt-1">
                <MacroChips carbG={set.carbG} proteinG={set.proteinG} fatG={set.fatG} />
              </div>
            </div>
            {/* 휴지통이 먼저, 담기가 맨 오른쪽 — 아래 음식 목록도 담기가 오른쪽 끝이라
                두 목록의 + 가 같은 세로줄에 선다. 자리가 흔들리면 눈이 매번 다시 찾는다 */}
            <button
              type="button"
              aria-label={`${set.name} 세트 삭제`}
              onClick={() => setDeleting(set)}
              disabled={removeMutation.isPending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted touch-manipulation disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-danger"
            >
              <TrashIcon />
            </button>
            {/* aria-label이 없으면 "+" 하나만 읽혀 무엇을 담는 건지 알 수 없다 */}
            <button
              type="button"
              aria-label={`${set.name} 담기`}
              onClick={() => setApplying(set)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile bg-brand-soft text-lg font-bold text-brand-ink touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
            >
              +
            </button>
          </li>
        ))}
      </ul>

      {applying && (
        <FavoriteMealApplySheet
          set={applying}
          mealType={mealType}
          busy={saving}
          onMealTypeChange={onMealTypeChange}
          onSubmit={(items) => {
            onRecordItems(items)
            setApplying(null)
          }}
          onClose={() => setApplying(null)}
        />
      )}

      {deleting && (
        <ConfirmSheet
          title="이 세트를 지울까요?"
          description="되돌릴 수 없어요. 이미 기록한 식사는 그대로 남습니다."
          detail={`${deleting.name} · 음식 ${deleting.itemCount}개`}
          confirmLabel="삭제"
          busy={removeMutation.isPending}
          error={removeMutation.error}
          onConfirm={() => removeMutation.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  )
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  )
}
