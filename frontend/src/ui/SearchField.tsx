/**
 * 검색 입력 — 알약형 회색 필드에 돋보기를 넣고, 입력이 있을 때만 옆에 "취소"가 붙는다.
 * 테두리 대신 배경(track)으로 필드를 구분해 목록 카드들과 시각적으로 겹치지 않게 한다.
 */
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
          <SearchIcon />
        </span>
        <input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          name="foodSearch"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full rounded-full bg-track py-2.5 pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand-ink/50 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          // 시각 크기는 그대로 두고 히트 영역만 44px로 넓힌다
          className="-my-2 shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
        >
          취소
        </button>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
