import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { CallbackPage } from './pages/CallbackPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { RecordsPage } from './pages/RecordsPage'
import { AppShell } from './shell/AppShell'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route element={<RequireAuth />}>
              {/* 온보딩은 셸 밖 — 가드가 미완료 회원을 여기로 강제한다 */}
              <Route path="/onboarding" element={<OnboardingPage />} />
              {/* 완료 회원용 3탭 셸 */}
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/records" element={<RecordsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
