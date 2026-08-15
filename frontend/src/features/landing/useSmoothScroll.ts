import { useEffect } from 'react'
import { canAnimate } from './motion'

/**
 * 랜딩에만 거는 관성 스크롤. 휠을 굴리면 목표 지점까지 감속하며 미끄러진다.
 *
 * **랜딩 화면에서만 부른다.** 앱(5탭 셸)은 목록을 훑고 시트를 여닫는 화면이라 스크롤을
 * 가로채면 조작이 굼떠진다. 연출은 처음 오는 사람을 붙잡는 자리에서만 값이 있다.
 *
 * 터치 기기에서는 걸지 않는다 — 브라우저의 관성 스크롤이 이미 좋고, 가로채면 오히려 어색해진다.
 * CSS로는 대체할 수 없어(`scroll-behavior: smooth`는 앵커 점프만 다룬다) 라이브러리를 쓴다.
 *
 * **동적 import를 쓴다.** 정적으로 부르면 랜딩을 볼 일 없는 앱 사용자까지 이 코드를 내려받는다.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches === true
    if (coarsePointer || !canAnimate()) return

    let frame = 0
    let stop = () => {}
    // 내려받는 사이에 화면을 떠날 수 있다 — 그때는 만들지 않고 끝낸다
    let cancelled = false

    void import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      const lenis = new Lenis({
        duration: 0.9,
        // 끝에서 부드럽게 멎는 지수 감속
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1.1,
      })

      const raf = (time: number) => {
        lenis.raf(time)
        frame = requestAnimationFrame(raf)
      }
      frame = requestAnimationFrame(raf)

      stop = () => {
        cancelAnimationFrame(frame)
        lenis.destroy()
      }
    })

    return () => {
      cancelled = true
      stop()
    }
  }, [])
}
