import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFavoriteMeals, saveFavoriteMeal } from '../../api/favoriteMeal'
import type { FavoriteMealItem } from '../../api/favoriteMeal'
import { useMutationWithError } from '../../lib/useMutationWithError'
import { ErrorNotice } from '../../ui/ErrorNotice'
import { Sheet } from '../../ui/Sheet'
import { Button, Field, TextInput } from '../../ui/form'
import { MacroChips } from '../../ui/MacroChips'
import { defaultSetName } from './favoriteMealName'
import { normalizeName } from './search'

/**
 * 끼니 세트 저장 — 담긴 음식을 확인하고 이름을 정한다.
 * 분석 결과 시트와 저장된 기록 카드가 함께 쓴다(design D7).
 *
 * ⚠️ 같은 이름이 있으면 **구성을 덮어쓴다**(design D3). 조용히 지우면 안 되므로 저장 전에 알린다.
 */
export function FavoriteMealSaveSheet({
  items,
  onSaved,
  onClose,
}: {
  items: FavoriteMealItem[]
  onSaved: () => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(() => defaultSetName(items.map((item) => item.name)))
  const [nameError, setNameError] = useState<string | null>(null)

  // 덮어쓰기 예고를 위해 기존 세트를 읽는다. 목록이 아직 안 왔으면 예고만 못 할 뿐,
  // 서버가 정규화명으로 판정하므로 저장 결과는 달라지지 않는다.
  const { data: existing } = useQuery({ queryKey: ['favoriteMeals'], queryFn: getFavoriteMeals })
  const trimmed = name.trim()
  const overwrites = (existing ?? []).some((set) => normalizeName(set.name) === normalizeName(trimmed))

  const mutation = useMutationWithError(saveFavoriteMeal, {
    errorMessage: '세트를 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favoriteMeals'] })
      onSaved()
    },
  })

  const totalKcal = items.reduce((sum, item) => sum + item.kcal, 0)
  const totals = {
    carbG: sum(items, 'carbG'),
    proteinG: sum(items, 'proteinG'),
    fatG: sum(items, 'fatG'),
  }

  function submit() {
    if (trimmed === '') {
      mutation.clearError() // 두 오류 채널이 서로를 가리지 않게
      setNameError('이름을 입력해주세요')
      return
    }
    setNameError(null)
    mutation.mutate({ name: trimmed, items })
  }

  return (
    <Sheet label="끼니 세트로 저장" onClose={onClose}>
      <p className="mb-1 pr-12 text-lg font-bold text-ink">끼니 세트로 저장</p>
      <p className="mb-4 text-sm text-muted">
        다음에 이 구성 그대로 한 번에 담을 수 있어요. 개별 음식 즐겨찾기는 늘지 않아요.
      </p>

      <Field id="favorite-meal-name" label="세트 이름" error={nameError ?? undefined}>
        <TextInput
          id="favorite-meal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 회사 점심 A"
          maxLength={100}
        />
      </Field>

      {/* 덮어쓰기는 말없이 이전 구성을 지운다 — 저장 전에 드러낸다(design D3) */}
      {overwrites && (
        <p role="status" className="-mt-2 mb-4 rounded-tile bg-carb-soft px-3 py-2 text-xs text-carb-ink">
          이미 있는 이름이에요. 저장하면 그 세트의 구성을 덮어써요.
        </p>
      )}

      <div className="rounded-2xl bg-canvas p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-bold text-ink">담긴 음식 {items.length}개</p>
          <span className="text-[13px] font-black tabular-nums text-brand-ink">
            {totalKcal.toLocaleString()} kcal
          </span>
        </div>
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-ink">{item.name}</span>
              <span className="shrink-0 tabular-nums text-muted">{item.kcal.toLocaleString()} kcal</span>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <MacroChips carbG={totals.carbG} proteinG={totals.proteinG} fatG={totals.fatG} />
        </div>
      </div>

      <ErrorNotice message={mutation.error} className="mt-3" />

      {/* 시트를 연 버튼도 "세트로 저장"이라 같은 문구를 쓰면 한 화면에 같은 이름의 버튼이 둘이 된다 */}
      <Button type="button" onClick={submit} disabled={mutation.isPending} className="mt-4 w-full py-3">
        {overwrites ? '덮어쓰기' : '저장'}
      </Button>
    </Sheet>
  )
}

function sum(items: FavoriteMealItem[], field: 'carbG' | 'proteinG' | 'fatG'): number {
  return Math.round(items.reduce((total, item) => total + item[field], 0) * 10) / 10
}
