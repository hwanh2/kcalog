import { useEffect, useRef, useState } from 'react'

/** 이만큼 당기면 놓았을 때 새로고침한다 (px) */
const THRESHOLD = 64
/** 손가락이 간 거리를 그대로 따라가면 화면이 훌렁 내려간다 — 절반만 따라간다 */
const RESISTANCE = 0.5
/** 당김 표시가 내려올 수 있는 최대 거리 — 여기서 더 끌어도 늘어나지 않는다 */
const MAX_PULL = 96
/**
 * 새로고침이 도는 동안 표시를 세워두는 자리. 임계점(64)에 그대로 두면 표시가 **첫 카드 위에 얹혀**
 * 무엇을 다시 불러오는 중인지 가린다. 헤더 바로 아래, 내용 위에 뜨는 자리로 조금 올린다.
 */
const REFRESH_PARK = 52

export interface PullState {
  /** 지금 끌려 내려온 거리(px). 0이면 당기고 있지 않다 */
  distance: number
  /** 놓으면 새로고침되는 지점을 넘겼는가 */
  armed: boolean
  /** 새로고침이 도는 중 */
  refreshing: boolean
}

/**
 * 당겨서 새로고침.
 *
 * 홈 화면에서 띄운 앱(standalone)에는 **브라우저의 새로고침이 없다.** 주소창도, 브라우저가 주는
 * 당겨서 새로고침도 없어서 지금은 탭을 옮겼다 돌아오는 것 말고는 다시 불러올 방법이 없다.
 *
 * 문서 스크롤이 맨 위일 때만 시작한다 — 그 아래에서는 평범한 스크롤이어야 한다.
 */
export function usePullToRefresh(
  /** 스크롤 영역(보통 `<main>`). 여기서 시작한 터치만 본다 */
  targetRef: { current: HTMLElement | null },
  onRefresh: () => Promise<unknown>,
): PullState {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  /*
    제스처 도중에만 쓰는 값들은 ref에 둔다 — 바뀔 때마다 다시 그릴 이유가 없고,
    리스너는 한 번만 붙이므로 이펙트 안에서 **최신 값을 읽을 방법**이 필요하다.
  */
  const startYRef = useRef<number | null>(null)
  const pulledRef = useRef(0)
  const refreshingRef = useRef(false)
  const refreshRef = useRef(onRefresh)
  refreshingRef.current = refreshing
  refreshRef.current = onRefresh

  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    function forget() {
      startYRef.current = null
      pulledRef.current = 0
    }

    function start(event: TouchEvent) {
      if (refreshingRef.current || event.touches.length !== 1) return
      if (window.scrollY > 0) return
      if (!eligible(event.target)) return
      startYRef.current = event.touches[0].clientY
    }

    function move(event: TouchEvent) {
      const startY = startYRef.current
      if (startY == null) return

      const delta = event.touches[0].clientY - startY
      if (delta <= 0) {
        // 위로 올리기 시작하면 평범한 스크롤로 돌려준다
        forget()
        setDistance(0)
        return
      }

      /*
        여기서 preventDefault를 해야 iOS의 고무줄 튕김과 겹치지 않는다.
        그래서 리스너를 `passive: false`로 붙인다 — 기본값이면 preventDefault가 무시된다.
      */
      if (event.cancelable) event.preventDefault()
      const next = Math.min(MAX_PULL, delta * RESISTANCE)
      pulledRef.current = next
      setDistance(next)
    }

    function end() {
      const far = pulledRef.current >= THRESHOLD
      forget()
      if (!far || refreshingRef.current) {
        setDistance(0)
        return
      }
      setRefreshing(true)
      // 표시가 남아 있어야 도는 게 보인다 — 내용을 가리지 않는 자리에 세워둔다
      setDistance(REFRESH_PARK)
      void Promise.resolve(refreshRef.current())
        .catch(() => undefined) // 실패는 각 화면이 자기 자리에서 알린다
        .finally(() => {
          setRefreshing(false)
          setDistance(0)
        })
    }

    function cancel() {
      forget()
      setDistance(0)
    }

    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', cancel)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', cancel)
    }
  }, [targetRef])

  return { distance, armed: distance >= THRESHOLD, refreshing }
}

/**
 * 이 터치가 화면 전체를 당기는 것으로 볼 수 있는가.
 *
 * - 시트(`role="dialog"`) 안에서 당기는 것은 시트의 일이다. 시트는 화면 위에 떠 있어 뒤 문서는
 *   맨 위에 있지만, 그렇다고 뒤 화면을 새로고침할 이유는 없다.
 * - 자기 스크롤을 가진 영역(AI PT 대화 등)이 내려가 있으면 그쪽 스크롤이 먼저다.
 */
function eligible(target: EventTarget | null): boolean {
  let node = target instanceof Element ? target : null
  while (node) {
    if (node.getAttribute('role') === 'dialog') return false
    if (node.scrollHeight > node.clientHeight && node.scrollTop > 0) return false
    node = node.parentElement
  }
  return true
}
