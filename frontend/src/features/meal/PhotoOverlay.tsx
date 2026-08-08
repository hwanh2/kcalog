import { isValidBox } from './mealItems'
import type { EditableItem } from './mealItems'

/** 사진 위 음식별 박스+라벨 오버레이 — box(정규화 0~1)를 %로 배치. 유효한 box만 그린다.
 *  편집은 아래 목록에서 하고, 여기선 위치·라벨만 보여준다(design D2 오버레이 모드) */
export function PhotoOverlay({ src, items }: { src: string; items: EditableItem[] }) {
  return (
    <div className="relative">
      <img src={src} alt="식사 사진" className="block w-full rounded-md" />
      {items.map((item, i) =>
        isValidBox(item.box) ? (
          <div
            key={i}
            className="absolute rounded-sm border-2 border-brand"
            style={{
              left: `${item.box.x * 100}%`,
              top: `${item.box.y * 100}%`,
              width: `${item.box.w * 100}%`,
              height: `${item.box.h * 100}%`,
            }}
          >
            <span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-sm bg-brand px-1 text-xs text-on-brand">
              {item.name} {item.kcal || 0}kcal
            </span>
          </div>
        ) : null,
      )}
    </div>
  )
}
