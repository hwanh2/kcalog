import { useEffect, useRef } from 'react'

/** 탭으로 갈 수 있는 요소 — disabled·숨김은 브라우저가 걸러주지 않으므로 직접 거른다 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 숨은 요소는 뺀다 — 예: `class="hidden"`인 파일 입력에 포커스가 가면 사용자는 아무것도 못 본다.
 * `offsetParent`로 판정하지 않는 이유: position:fixed 요소에서 null이 되고, 레이아웃을 계산하지
 * 않는 테스트 환경에서는 항상 null이라 "전부 숨김"으로 잘못 읽힌다.
 */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    const style = getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

/**
 * 모달 다이얼로그의 키보드·스크롤 규약을 한 곳에 모은다.
 *
 * - 열 때 시트 안으로 포커스를 옮긴다(첫 요소, 없으면 컨테이너)
 * - Esc로 닫는다
 * - Tab이 시트 안에서만 순환한다(뒤 배경으로 새지 않게)
 * - 닫을 때 열기 전 요소로 포커스를 되돌린다
 * - 열려 있는 동안 뒤 배경 스크롤을 잠근다
 *
 * 라이브러리를 쓰지 않는 이유는 design.md D5 — 시트가 하나뿐이라 의존성 비용이 더 크다.
 * 시트가 중첩되기 시작하면 이 훅을 다시 봐야 한다(지금은 중첩 경로가 없다).
 */
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  // 최신 onClose를 참조해, 콜백이 매 렌더 바뀌어도 리스너를 다시 붙이지 않는다
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const panel = ref.current
    if (!panel) return

    const restoreTo = document.activeElement as HTMLElement | null
    const first = focusableIn(panel)[0]
    if (first) first.focus()
    else panel.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return

      const items = focusableIn(panel)
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement

      // 양 끝에서 넘어가려 하면 반대쪽으로 감는다. 시트 밖에 있으면 다시 안으로 끌어온다.
      if (!panel.contains(active)) {
        event.preventDefault()
        firstItem.focus()
      } else if (event.shiftKey && active === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = bodyOverflow
      // 시트를 연 버튼이 아직 화면에 있으면 그리로 돌려준다
      if (restoreTo && document.contains(restoreTo)) restoreTo.focus()
    }
  }, [])

  return ref
}
