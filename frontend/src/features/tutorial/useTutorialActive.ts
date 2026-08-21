import { useAuth } from '../../auth/useAuth'

/**
 * 앱 둘러보기가 열려 있는지. 오버레이와 셸이 **같은 판정을 봐야 한다**.
 *
 * 셸은 화면을 옮기면 맨 위로 올리고 안내는 비출 대상으로 스크롤한다. 둘이 각자 판단하면
 * 라우트가 바뀔 때 서로 스크롤을 빼앗아 어느 쪽이 이길지가 렌더 타이밍에 좌우된다(design D15).
 */
export function useTutorialActive(): boolean {
  const { state } = useAuth()
  return state.status === 'authed' && !state.member.tutorialCompleted
}
