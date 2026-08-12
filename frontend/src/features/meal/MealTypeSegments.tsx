import type { MealType } from '../../api/meal'
import { SegmentedTabs } from '../../ui/SegmentedTabs'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from './mealDefaults'

/**
 * 끼니 세그먼트 — 보기 필터이자 등록 대상(design D1·D7).
 * 여기서 고른 끼니로 아래 목록이 걸러지고, "지금 추가하기"로 담는 것도 그 끼니로 들어간다.
 * 배지는 그 끼니에 저장된 기록 수.
 */
export function MealTypeSegments({
  selected,
  counts,
  onSelect,
}: {
  selected: MealType
  counts: Record<MealType, number>
  onSelect: (type: MealType) => void
}) {
  return (
    <SegmentedTabs
      label="끼니"
      selected={selected}
      onSelect={onSelect}
      items={MEAL_TYPE_ORDER.map((type) => ({
        id: type,
        label: MEAL_TYPE_LABELS[type],
        badge: counts[type] ?? 0,
      }))}
    />
  )
}
