import { Navigate, useSearchParams } from 'react-router'
import { kakaoLoginUrl } from '../api/auth'
import { useAuth } from '../auth/useAuth'

const ERROR_MESSAGES: Record<string, string> = {
  oauth: '카카오 로그인에 실패했어요. 다시 시도해주세요.',
  session: '로그인 세션을 만들지 못했어요. 다시 시도해주세요.',
}

export function LoginPage() {
  const { state } = useAuth()
  const [params] = useSearchParams()

  if (state.status === 'authed') {
    return <Navigate to="/" replace />
  }

  const error = params.get('error')

  return (
    <main>
      <h1>kcalog</h1>
      <p>사진 한 장으로 10초 안에 기록하는 체중 관리</p>
      {error && <p role="alert">{ERROR_MESSAGES[error] ?? '로그인에 실패했어요. 다시 시도해주세요.'}</p>}
      <a href={kakaoLoginUrl()}>카카오로 시작하기</a>
    </main>
  )
}
