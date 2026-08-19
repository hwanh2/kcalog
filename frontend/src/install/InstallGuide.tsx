import type { ReactNode } from 'react'
import type { InstallState } from './useInstallState'

interface Props {
  state: InstallState
  onInstall: () => void
}

/**
 * 기기별 설치 안내. **그 기기에서 실제로 되는 방법만** 보여준다.
 *
 * iOS는 설치를 트리거하는 API가 없어 사용자가 직접 제스처를 해야 하고, 그 제스처를 가르치는
 * 것이 이 화면의 전부다. 글로만 쓰면 공유 버튼이 어디 있는지 몰라 매 단계에서 이탈하므로
 * **눌러야 할 곳을 그림으로 가리킨다.**
 *
 * 설치된 상태에서는 아무것도 렌더하지 않는다 — 판정은 useInstallState 한 곳에서만 한다.
 */
export function InstallGuide({ state, onInstall }: Props) {
  if (state === 'installed') return null

  // scroll-mt — 고정 헤더가 제목을 덮지 않게 헤더 높이만큼 띄운다
  return (
    <section id="install" className="scroll-mt-24">
      <h2 className="text-balance text-2xl font-extrabold sm:text-3xl">
        {state === 'in-app' ? '먼저 브라우저에서 열어주세요' : '홈 화면에 추가하기'}
      </h2>
      <p className="mt-2 text-pretty text-muted">
        {state === 'in-app'
          ? '지금 보고 계신 건 카카오톡 같은 앱 안에 들어 있는 브라우저입니다. 여기서는 홈 화면 추가가 막혀 있어요.'
          : '앱처럼 전체 화면으로 열립니다. 설치 파일도, 용량도 없습니다.'}
      </p>

      <div className="mt-5 rounded-card bg-surface p-5 shadow-sm sm:p-6">
        {state === 'in-app' && (
          <div className="space-y-5">
            <PointerFrame label="오른쪽 위 ⋯" position="right">
              <BrowserChrome />
            </PointerFrame>
            <ol className="space-y-4">
              <Step n="1" title="오른쪽 위 ⋯ 메뉴 열기">아래쪽에 있는 경우도 있습니다.</Step>
              <Step n="2" title="‘다른 브라우저로 열기’ 선택">Safari나 Chrome을 고르면 됩니다.</Step>
              <Step n="3" title="이 페이지가 다시 열리면">기기에 맞는 설치 방법이 여기 나옵니다.</Step>
            </ol>
          </div>
        )}

        {state === 'installable' && (
          <div className="text-center">
            <p className="text-muted">이 브라우저는 버튼 하나로 설치할 수 있어요.</p>
            <button
              type="button"
              onClick={onInstall}
              className="mx-auto mt-5 flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-tile bg-brand px-6 font-bold text-on-brand transition-colors hover:bg-brand-dark touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
            >
              <DownloadIcon />앱 설치
            </button>
          </div>
        )}

        {state === 'ios' && (
          <div className="space-y-5">
            <PointerFrame label="화면 아래 공유 버튼" position="center">
              <SafariBar />
            </PointerFrame>
            <ol className="space-y-4">
              <Step n="1" title="공유 버튼 누르기">화면 아래 가운데(아이패드는 위쪽)에 있습니다.</Step>
              <Step n="2" title="‘홈 화면에 추가’ 선택">메뉴를 아래로 한참 내려야 나옵니다.</Step>
              <Step n="3" title="오른쪽 위 ‘추가’">홈 화면에 칼로그 아이콘이 생깁니다.</Step>
            </ol>
          </div>
        )}

        {state === 'android' && (
          <div className="space-y-5">
            <PointerFrame label="오른쪽 위 ⋮" position="right">
              <BrowserChrome />
            </PointerFrame>
            <ol className="space-y-4">
              <Step n="1" title="브라우저 메뉴 열기">오른쪽 위 점 세 개 아이콘입니다.</Step>
              <Step n="2" title="‘앱 설치’ 선택">‘홈 화면에 추가’로 표시되기도 합니다.</Step>
              <Step n="3" title="설치 확인">홈 화면에 칼로그 아이콘이 생깁니다.</Step>
            </ol>
          </div>
        )}

        {state === 'desktop' && (
          <div className="flex flex-col items-center text-center">
            <img
              src="/qr-install.png"
              alt="칼로그 설치 안내 페이지 QR 코드"
              width={176}
              height={176}
              loading="lazy"
              className="rounded-2xl border border-border"
            />
            <p className="mt-5 text-lg font-bold">휴대폰으로 스캔하세요</p>
            <p className="mt-1.5 text-pretty text-muted">
              끼니마다 사진을 찍는 앱이라 휴대폰에서 씁니다. 카메라로 QR을 비추면 이 안내가 열립니다.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

/** 브라우저 막대 그림 + 눌러야 할 곳을 가리키는 화살표 */
function PointerFrame({
  label,
  position,
  children,
}: {
  label: string
  position: 'center' | 'right'
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-track p-4">
      <div className={`flex ${position === 'right' ? 'justify-end pr-2' : 'justify-center'}`}>
        <span className="flex flex-col items-center">
          <span className="text-xs font-bold text-brand-ink">{label}</span>
          <ArrowDown />
        </span>
      </div>
      {children}
    </div>
  )
}

/** iOS 브라우저 하단 막대 — 가운데 공유 버튼을 강조한다 */
function SafariBar() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 shadow-sm">
      <BarIcon>‹</BarIcon>
      <BarIcon>›</BarIcon>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-ink ring-2 ring-brand">
        <ShareIcon />
      </span>
      <BarIcon>▤</BarIcon>
      <BarIcon>⧉</BarIcon>
    </div>
  )
}

/** 안드로이드·인앱 브라우저 상단 막대 — 오른쪽 메뉴를 강조한다 */
function BrowserChrome() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 shadow-sm">
      <span className="min-w-0 flex-1 truncate rounded-full bg-track px-3 py-1 text-xs text-muted">
        kcalog.site
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-ink ring-2 ring-brand">
        <MoreIcon />
      </span>
    </div>
  )
}

function BarIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center text-lg text-muted" aria-hidden="true">
      {children}
    </span>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black text-on-brand">
        {n}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-pretty text-sm text-muted">{children}</span>
      </span>
    </li>
  )
}

/* 아이콘 — 인라인 SVG(라이브러리 없음, lucide 형태 참고) */
function ArrowDown() {
  return (
    <svg className="animate-bounce text-brand" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v11" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  )
}
