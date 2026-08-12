import { isValidBox } from './mealItems'
import type { EditableItem } from './mealItems'

/**
 * 사진 위 음식별 배지 — 테두리 상자 대신 말풍선을 얹는다(값이 바로 읽히고 탭 대상이 커진다).
 * 배지를 누르면 그 항목 편집이 열리고, 선택된 항목은 브랜드 색으로 물들어 사진과 목록이 서로를 가리킨다.
 * 오류 항목은 앰버 톤 + "확인 필요"로 눈에 띄게 하고, 사진 위쪽 음식은 배지를 아래로 내려 잘리지 않게 한다.
 */
export function PhotoOverlay({
  src,
  items,
  onSelect,
  selectedIndex = null,
  errorIndices = [],
}: {
  src: string
  items: EditableItem[]
  onSelect: (index: number) => void
  selectedIndex?: number | null
  errorIndices?: number[]
}) {
  return (
    <div className="relative">
      <img src={src} alt="식사 사진" className="block w-full rounded-2xl" />

      {items.map((item, index) => {
        if (!isValidBox(item.box)) return null
        const centerX = (item.box.x + item.box.w / 2) * 100
        const centerY = (item.box.y + item.box.h / 2) * 100
        const below = item.box.y < 0.28 // 위쪽 음식은 배지를 아래로
        const selected = selectedIndex === index
        const hasError = errorIndices.includes(index)
        const surface = selected ? 'bg-brand' : hasError ? 'bg-carb-soft' : 'bg-surface'

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`${item.name || '음식'} 편집`}
            aria-pressed={selected}
            style={{ left: `${centerX}%`, top: `${centerY}%` }}
            className={`absolute -translate-x-1/2 ${below ? 'translate-y-2' : '-translate-y-[calc(100%+0.5rem)]'}`}
          >
            <span className={`relative block rounded-tile px-2.5 py-1.5 text-left shadow-lg ${surface}`}>
              <span
                className={`block whitespace-nowrap text-xs font-bold ${selected ? 'text-on-brand' : 'text-ink'}`}
              >
                {item.name || '음식'}
              </span>
              <span className="mt-0.5 flex gap-1.5 whitespace-nowrap text-[11px] font-semibold">
                <span className={selected ? 'text-on-brand/90' : 'text-carb'}>탄{item.carbG || 0}</span>
                <span className={selected ? 'text-on-brand/90' : 'text-protein'}>단{item.proteinG || 0}</span>
                <span className={selected ? 'text-on-brand/90' : 'text-fat'}>지{item.fatG || 0}</span>
              </span>
              {hasError && (
                <span className={`mt-1 block text-[10px] font-bold ${selected ? 'text-on-brand' : 'text-carb'}`}>
                  확인 필요
                </span>
              )}
              {/* 말풍선 꼬리 — 배지가 가리키는 방향으로 */}
              <span
                aria-hidden
                className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 ${surface} ${
                  below ? '-top-1' : '-bottom-1'
                }`}
              />
            </span>
          </button>
        )
      })}

      {/* 사용법은 사진 위에 얹는다 — 아래로 빼면 결과 목록과 안내가 뒤섞인다 */}
      <p className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-tile bg-ink/70 px-3 py-2 text-[11px] font-medium text-on-brand">
        <span aria-hidden>💡</span>
        배지를 누르면 섭취량과 탄단지를 조절할 수 있어요
      </p>
    </div>
  )
}
