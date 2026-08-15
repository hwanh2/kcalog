/**
 * 밑줄 탭 — 화면 맨 위에서 무엇을 보고 있는지 가르는 자리.
 *
 * 알약 세그먼트(`SegmentedTabs`)와 쓰임이 다르다. 알약은 **본문 안에서** 목록을 거르는
 * 컨트롤이라 트랙 위에 떠 있어야 하고, 이건 **화면의 첫 줄**이라 면 위에 얹히지 않고
 * 아래 경계선에 붙어야 자리를 덜 먹는다.
 *
 * `role="tab"`을 쓰지 않는 이유는 `SegmentedTabs`와 같다 — 패널을 전환하는 tabs 규약을
 * 반만 구현하면 스크린리더가 없는 화살표 이동을 안내한다. 눌림 상태(`aria-pressed`)로 알린다.
 */
export function UnderlineTabs<T extends string>({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string
  items: { id: T; label: string; badge?: number }[]
  selected: T
  onSelect: (id: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex border-b border-border">
      {items.map((item) => {
        const active = item.id === selected
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item.id)}
            // min-w-0 — 없으면 콘텐츠 너비가 flex-1의 하한이 되어 마지막 탭이 밖으로 밀린다
            className={`relative min-h-11 min-w-0 flex-1 pb-2.5 pt-2 text-[13px] touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-ink ${
              active ? 'font-extrabold text-brand-ink' : 'font-medium text-muted'
            }`}
          >
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className={`ml-1 text-[11px] tabular-nums ${active ? 'text-brand-ink' : 'text-muted'}`}>
                {item.badge}
              </span>
            )}
            {/* 밑줄은 경계선 위에 겹쳐 그린다(-bottom-px) — 경계선이 비치면 두 줄로 보인다 */}
            {active && (
              <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
            )}
          </button>
        )
      })}
    </div>
  )
}
