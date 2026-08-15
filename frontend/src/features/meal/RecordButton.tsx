import { useId } from 'react'
import type { MealType } from '../../api/meal'
import { Button } from '../../ui/form'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from './mealDefaults'

/**
 * "[점심 ▾] 에 [기록하기]" — 담는 모든 자리의 공통 마무리 줄.
 *
 * 예전에는 버튼 문구에 끼니를 박아뒀다(`저녁에 기록하기`). 잘못된 끼니에 담는 사고는 줄었지만
 * **그 자리에서 고칠 수가 없어** 시트를 닫고 위 세그먼트를 바꾼 뒤 다시 들어와야 했다.
 * 끼니를 눌러서 바꿀 수 있게 꺼내 두면 둘 다 된다 — 보이고, 고칠 수 있다(design D13).
 *
 * 버튼 안에 버튼은 넣을 수 없어 형제로 둔다. 네이티브 select라 모바일에서 OS 피커가 열린다.
 */
export function RecordButton({
  mealType,
  onMealTypeChange,
  onClick,
  disabled,
  label = '기록하기',
}: {
  mealType: MealType
  onMealTypeChange: (next: MealType) => void
  onClick: () => void
  disabled?: boolean
  /** 담을 것이 없을 때처럼 문구가 달라지는 경우에만 넘긴다 */
  label?: string
}) {
  // 시트가 겹쳐 열려도 label-input 짝이 엉키지 않게 인스턴스마다 다른 id를 쓴다
  const selectId = useId()

  return (
    <div className="mt-4 flex items-center gap-2">
      <div className="relative shrink-0">
        <label htmlFor={selectId} className="sr-only">
          기록할 끼니
        </label>
        <select
          id={selectId}
          value={mealType}
          onChange={(e) => onMealTypeChange(e.target.value as MealType)}
          className="min-h-11 appearance-none rounded-tile bg-brand-soft py-2 pl-3.5 pr-9 text-[15px] font-bold text-brand-ink outline-none touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
        >
          {MEAL_TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {MEAL_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {/* select의 기본 화살표는 브라우저마다 달라 감추고 직접 그린다 — 클릭은 select로 통과시킨다 */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-ink"
        >
          ▼
        </span>
      </div>
      <span className="shrink-0 text-[15px] text-ink">에</span>
      <Button type="button" onClick={onClick} disabled={disabled} className="min-w-0 flex-1 py-3">
        {label}
      </Button>
    </div>
  )
}
