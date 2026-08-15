import { isValidBox } from './mealItems'
import type { EditableItem } from './mealItems'

/** 사진 가장자리와 배지 사이 여백 */
const EDGE_GAP = '0.5rem'

/**
 * 배지를 가로로 어디에 맞출지 — 음식이 사진 가장자리에 있으면 **가운데 맞춤이 화면을 벗어난다.**
 * 배지 너비를 CSS만으로는 알 수 없으므로, 가장자리 구간에서는 아예 사진 끝에 붙인다.
 *
 * 22/78%는 배지 절반이 대체로 그 안에 들어가는 값이다. 정확히 재려면 렌더 후 측정이 필요한데,
 * 그러면 사진·글꼴 로드 시점마다 배지가 튄다.
 */
function horizontalAnchor(centerX: number): 'left' | 'right' | 'center' {
  if (centerX < 22) return 'left'
  if (centerX > 78) return 'right'
  return 'center'
}

/**
 * 배지가 사진 밖으로 나가지 않도록 너비 상한을 준다.
 *
 * ⚠️ 가운데 맞춤(`-translate-x-1/2`)일 때는 **가장자리 판정만으로는 부족하다.** 중심이 30%라도
 * 배지가 넓으면 왼쪽으로 삐져나간다. 중심에서 가까운 쪽 여백의 2배가 곧 쓸 수 있는 최대 너비다.
 *
 * 끝에 붙인 배지는 한 방향으로만 뻗으므로 사진 폭에서 여백만 빼면 된다.
 */
function maxWidthFor(anchor: 'left' | 'right' | 'center', centerX: number): string {
  if (anchor !== 'center') return `calc(100% - ${EDGE_GAP})`
  const nearestEdge = Math.min(centerX, 100 - centerX)
  return `calc(${(nearestEdge * 2).toFixed(2)}% - ${EDGE_GAP})`
}

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
      {/* 종횡비로 자리를 미리 잡는다 — 사진이 뜨며 아래 항목·버튼이 밀리면 누르려던 것이 움직인다.
          찍은 사진이라 실제 크기를 모르므로 픽셀 대신 비율로 잡고 object-cover로 채운다(design D5) */}
      <img src={src} alt="식사 사진" className="block aspect-[4/3] w-full rounded-2xl object-cover" />

      {items.map((item, index) => {
        if (!isValidBox(item.box)) return null
        const centerX = (item.box.x + item.box.w / 2) * 100
        const centerY = (item.box.y + item.box.h / 2) * 100
        const below = item.box.y < 0.28 // 위쪽 음식은 배지를 아래로
        const selected = selectedIndex === index
        const hasError = errorIndices.includes(index)
        const surface = selected ? 'bg-brand' : hasError ? 'bg-carb-soft' : 'bg-surface'
        const anchor = horizontalAnchor(centerX)

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`${item.name || '음식'} 편집`}
            aria-pressed={selected}
            style={{
              top: `${centerY}%`,
              maxWidth: maxWidthFor(anchor, centerX),
              ...(anchor === 'left'
                ? { left: EDGE_GAP }
                : anchor === 'right'
                  ? { right: EDGE_GAP }
                  : { left: `${centerX}%` }),
            }}
            className={`absolute touch-manipulation rounded-tile focus-visible:ring-2 focus-visible:ring-on-brand ${
              anchor === 'center' ? '-translate-x-1/2' : ''
            } ${below ? 'translate-y-2' : '-translate-y-[calc(100%+0.5rem)]'}`}
          >
            <span className={`relative block rounded-tile px-2.5 py-1.5 text-left shadow-lg ${surface}`}>
              {/* nowrap을 주지 않는다 — "고추장/채소무침 추정" 같은 긴 이름이 한 줄로 뻗어
                  배지가 사진 밖으로 나갔다. 줄바꿈해서 max-w 안에 담는다 */}
              <span className={`block text-xs font-bold ${selected ? 'text-on-brand' : 'text-ink'}`}>
                {item.name || '음식'}
              </span>
              <span className="mt-0.5 flex gap-1.5 whitespace-nowrap text-[11px] font-semibold">
                <span className={selected ? 'text-on-brand/90' : 'text-carb-ink'}>탄{item.carbG || 0}</span>
                <span className={selected ? 'text-on-brand/90' : 'text-protein-ink'}>단{item.proteinG || 0}</span>
                <span className={selected ? 'text-on-brand/90' : 'text-fat-ink'}>지{item.fatG || 0}</span>
              </span>
              {hasError && (
                <span className={`mt-1 block text-[10px] font-bold ${selected ? 'text-on-brand' : 'text-carb-ink'}`}>
                  확인 필요
                </span>
              )}
              {/* 말풍선 꼬리 — 배지가 가리키는 방향으로.
                  가장자리에 붙인 배지는 꼬리도 그 끝으로 옮긴다(가운데 두면 음식이 아닌 곳을 가리킨다) */}
              <span
                aria-hidden
                className={`absolute h-2.5 w-2.5 rotate-45 ${surface} ${
                  anchor === 'left'
                    ? 'left-4'
                    : anchor === 'right'
                      ? 'right-4'
                      : 'left-1/2 -translate-x-1/2'
                } ${below ? '-top-1' : '-bottom-1'}`}
              />
            </span>
          </button>
        )
      })}

      {/* 사용법은 사진 위에 얹는다 — 아래로 빼면 결과 목록과 안내가 뒤섞인다 */}
      {/* 남색 먹(ink)은 음식 사진의 따뜻한 색과 부딪히고, 옅은 갈색은 사진이 비쳐 탁해졌다.
          브랜드 오렌지의 어두운 끝을 90%로 얹어 앱 톤과 잇는다(design D6).
          ⚠️ 흰 글씨 대비 3.63:1 — 본문 기준 미달이며 의도된 예외다(tokens.ts KNOWN_EXCEPTIONS) */}
      <p className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-tile bg-brand-dark/90 px-3 py-2 text-[11px] font-medium text-on-brand">
        <span aria-hidden>💡</span>
        배지를 누르면 섭취량과 탄단지를 조절할 수 있어요
      </p>
    </div>
  )
}
