import { Navigate, useSearchParams } from 'react-router'
import { kakaoLoginUrl } from '../api/auth'
import { APP_ROOT } from '../auth/landingPath'
import { useAuth } from '../auth/useAuth'
import { AppMark } from '../ui/AppMark'

const ERROR_MESSAGES: Record<string, string> = {
  oauth: '카카오 로그인에 실패했어요. 다시 시도해주세요.',
  session: '로그인 세션을 만들지 못했어요. 다시 시도해주세요.',
}

export function LoginPage() {
  const { state } = useAuth()
  const [params] = useSearchParams()

  if (state.status === 'authed') {
    return <Navigate to={APP_ROOT} replace />
  }

  const error = params.get('error')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      {/* 상자를 가운데 두면 로고 몸통이 오른쪽에 앉는다 — 왼쪽 잔상이 상자 폭을 늘리지만
          옅고 흩어져 있어 시각적 무게는 그만큼 되지 않는다. 잉크 무게중심만큼 되민다.
          4.6%는 마크에서 실측한 값이다 — 잔상을 고치면 다시 재야 한다 */}
      <AppMark className="h-16 w-auto -translate-x-[4.6%]" />
      <h1 className="mt-4 text-3xl font-bold text-brand-ink">칼로그</h1>
      <p className="mt-2 text-muted">내 몸에 맞는 하루 섭취량부터</p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {ERROR_MESSAGES[error] ?? '로그인에 실패했어요. 다시 시도해주세요.'}
        </p>
      )}
      <a
        href={kakaoLoginUrl()}
        className="mt-8 w-full rounded-md bg-[#FEE500] py-3 font-medium text-[#191600]"
      >
        카카오로 시작하기
      </a>
    </main>
  )
}
