import type { RefObject } from 'react'

/**
 * 안내 말풍선. 제목, 설명, 진행 점, 건너뛰기, 이전, 다음.
 *
 * 자리는 오버레이가 정하고 여기는 내용만 그린다. 스텝이 바뀌어도 **같은 DOM 노드**가 남아
 * 포커스 가둠이 끊기지 않는다. 그래서 제목, 설명은 aria-live로 읽어준다.
 * 다이얼로그 안의 글자만 바뀌면 스크린리더가 알아채지 못한다.
 */
export function TutorialCard({
  panelRef,
  title,
  body,
  index,
  total,
  onPrev,
  onNext,
  onSkip,
}: {
  panelRef: RefObject<HTMLDivElement | null>
  title: string
  body: string
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
}) {
  const isLast = index === total - 1

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="앱 둘러보기"
      tabIndex={-1}
      className="pointer-events-auto w-full max-w-sm rounded-card bg-surface p-5 shadow-lg outline-none"
    >
      <div className="flex items-center justify-between">
        <div aria-hidden="true" className="flex items-center gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${
                i === index ? 'w-5 bg-brand' : i < index ? 'w-1.5 bg-brand/40' : 'w-1.5 bg-track'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="-mr-2 -my-2 min-h-11 px-2 text-xs font-bold text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
        >
          건너뛰기
        </button>
      </div>

      {/*
        스텝이 바뀌면 여기 글자만 갈린다. 읽어주지 않으면 보조기기 사용자는 변화를 모른다.
        live 영역 자체는 **그대로 두고** 안쪽만 key로 간다. 영역 노드까지 갈아치우면
        "안에서 바뀐 것"이 아니라 "새로 생긴 것"이라 읽어주지 않는다.
      */}
      <div aria-live="polite" className="mt-3">
        <div key={index} className="tutorial-copy">
          <p className="text-base font-extrabold text-ink">{title}</p>
          <p className="mt-1.5 text-sm leading-[1.75] text-ink/75">{body}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {index > 0 && (
          <button
            type="button"
            onClick={onPrev}
            className="press min-h-11 flex-1 rounded-tile bg-track text-sm font-bold text-ink touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="press min-h-11 flex-[2] rounded-tile bg-brand text-sm font-bold text-on-brand touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
        >
          {isLast ? '시작하기' : '다음'}
        </button>
      </div>
    </div>
  )
}
