import type { PullState } from '../lib/usePullToRefresh'

/**
 * 당겨서 새로고침 표시 — 당긴 만큼 따라 내려오고, 놓으면 되는 지점을 넘겼을 때 색이 든다.
 *
 * 본문을 밀지 않고 **위에 겹쳐** 놓는다(`absolute`). 자리를 차지하면 당길 때마다 아래 내용이
 * 통째로 밀려 내려가 무엇이 새로고침되는지가 안 보인다.
 */
export function PullIndicator({ distance, armed, refreshing }: PullState) {
  if (distance === 0 && !refreshing) return null

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        // 본문 위(-40px)에서 시작해 당긴 만큼 내려온다 — 손가락이 끌어내리는 것으로 읽힌다
        style={{
          transform: `translateY(${distance - 40}px)`,
          // 당길수록 또렷해진다 — 얼마나 더 가야 하는지가 손에 읽힌다
          opacity: refreshing ? 1 : Math.min(1, distance / 48),
        }}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-md ${
            armed ? 'text-brand' : 'text-muted'
          }`}
        >
          {refreshing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand" />
          ) : (
            <ArrowIcon armed={armed} />
          )}
        </span>
      </div>

      {/* 보이는 표시는 장식이라 aria-hidden이다 — 새로고침이 도는 것만 따로 알린다 */}
      {refreshing && (
        <span role="status" className="sr-only">
          새로고침 중
        </span>
      )}
    </>
  )
}

/** 놓으면 되는 지점을 넘기면 화살표가 뒤집힌다 — "이제 놓으세요" */
function ArrowIcon({ armed }: { armed: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-200"
      style={{ transform: armed ? 'rotate(180deg)' : 'none' }}
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}
