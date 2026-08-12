import { Link, NavLink, Outlet, useLocation } from 'react-router'

const TABS = [
  { to: '/', label: '홈', end: true, icon: HomeIcon },
  { to: '/records', label: '음식기록', end: false, icon: MealIcon },
  { to: '/weight', label: '체중', end: false, icon: ScaleIcon },
  { to: '/report', label: '리포트', end: false, icon: ChartIcon },
  { to: '/ai-pt', label: 'AI PT', end: false, icon: BotIcon },
] as const

/** 인증·온보딩 완료 회원용 셸 — 상단 헤더 + 하단 5탭 + 우하단 카메라 FAB (v2 목업 기준).
    FAB은 촬영 화면에서는 숨긴다(목업과 동일) */
export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-dark to-brand text-sm font-black text-on-brand">
            K
          </div>
          <div>
            <p className="text-base font-extrabold leading-none tracking-tight">
              kcalog<span className="text-brand">.ai</span>
            </p>
            <p className="text-[10px] font-medium text-muted">AI 식단 · 탄단지 코칭</p>
          </div>
        </div>
        <Link
          to="/profile"
          className="flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-muted"
        >
          <UserIcon />
          프로필
        </Link>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      {/* 등록 경로는 음식기록 탭 하나로 모은다 — FAB은 그 탭으로 보내며 촬영을 바로 연다(design D13) */}
      {pathname !== '/records' && (
        <Link
          to="/records?camera=1"
          aria-label="식사 촬영"
          className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-brand-dark to-brand text-on-brand shadow-xl"
        >
          <CameraIcon />
        </Link>
      )}

      {/* 위쪽 모서리만 둥글게 — 아래는 화면 끝에 붙으므로 라운드가 필요 없다. 경계는 선 대신 그림자로 */}
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-stretch rounded-t-card bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] ${
                  isActive ? 'font-extrabold text-brand' : 'font-bold text-muted'
                }`
              }
            >
              <Icon />
              {tab.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

/* 아이콘 — 인라인 SVG(라이브러리 없음, lucide 형태 참고), 라벨 텍스트가 있으므로 장식 취급 */
function HomeIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5V21H3z" />
      <path d="M9 21v-6h6v6" />
    </svg>
  )
}

function MealIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* 포크 — 바깥 두 갈래 + 가운데 갈래가 손잡이로 */}
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      {/* 나이프 — 칼날(닫힘) + 손잡이 */}
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
      <path d="M21 15v7" />
    </svg>
  )
}

function ScaleIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 9a6 6 0 0 1 8 0l-2.2 2.4a3 3 0 0 0-3.6 0z" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 20V10M12 20V4M19 20v-8" />
    </svg>
  )
}

function BotIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4M8 4h8" />
      <circle cx="9" cy="14" r="0.5" fill="currentColor" />
      <circle cx="15" cy="14" r="0.5" fill="currentColor" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
