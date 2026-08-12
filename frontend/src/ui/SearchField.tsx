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
          className="w-full rounded-full bg-track py-2.5 pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/40 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="shrink-0 px-1 text-sm font-semibold text-muted"
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
