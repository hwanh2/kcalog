import { useEffect, useRef } from 'react'
import { closeTopDialog } from '../ui/useDialog'

/**
 * 토스 내비바 뒤로가기(와 Android 백버튼)의 처리 순서 (add-apps-in-toss D6).
 * SDK의 backEvent를 구독하면 기본 뒤로가기가 꺼지므로 앱이 전부 맡는다.
 *
 * 1. 열린 시트가 있으면 맨 위 것을 닫는다
 * 2. 화면이 등록한 처리(온보딩 단계 되돌리기)를 최근 것부터 부른다
 * 3. 앱 안에 이전 화면이 있으면 돌아간다
 * 4. 없으면 미니앱을 닫는다. 첫 화면에서 뒤로가기는 종료여야 한다(출시 체크리스트)
 */
const handlers: Array<() => boolean> = []

export function handleBack({
  historyIndex,
  goBack,
  close,
}: {
  historyIndex: number
  goBack: () => void
  close: () => void
}): 'dialog' | 'screen' | 'history' | 'close' {
  if (closeTopDialog()) return 'dialog'
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) return 'screen'
  }
  if (historyIndex > 0) {
    goBack()
    return 'history'
  }
  close()
  return 'close'
}

/**
 * react-router가 history.state에 남기는 위치 순번. 진입 직후가 0이고 replace로 옮겨도 그대로다.
 * location.key로 판별하지 않는 이유: 진입하자마자 `/`에서 `/app`으로 replace하면 key가 바뀌어 첫 화면을 못 알아본다.
 */
export function currentHistoryIndex(): number {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx
  return typeof idx === 'number' ? idx : 0
}

/** 뒤로가기를 화면이 먼저 받는다. handler가 true를 돌려주면 처리 끝, null이면 등록하지 않는다 */
export function useBackHandler(handler: (() => boolean) | null) {
  const ref = useRef(handler)
  ref.current = handler
  const enabled = handler !== null

  useEffect(() => {
    if (!enabled) return
    const entry = () => ref.current?.() ?? false
    handlers.push(entry)
    return () => {
      const at = handlers.lastIndexOf(entry)
      if (at !== -1) handlers.splice(at, 1)
    }
  }, [enabled])
}
