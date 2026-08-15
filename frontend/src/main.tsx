import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { rememberInstallPrompt } from './install/useInstallState'

// beforeinstallprompt는 React가 마운트되기 전에 올 수 있다 — 여기서 먼저 붙잡아 두지 않으면
// 랜딩에 원-탭 설치 버튼 대신 수동 안내가 뜬다(설치는 되지만 한 단계 나빠진다).
window.addEventListener('beforeinstallprompt', rememberInstallPrompt)

// 확대·축소 잠금 ③/③ — iOS Safari는 iOS 10부터 user-scalable=no를 **의도적으로 무시한다**.
// 브라우저 탭에서 연 경우 핀치를 막을 수단은 이 제스처 이벤트뿐이다(홈 화면 실행은 메타로 막힌다).
// passive: false — 기본값이면 preventDefault가 무시된다. 세 겹이 한 벌이다(design D5)
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
