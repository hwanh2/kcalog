import { SparklesIcon } from '../../ui/icons'

/**
 * 분석 대기 화면 — 사진 위로 스캔 라인이 지나가고, 결과가 들어설 자리를 스켈레톤으로 미리 보여준다.
 * 무엇을 기다리는지(항목 몇 개가 나올 자리인지) 보이면 같은 시간도 덜 지루하다.
 * 사진이 없는(설명만) 분석은 스캔할 대상이 없으므로 반짝임 아이콘만 맥동시킨다.
 */
export function AnalyzingView({ photoUrl }: { photoUrl: string | null }) {
  return (
    <div className="py-4">
      {photoUrl ? (
        <div className="relative mx-auto w-52 overflow-hidden rounded-2xl">
          <img src={photoUrl} alt="분석 중인 사진" className="w-full" />
          <div aria-hidden className="absolute inset-0 bg-ink/25" />
          <div
            aria-hidden
            className="animate-scan absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-brand/60 to-transparent"
          />
        </div>
      ) : (
        <span
          aria-hidden
          className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-brand-soft text-brand"
        >
          <SparklesIcon />
        </span>
      )}

      <p role="status" className="mt-4 text-center text-sm font-semibold text-ink">
        {photoUrl ? '사진 속 음식을 찾고 있어요' : '설명을 읽고 있어요'}
        <span aria-hidden className="ml-0.5 inline-flex">
          <Dot delay="0ms" />
          <Dot delay="200ms" />
          <Dot delay="400ms" />
        </span>
      </p>
      <p className="mt-1 text-center text-xs text-muted">보통 5~10초 걸려요</p>

      {/* 결과가 들어설 자리 */}
      <ul aria-hidden className="mt-5 space-y-2">
        {[0, 1, 2].map((index) => (
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
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return <span className="animate-pulse" style={{ animationDelay: delay }}>.</span>
}
