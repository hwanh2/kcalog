/**
 * 알약형 세그먼트 탭 — 배경 트랙 위에서 선택된 것만 흰 카드로 떠오른다.
 * 끼니 세그먼트와 "지금 추가하기" 탭이 같은 모양을 쓰도록 한 곳에 둔다.
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
      role="tablist"
      aria-label={label}
      className="flex gap-1 rounded-full border border-border bg-track p-1"
    >
      {items.map((item) => {
        const active = item.id === selected
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            // min-w-0 — 없으면 콘텐츠 너비가 flex-1의 하한이 되어 마지막 탭이 트랙 밖으로 밀린다
            className={`flex min-w-0 flex-1 justify-center whitespace-nowrap rounded-full transition-colors ${
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
