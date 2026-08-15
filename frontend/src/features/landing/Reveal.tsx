import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { canAnimate } from './motion'

/**
 * 화면에 들어올 때 떠오르는 연출. IntersectionObserver + CSS 전환으로만 한다.
 * 연출을 걸 수 없는 환경이면 처음부터 보인다(`canAnimate` 참고).
 */

export function Reveal({
  children,
  delayMs = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delayMs?: number
  className?: string
  /** 목록 안에서는 `li`로 렌더해야 한다 — ol/ul 바로 아래 div가 끼면 목록 구조가 깨진다 */
  as?: 'div' | 'li'
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(() => !canAnimate())

  useEffect(() => {
    if (shown) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      // 요소가 조금 들어왔을 때 시작해야 다 보이고 나서 뒤늦게 뜨는 느낌이 안 난다
      { rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref as never}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
      style={{ transitionDelay: shown ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </Tag>
  )
}
