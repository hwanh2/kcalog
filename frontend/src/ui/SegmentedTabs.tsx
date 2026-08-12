/**
 * 알약형 세그먼트 — 배경 트랙 위에서 선택된 것만 흰 카드로 떠오른다.
 * 끼니 세그먼트와 "지금 추가하기" 탭이 같은 모양을 쓰도록 한 곳에 둔다.
 *
 * ARIA tabs 패턴(role="tab")을 쓰지 않는 이유 — 이 컨트롤은 패널을 전환하지 않고
 * 같은 목록을 거르는 필터다. tabs로 선언하면 `aria-controls`와 좌우 화살표 이동까지
 * 갖춰야 하는데, 반만 구현하면 스크린리더가 "탭 3/5"라고 알리고 사용자가 화살표를
 * 눌러도 아무 일이 없다. 없는 동작을 안내하느니 눌림 상태(aria-pressed)로 알린다.
 */
export function SegmentedTabs<T extends string>({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string
  items: { id: T; label: string; badge?: number; icon?: React.ReactNode }[]
  selected: T
  onSelect: (id: T) => void
}) {
  // 아이콘이 있는 탭은 아이콘 위·라벨 아래로 쌓는다(끼니 세그먼트처럼 아이콘이 없으면 한 줄)
  const stacked = items.some((item) => item.icon)
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1 rounded-full border border-border bg-track p-1"
    >
      {items.map((item) => {
        const active = item.id === selected
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item.id)}
            // min-w-0 — 없으면 콘텐츠 너비가 flex-1의 하한이 되어 마지막 탭이 트랙 밖으로 밀린다
            // min-h-11 — 시각 크기는 그대로 두고 탭 대상만 44px로
            className={`flex min-h-11 min-w-0 flex-1 justify-center whitespace-nowrap rounded-full transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink ${
              stacked
                ? 'flex-col items-center gap-0.5 px-2 py-1.5 text-[11px] leading-tight'
                : 'items-center gap-1 px-3 py-1.5 text-[13px]'
            } ${
              active
                ? 'border border-border bg-surface font-bold text-brand shadow-sm'
                : 'border border-transparent font-medium text-muted'
            }`}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? 'bg-brand text-on-brand' : 'bg-border text-muted'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
