import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { CallbackPage } from './pages/CallbackPage'
import { CoachPage } from './pages/CoachPage'
import { HomePage } from './pages/HomePage'
import { LandingRoute } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { RecordsPage } from './pages/RecordsPage'
import { ReportPage } from './pages/ReportPage'
import { WeightPage } from './pages/WeightPage'
import { AppShell } from './shell/AppShell'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 앱은 /app 아래에만 산다 — manifest start_url이 /app이라 홈 화면 아이콘은 앱으로,
                검색·링크로 온 방문자는 루트의 랜딩으로 갈린다.
                옛 아이콘은 start_url이 `/`라 여기로 떨어지므로 LandingRoute가 한 번 더 거른다 */}
            <Route path="/" element={<LandingRoute />} />
            {/* 백엔드가 이 두 경로로 리다이렉트한다(OAuth2SuccessHandler·SecurityConfig) — 옮기면 백엔드도 같이 배포해야 한다 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route element={<RequireAuth />}>
              {/* 온보딩은 셸 밖 — 가드가 미완료 회원을 여기로 강제한다 */}
              <Route path="/app/onboarding" element={<OnboardingPage />} />
              {/* 완료 회원용 5탭 셸 */}
              <Route element={<AppShell />}>
                <Route path="/app" element={<HomePage />} />
                <Route path="/app/records" element={<RecordsPage />} />
                <Route path="/app/weight" element={<WeightPage />} />
                <Route path="/app/report" element={<ReportPage />} />
                <Route path="/app/ai-pt" element={<CoachPage />} />
                <Route path="/app/profile" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
