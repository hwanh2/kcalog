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
 * 열려 있는 다이얼로그 스택 — 나중에 열린 것이 뒤에 온다.
 *
 * 시트는 실제로 중첩된다: `AnalysisResultSheet`(자체가 Sheet)가 `ItemEditSheet`·
 * `FoodDraftSheet`를 자식으로 연다. 각 훅이 document에 리스너를 붙이므로,
 * 게이트가 없으면 **Esc 한 번에 바깥 시트까지 닫혀 편집하던 항목이 통째로 사라진다.**
 * 그래서 "맨 위 것만 처리한다"를 여기서 강제한다.
 */
const stack: symbol[] = []
/** 첫 다이얼로그가 열리기 전 body의 overflow — 마지막이 닫힐 때 이 값으로 되돌린다 */
let savedOverflow = ''

/**
 * 모달 다이얼로그의 키보드·스크롤 규약을 한 곳에 모은다.
 *
 * - 열 때 시트 안으로 포커스를 옮긴다(첫 요소, 없으면 컨테이너)
 * - Esc로 닫는다 — **맨 위 다이얼로그만**
 * - Tab이 시트 안에서만 순환한다(뒤 배경으로 새지 않게)
 * - 닫을 때 열기 전 요소로 포커스를 되돌린다
 * - 열려 있는 동안 뒤 배경 스크롤을 잠근다(중첩돼도 마지막 하나가 닫힐 때만 푼다)
 *
 * 라이브러리를 쓰지 않는 이유는 design.md D5 — 구조가 단순해 의존성 비용이 더 크다.
 */
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  // 최신 onClose를 참조해, 콜백이 매 렌더 바뀌어도 리스너를 다시 붙이지 않는다
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const panel = ref.current
    if (!panel) return

    const id = Symbol('dialog')
    stack.push(id)

    const restoreTo = document.activeElement as HTMLElement | null
    const first = focusableIn(panel)[0]
    if (first) first.focus()
    else panel.focus()

    function onKeyDown(event: KeyboardEvent) {
      // 맨 위 다이얼로그가 아니면 아무것도 하지 않는다
      if (stack[stack.length - 1] !== id) return

      if (event.key === 'Escape') {
        event.preventDefault()
        // document에 붙은 형제 리스너까지 막으려면 stopPropagation으로는 부족하다
        event.stopImmediatePropagation()
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
    // 스크롤 잠금은 **처음 열린 다이얼로그만** 걸고 마지막이 닫힐 때 푼다.
    // 각자 걸었다 풀면 cleanup 순서에 결과가 좌우된다(중첩 시 안쪽이 먼저 풀어버릴 수 있다).
    if (stack.length === 1) {
      savedOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const at = stack.lastIndexOf(id)
      if (at !== -1) stack.splice(at, 1)
      if (stack.length === 0) document.body.style.overflow = savedOverflow
      // 시트를 연 버튼이 아직 화면에 있으면 그리로 돌려준다
      if (restoreTo && document.contains(restoreTo)) restoreTo.focus()
    }
  }, [])

  return ref
}
