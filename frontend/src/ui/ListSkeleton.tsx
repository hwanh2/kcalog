/**
 * 목록이 들어설 자리 — 불러오는 동안 "불러오는 중…" 텍스트 한 줄 대신 자리를 차지한다.
 * 빈 화면이 갑자기 채워지면 그만큼 화면이 튀고, 무엇을 기다리는지도 알 수 없다.
 *
 * 분석 대기 화면(AnalyzingView)이 쓰던 모양을 꺼내 줄 수만 받게 했다.
 */
export function ListSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <ul aria-hidden className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-tile border border-border bg-surface p-3"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <span className="h-9 w-9 shrink-0 rounded-tile bg-track" />
          <span className="flex-1">
            <span className="block h-3 w-2/5 rounded-full bg-track" />
            <span className="mt-1.5 block h-2.5 w-3/5 rounded-full bg-track" />
          </span>
          <span className="h-3 w-10 rounded-full bg-track" />
        </li>
      ))}
    </ul>
  )
}
