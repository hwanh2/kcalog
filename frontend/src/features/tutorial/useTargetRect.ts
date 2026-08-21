import { useEffect, useState } from 'react'

/** 스팟라이트가 쓰는 만큼만. DOMRect를 그대로 들고 있으면 매 프레임 새 객체라 비교가 안 된다 */
export interface TargetBox {
  top: number
  left: number
  width: number
  height: number
  /** 대상의 라운드를 그대로 쓴다. 안 그러면 원형인 코치 FAB이 사각으로 비춰진다 */
  radius: string
}

function same(a: TargetBox | null, b: TargetBox | null): boolean {
  if (a === null || b === null) return a === b
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height &&
    a.radius === b.radius
  )
}

function measure(el: HTMLElement): TargetBox {
  const { top, left, width, height } = el.getBoundingClientRect()
  return { top, left, width, height, radius: getComputedStyle(el).borderRadius }
}

/**
 * 안내가 비출 요소의 화면상 사각형. 튜토리얼이 열려 있는 동안 **프레임마다 다시 잰다**.
 *
 * 사각형이 바뀌는 경우가 넷이고(스텝 전환, 데려오는 스크롤이 도는 중, 회원의 스크롤과 회전,
 * 라우트가 바뀌어 요소가 아직 없다가 나타남), scroll, resize 리스너에 MutationObserver까지
 * 붙이면 네 가지를 각각 막게 된다. 루프 하나가 전부 덮는다(design D3).
 *
 * 값이 같으면 setState를 건너뛰므로 실제 리렌더는 움직일 때만 일어난다.
 *
 * **찾지 못하면 직전 사각형을 그대로 둔다.** 라우트가 바뀌는 순간 새 화면의 앵커는 아직 없는데,
 * 그때 null로 떨어뜨리면 스팟라이트가 사라지고 화면 전체가 어두워졌다가 말풍선이 가운데로
 * 튀었다가 다시 제자리로 온다. 한두 프레임짜리 깜빡임이지만 눈에 그대로 보인다.
 * 스팟라이트를 옛 자리에 두면 다음 프레임에 새 자리로 **미끄러져** 간다.
 */
export function useTargetRect(targetId: string | undefined): TargetBox | null {
  const [box, setBox] = useState<TargetBox | null>(null)

  useEffect(() => {
    if (!targetId) {
      setBox(null)
      return
    }
    let frame = 0
    const tick = () => {
      const el = document.getElementById(targetId)
      if (el) {
        const next = measure(el)
        setBox((prev) => (same(prev, next) ? prev : next))
      }
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [targetId])

  return box
}
