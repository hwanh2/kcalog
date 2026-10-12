import { isTossUpdateRequired } from '../api/client'
import { Button } from '../ui/form'
import { useAuth } from './useAuth'

/**
 * 토스 빌드에서 세션 복구가 실패했을 때. 토스 빌드에는 로그인 화면이 없어서 로그인으로 보낼 수 없다.
 * 원인은 대개 일시적이므로(네트워크, 앱인토스 API 장애) 다시 시도하는 길을 둔다.
 * 토스 앱이 익명 키 기능을 모르는 옛 버전이면 다시 시도해도 같으니 업데이트를 안내한다.
 */
export function SessionRetryScreen() {
  const { retrySession } = useAuth()
  const updateRequired = isTossUpdateRequired()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <p role="alert" className="text-base font-semibold text-ink">
        {updateRequired ? '토스 앱 업데이트가 필요해요' : '연결이 잠시 끊겼어요'}
      </p>
      <p className="text-sm text-muted">
        {updateRequired
          ? '토스 앱을 최신 버전으로 업데이트한 뒤 다시 열어 주세요.'
          : '네트워크 상태를 확인한 뒤 다시 시도해주세요.'}
      </p>
      <Button onClick={retrySession}>다시 시도</Button>
    </div>
  )
}
