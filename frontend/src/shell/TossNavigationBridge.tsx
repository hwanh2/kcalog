import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { loadToss } from '../platform'
import { currentHistoryIndex, handleBack } from './backNavigation'

const PROFILE_PATH = '/app/profile'

/**
 * 토스 빌드에서만 마운트한다. 토스 내비바의 버튼을 앱에 연결한다.
 * - 뒤로가기: 앱의 처리 순서(시트, 화면, 히스토리, 종료)로 (D6)
 * - 기능 버튼(프로필): 프로필 화면으로 (D7)
 */
export function TossNavigationBridge() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // 구독은 한 번만 하고 현재 경로는 ref로 읽는다. 경로마다 다시 구독하면 그 사이에 누른 버튼을 놓친다
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    let cancelled = false
    const unsubscribes: Array<() => void> = []
    void loadToss().then((toss) => {
      if (cancelled) return
      unsubscribes.push(
        toss.subscribeBack(() => {
          handleBack({
            historyIndex: currentHistoryIndex(),
            goBack: () => navigate(-1),
            close: () => void toss.closeApp(),
          })
        }),
        toss.subscribeAccessory((id) => {
          // 이미 프로필이면 같은 화면을 히스토리에 또 쌓지 않는다. 쌓이면 뒤로가기를 두 번 눌러야 나간다
          if (id === 'profile' && pathnameRef.current !== PROFILE_PATH) navigate(PROFILE_PATH)
        }),
      )
    })
    return () => {
      cancelled = true
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [navigate])

  return null
}
