import { NavLink, Outlet } from 'react-router'

const TABS = [
  { to: '/', label: '오늘', end: true },
  { to: '/records', label: '기록', end: false },
  { to: '/profile', label: '프로필', end: false },
] as const

/** 인증·온보딩 완료 회원용 3탭 셸. 콘텐츠는 <Outlet>, 하단 고정 탭 네비게이션 */
export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas">
      <main className="flex-1 px-4 pb-20 pt-4">
        <Outlet />
      </main>
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-gray-200 bg-surface"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-sm ${
                isActive ? 'font-semibold text-brand' : 'text-muted'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
