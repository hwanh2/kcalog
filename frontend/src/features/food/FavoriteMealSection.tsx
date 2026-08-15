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
  onRecordItems,
}: {
  mealType: MealType
  saving?: boolean
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
          <li key={set.id} className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3">
            {/* aria-label이 없으면 이름·개수·칼로리·매크로 칩이 통째로 이어붙어 읽힌다 */}
            <button
              type="button"
              aria-label={`${set.name} 담기`}
              onClick={() => setApplying(set)}
              className="min-w-0 flex-1 rounded-tile text-left transition-colors hover:bg-canvas active:bg-track focus-visible:ring-2 focus-visible:ring-brand-ink"
            >
              <p className="truncate text-sm font-bold text-ink">{set.name}</p>
              <p className="text-[11px] tabular-nums text-muted">
                음식 {set.itemCount}개 · {set.totalKcal.toLocaleString()} kcal
              </p>
              <div className="mt-1">
                <MacroChips carbG={set.carbG} proteinG={set.proteinG} fatG={set.fatG} />
              </div>
            </button>
            <button
              type="button"
              aria-label={`${set.name} 세트 삭제`}
              onClick={() => setDeleting(set)}
              disabled={removeMutation.isPending}
              className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted touch-manipulation disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-danger"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>

      {applying && (
        <FavoriteMealApplySheet
          set={applying}
          mealType={mealType}
          busy={saving}
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
