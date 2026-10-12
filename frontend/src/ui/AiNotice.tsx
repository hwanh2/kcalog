import type { ReactNode } from 'react'

/**
 * 생성형 AI 고지. 앱인토스 정책(법령 근거)은 생성형 AI를 쓰는 기능에 AI 사용 사실을 알리고 결과물에 표시하라고 하고,
 * 같은 모델을 쓰는 자사 웹에도 같은 기준을 요구한다. 그래서 웹과 토스 빌드에 똑같이 그린다.
 * 처음 한 번만 보여 주는 대신 늘 보이게 둔다. "봤다"는 기록을 어디에 둘지 고민할 필요가 없고 문구가 짧다 (add-apps-in-toss D9).
 */
export function AiNotice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs leading-relaxed text-muted ${className}`}>{children}</p>
}

/**
 * 결과물에 붙는 표시. 정책은 결과물마다 라벨이나 배지처럼 바로 알아볼 수 있는 표시를 요구한다.
 * 숫자를 추정한 결과(사진 분석)는 "AI 추정", 글을 지어낸 결과(코칭, 대화)는 "AI 생성"으로 나눈다.
 */
export function AiLabel({
  text = 'AI 추정',
  onDark = false,
  className = '',
}: {
  text?: 'AI 추정' | 'AI 생성'
  /** 진한 색 카드(브리핑) 위. 회색 배지는 초록 위에서 묻힌다 */
  onDark?: boolean
  className?: string
}) {
  const tone = onDark ? 'bg-white/20 text-white' : 'bg-track text-muted'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${tone} ${className}`}>
      {text}
    </span>
  )
}
