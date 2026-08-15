import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { rememberInstallPrompt } from './install/useInstallState'

// beforeinstallprompt는 React가 마운트되기 전에 올 수 있다 — 여기서 먼저 붙잡아 두지 않으면
// 랜딩에 원-탭 설치 버튼 대신 수동 안내가 뜬다(설치는 되지만 한 단계 나빠진다).
window.addEventListener('beforeinstallprompt', rememberInstallPrompt)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
