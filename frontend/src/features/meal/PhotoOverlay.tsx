import { isValidBox } from './mealItems'
import type { EditableItem } from './mealItems'

/** 사진 위 음식별 박스 오버레이 — 유효한 box를 %로 배치. 박스는 탭하면 해당 항목 편집을 연다(onSelect).
 *  라벨은 이름 + 탄·단·지 요약을 보여준다(design D2 오버레이-편집 모드) */
export function PhotoOverlay({
  src,
  items,
  onSelect,
  errorIndices = [],
}: {
  src: string
  items: EditableItem[]
  onSelect: (index: number) => void
  errorIndices?: number[]
}) {
  return (
    <div className="relative">
      <img src={src} alt="식사 사진" className="block w-full rounded-md" />
      {items.map((item, i) =>
        isValidBox(item.box) ? (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`${item.name || '음식'} 편집`}
            className={`absolute rounded-sm border-2 ${
              errorIndices.includes(i) ? 'border-danger' : 'border-brand'
            }`}
            style={{
              left: `${item.box.x * 100}%`,
              top: `${item.box.y * 100}%`,
              width: `${item.box.w * 100}%`,
              height: `${item.box.h * 100}%`,
            }}
          >
            <span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-sm bg-brand px-1 text-xs text-on-brand">
              {item.name || '음식'} · 탄{item.carbG || 0} 단{item.proteinG || 0} 지{item.fatG || 0}
            </span>
          </button>
        ) : null,
      )}
    </div>
  )
}
