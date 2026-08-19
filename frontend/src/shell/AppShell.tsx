import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { tapHaptic } from '../lib/haptics'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { AppMark } from '../ui/AppMark'
import { PullIndicator } from '../ui/PullIndicator'
import { UserIcon } from '../ui/icons'

const TABS = [
  { to: '/app', label: '홈', end: true, icon: HomeIcon },
  { to: '/app/records', label: '음식기록', end: false, icon: MealIcon },
  { to: '/app/weight', label: '체중', end: false, icon: ScaleIcon },
  { to: '/app/report', label: '리포트', end: false, icon: ChartIcon },
  { to: '/app/ai-pt', label: 'AI PT', end: false, icon: BotIcon },
] as const

/** 인증·온보딩 완료 회원용 셸 — 상단 헤더 + 하단 5탭 + 우하단 카메라 FAB (v2 목업 기준).
    FAB은 촬영 화면에서는 숨긴다(목업과 동일) */
export function AppShell() {
  const { pathname } = useLocation()
  const isRecords = pathname === '/app/records'

  /*
    화면을 옮기면 맨 위에서 시작한다. 브라우저는 전체 문서 스크롤을 그대로 두므로,
    긴 홈을 내려보다 "전체보기"를 누르면 도착한 화면이 **중간에서 시작한다** —
    새 화면인데 이미 지나간 것처럼 보인다. SPA에서는 이걸 직접 해줘야 한다.
  */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  /*
    당겨서 새로고침 — 홈 화면에서 띄운 앱에는 주소창도, 브라우저가 주는 당겨서 새로고침도 없다.
    지금까지 다시 불러올 방법은 탭을 옮겼다 돌아오는 것뿐이었다.

    셸에 한 번만 둔다. 화면마다 붙이면 새로 만드는 탭에서 빠뜨리고, 무엇을 다시 부를지도
    화면마다 달리 적게 된다. **지금 화면이 쓰고 있는 조회를 전부** 다시 부르면 그 판단이 필요 없다.
  */
  const mainRef = useRef<HTMLElement>(null)
  const queryClient = useQueryClient()
  const pull = usePullToRefresh(mainRef, () => queryClient.refetchQueries({ type: 'active' }))

  return (
    /* overflow-x-clip — 가로로 끌려가지 않게 하는 안전망. `html`에도 같은 선언이 있지만
       루트의 overflow는 뷰포트로 전파되는 규칙을 타고, WebKit은 `clip` 전파를 지키지 않는다.
       그래서 **일반 요소**인 여기서 한 번 더 자른다(design D27).
       `clip`은 스크롤 컨테이너를 만들지 않아 sticky 헤더가 살아 있고, 바텀시트 같은
       fixed 자식도 자르지 않는다 — 둘 다 실제로 렌더해 확인했다. */
    <div className="mx-auto flex min-h-dvh max-w-md flex-col overflow-x-clip bg-canvas">
      {/*
        음식기록 탭에서는 헤더를 감춘다 — 그 화면은 끼니 탭이 첫 줄이고(design D18),
        그 위에 서비스명 줄까지 얹으면 기록 목록과 "지금 추가하기"가 그만큼 아래로 밀린다.
        프로필 진입은 다른 네 탭에 그대로 있다.
      */}
      {!isRecords && (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AppMark className="h-8 w-auto" />
            {/* 서비스명 한 줄만 — 부제는 모든 화면 맨 위를 상시로 차지해 본문을 밀어냈다(app-shell 스펙) */}
            <p className="text-base font-extrabold leading-none tracking-tight">칼로그</p>
          </div>
          {/*
            아이콘만 — 음식기록 날짜 머리의 프로필과 같은 크기·자리라 탭을 옮겨도 손이 같은 곳으로 간다.
            프로필 화면에서는 아예 감춘다: 이미 그 화면인데 같은 곳으로 가는 버튼이 남아 있을 이유가 없다.
          */}
          {pathname !== '/app/profile' && (
            <Link
              to="/app/profile"
              aria-label="프로필"
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
            >
              <UserIcon />
            </Link>
          )}
        </header>
      )}

      {/*
        아래 여백은 하단 내비 높이 + 안전 영역이다. 고정값(pb-24)만 두면 내비가
        `env(safe-area-inset-bottom)`만큼 더 두꺼워지는 기기(노치 계열)에서 마지막 카드가 가려진다.
      */}
      {/*
        relative — 당김 표시가 본문 위에 겹쳐 뜬다. 자리를 차지하면 당길 때마다 내용이 밀린다.

        ⚠️ 본문 자체는 **옮기지 않는다.** 손끝을 따라 내려오면 더 붙어 보이겠지만, `transform`이
        걸린 요소는 `position: fixed` 자식의 기준이 되어 **바텀시트가 화면이 아니라 본문 기준으로
        떠버린다.** 표시 하나만 움직여도 당기고 있다는 건 충분히 읽힌다.
      */}
      <main ref={mainRef} className="relative flex-1 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <PullIndicator {...pull} />
        <Outlet />
      </main>

      {/* 등록 경로는 음식기록 탭 하나로 모은다 — FAB은 그 탭으로 보내며 촬영을 바로 연다(design D13) */}
      {!isRecords && (
        <Link
          to="/app/records?camera=1"
          aria-label="식사 촬영"
          /* 아래 여백은 내비 높이(55px) + 안전 영역 + 한 칸 띄움이다. 고정값(bottom-20 = 80px)만
             두면 `env(safe-area-inset-bottom)`이 있는 기기에서 내비가 89px까지 두꺼워져 FAB이
             그 위에 얹힌다 — 본문 아래 여백과 같은 함정이다(design D24) */
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-brand-dark to-brand text-on-brand shadow-xl touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
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
              // 누른 순간 답한다 — 진동(되는 기기에서)과 눌림, 둘 다 화면이 바뀌기 전에 온다
              onClick={tapHaptic}
              className={({ isActive }) =>
                // min-h-11 — 탭 대상 44px (아이콘·라벨 크기는 그대로)
                `press flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-ink ${
                  isActive ? 'font-extrabold text-brand-ink' : 'font-bold text-muted'
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

function CameraIcon() {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
