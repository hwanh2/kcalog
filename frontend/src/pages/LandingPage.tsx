import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link, Navigate } from 'react-router'
import { APP_ROOT } from '../auth/landingPath'
import { AppPreview } from '../features/landing/AppPreview'
import { Reveal } from '../features/landing/Reveal'
import { ScanPhone } from '../features/landing/ScanPhone'
import { useSmoothScroll } from '../features/landing/useSmoothScroll'
import { InstallGuide } from '../install/InstallGuide'
import { AppMark } from '../ui/AppMark'
import { isStandalone, useInstallState } from '../install/useInstallState'

/**
 * 루트(`/`)의 진입 — **홈 화면 아이콘으로 들어왔으면 소개를 건너뛰고 앱으로 보낸다.**
 *
 * manifest의 `start_url: '/app'`만으로는 이 요구사항을 지킬 수 없다. 그 값은 **설치 시점에 박히고**,
 * 이미 설치된 아이콘에는 옛 값(`/`)이 남아 있다 — iOS는 재설치 말고는 갱신되지 않고,
 * 안드로이드도 WebAPK가 갱신될 때까지 하루 남짓 옛 값을 쓴다. 그동안 아이콘을 누르면
 * 주소창 없는 전체 화면에 **앱 대신 소개 페이지**가 뜬다(이미 설치한 사람에게 "홈 화면에 추가하세요"까지).
 *
 * 여기서 한 번 걸러두면 `start_url`을 앞으로 또 옮겨도 안전하다.
 * 훅을 부르기 전에 갈라야 하므로 껍데기를 따로 둔다 — 본문(LandingPage)은 훅을 여럿 쓴다.
 */
export function LandingRoute() {
  if (isStandalone()) return <Navigate to={APP_ROOT} replace />
  return <LandingPage />
}

const FEATURES = [
  {
    icon: <CameraIcon />,
    title: '찍으면 끝나는 식사 기록',
    body: '찍으면 AI가 무슨 음식인지 읽고 칼로리와 탄단지를 계산해 넣어줍니다. 검색도, 그램 수 입력도 없습니다.',
  },
  {
    icon: <ScaleIcon />,
    title: '체중과 주간 리포트',
    body: '매일 체중을 남기면 흐름을 그려주고, 한 주가 끝나면 무엇이 달라졌는지 정리해줍니다.',
  },
  {
    icon: <BotIcon />,
    title: 'AI 코치',
    body: '기록을 바탕으로 오늘 뭘 더 먹으면 좋을지, 무엇이 모자란지 알려줍니다.',
  },
] as const

const STEPS = [
  { n: '01', title: '식사 사진을 찍는다', body: '카메라 버튼 한 번. 접시를 통째로 담아도 됩니다.' },
  { n: '02', title: 'AI가 읽는다', body: '음식 이름과 양을 추정해 칼로리·탄단지를 계산합니다.' },
  { n: '03', title: '확인하고 저장', body: '틀린 항목만 고치면 끝. 평균 10초입니다.' },
] as const

const SCREENS = [
  { screen: 'home' as const, title: '홈', body: '오늘 남은 칼로리와 탄단지' },
  { screen: 'record' as const, title: '음식기록', body: '사진에서 찾은 음식과 칼로리' },
  { screen: 'weight' as const, title: '체중', body: '흔들리는 기록 위의 추세선' },
  { screen: 'coach' as const, title: 'AI PT', body: '기록을 읽고 답하는 코치' },
] as const

/** 화면을 조금씩 다르게 눕혀 늘어놓는다 — 나란히 세우면 스크린샷 나열처럼 보인다 */
const TILT = [-4, 2.5, -2, 3.5] as const

const FAQ = [
  {
    q: '무료인가요?',
    a: '네. 지금은 모든 기능이 무료입니다. AI 분석에는 한 사람당 하루 사용량 제한이 있습니다.',
  },
  {
    q: '앱스토어에 없나요?',
    a: '웹앱이라 스토어를 거치지 않습니다. 홈 화면에 추가하면 아이콘이 생기고 앱처럼 전체 화면으로 열립니다. 설치 파일을 받지 않으니 용량도 차지하지 않습니다.',
  },
  {
    q: '찍은 사진은 어디에 저장되나요?',
    a: '본인 계정에만 연결되어 저장되고 다른 사람에게 공개되지 않습니다.',
  },
  {
    q: '얼마나 정확한가요?',
    a: 'AI 추정치라 완벽하지 않습니다. 음식 이름도 양도 그 자리에서 고칠 수 있게 만들어 두었습니다.',
  },
  {
    q: '로그인은 어떻게 하나요?',
    a: '카카오 로그인만 지원합니다.',
  },
] as const

/**
 * 비회원 진입 화면. 검색·링크·QR로 온 방문자가 처음 만나는 화면이다.
 * 앱 자체는 /app 아래에 있고, manifest start_url이 /app이라 홈 화면 아이콘은 여기를 거치지 않는다.
 *
 * 앱(5탭 셸)은 폰 너비(max-w-md)로 고정하지만 **이 화면만 전폭 반응형이다** —
 * 데스크톱에서 링크를 받아 서비스를 훑어보는 것이 이 화면의 일이기 때문이다.
 */
export function LandingPage() {
  const { state, promptInstall } = useInstallState()
  const scrolled = useScrolled(80)
  useSmoothScroll()

  const cta =
    state === 'installed' ? (
      <Link to={APP_ROOT} className={CTA_CLASS}>
        앱 열기
      </Link>
    ) : state === 'installable' ? (
      <button type="button" onClick={promptInstall} className={CTA_CLASS}>
        앱 설치하기
      </button>
    ) : (
      <a href="#install" className={CTA_CLASS}>
        홈 화면에 추가하기
      </a>
    )

  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas">
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
          scrolled ? 'border-b border-border bg-canvas/85 backdrop-blur' : ''
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2">
            <AppMark className="h-8 w-8" />
            <span
              className={`text-lg font-extrabold tracking-tight transition-colors ${
                scrolled ? 'text-ink' : 'text-on-brand'
              }`}
            >
              kcalog
            </span>
          </span>
          {state === 'installed' ? (
            <Link to={APP_ROOT} className={navLinkClass(scrolled)}>
              앱 열기
            </Link>
          ) : (
            <a href="#install" className={navLinkClass(scrolled)}>
              설치 방법
            </a>
          )}
        </div>
      </header>

      <main>
        {/* 히어로 — 화면을 가득 채우는 어두운 면. 배경 얼룩이 아주 느리게 떠다닌다 */}
        <section className="relative flex min-h-dvh items-center overflow-hidden bg-ink">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.22),transparent_60%)]"
          />
          <div
            aria-hidden="true"
            className="animate-drift pointer-events-none absolute -left-40 -top-32 h-[36rem] w-[36rem] rounded-full bg-brand/25 blur-[120px]"
          />
          <div
            aria-hidden="true"
            className="animate-drift pointer-events-none absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-carb/20 blur-[110px]"
            style={{ animationDelay: '-7s' }}
          />

          <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-24 pt-32 lg:grid-cols-[1.1fr_auto] lg:gap-16">
            <div className="text-center lg:text-left">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-canvas/15 bg-canvas/10 px-3.5 py-1.5 text-xs font-bold text-canvas/80 backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                  </span>
                  설치 파일 없이 홈 화면에 추가
                </span>
              </Reveal>

              <Reveal delayMs={80}>
                <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.08] tracking-tighter text-on-brand sm:text-6xl lg:text-7xl">
                  사진 한 장으로
                  <br />
                  <span className="bg-gradient-to-r from-brand to-carb bg-clip-text text-transparent">
                    10초 만에
                  </span>{' '}
                  기록
                </h1>
              </Reveal>

              <Reveal delayMs={160}>
                <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-canvas/70 lg:mx-0 lg:text-xl">
                  찍으면 AI가 음식을 읽고 칼로리와 탄·단·지를 계산합니다.
                  <br className="hidden sm:block" />
                  체중, 주간 리포트, AI 코치까지 한 앱에서.
                </p>
              </Reveal>

              <Reveal delayMs={240}>
                <div className="mt-10 flex justify-center lg:justify-start">{cta}</div>
              </Reveal>
            </div>

            {/* 앱 화면 — 살짝 눕혀 두고 뒤에 빛을 깐다 */}
            <Reveal delayMs={200} className="flex justify-center">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-10 rounded-full bg-brand/25 blur-[80px]"
                />
                <div className="relative transition-transform duration-700 ease-out lg:[transform:perspective(1400px)_rotateY(-14deg)_rotateX(6deg)] lg:hover:[transform:perspective(1400px)_rotateY(-6deg)_rotateX(2deg)]">
                  <AppPreview className="ring-1 ring-canvas/20" />
                </div>
              </div>
            </Reveal>
          </div>

          <a
            href="#flow"
            aria-label="아래로 이동"
            className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 rounded-full p-2 text-canvas/50 transition-colors hover:text-canvas focus-visible:ring-2 focus-visible:ring-brand sm:block"
          >
            <span className="block animate-bounce">
              <ChevronDownIcon />
            </span>
          </a>
        </section>

        {/* 찍는 순간과 그 뒤에 벌어지는 일 — 화면 하나와 단계를 나란히 둔다 */}
        <section
          id="flow"
          className="relative w-full scroll-mt-20 overflow-hidden bg-canvas py-24 sm:py-28"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-24 h-96 w-96 rounded-full bg-brand/10 blur-[100px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[auto_1fr] lg:gap-20">
            <Reveal className="flex justify-center">
              <ScanPhone />
            </Reveal>

            <div>
              <Reveal>
                <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                  찍고 나서 벌어지는 일
                </h2>
                <p className="mt-4 text-pretty text-lg leading-relaxed text-muted">
                  검색창도, 그램 수 입력도 없습니다. 세 단계면 오늘 한 끼가 들어갑니다.
                </p>
              </Reveal>

              {/* 왼쪽 세로선으로 단계를 잇는다 — 나란한 3칸 그리드보다 "흐름"이 읽힌다 */}
              <ol className="mt-10 space-y-8 border-l-2 border-border pl-8 sm:pl-10">
                {STEPS.map((step, i) => (
                  <Reveal key={step.n} delayMs={i * 120} as="li" className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[2.6rem] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-carb text-xs font-black text-on-brand shadow-lg shadow-brand/30 sm:-left-[3.35rem]"
                    >
                      {step.n}
                    </span>
                    <span className="block text-xl font-bold">{step.title}</span>
                    <span className="mt-1.5 block text-pretty leading-relaxed text-muted">
                      {step.body}
                    </span>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <Band title="매일 쓰게 만드는 세 가지">
          <ul className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            {FEATURES.map((feature, i) => (
              <Reveal
                key={feature.title}
                delayMs={i * 100}
                as="li"
                className="group relative block h-full overflow-hidden rounded-card border border-surface/60 bg-surface/80 p-6 shadow-xl backdrop-blur-xl sm:p-8"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-brand/20 to-carb/10 blur-3xl transition-transform duration-700 group-hover:scale-150"
                />
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-dark to-brand text-on-brand shadow-lg">
                  {feature.icon}
                </span>
                <span className="relative mt-5 block min-w-0">
                  <span className="block text-xl font-extrabold sm:text-2xl">{feature.title}</span>
                  <span className="mt-2 block max-w-2xl text-pretty leading-relaxed text-muted">
                    {feature.body}
                  </span>
                </span>
              </Reveal>
            ))}
          </ul>
        </Band>

        {/* 화면 둘러보기 — 탭마다 하나씩. 어두운 면 위에서 순서대로 떠오른다 */}
        <section className="relative w-full overflow-hidden bg-ink py-24 sm:py-28">
          <div
            aria-hidden="true"
            className="animate-drift pointer-events-none absolute left-1/2 top-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]"
          />
          <div className="relative mx-auto max-w-6xl px-6">
            <Reveal>
              <h2 className="text-balance text-center text-3xl font-extrabold tracking-tight text-on-brand sm:text-4xl">
                다섯 개 탭, 하나의 흐름
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-center leading-relaxed text-canvas/60">
                찍고, 확인하고, 체중을 남기면 코치가 읽습니다.
              </p>
            </Reveal>

            {/* data-lenis-prevent를 붙이지 않는다 — 이 목록이 실제로 스크롤되는 건 좁은 화면뿐이고,
                거기서는 관성 스크롤 자체를 걸지 않는다. 붙이면 넓은 화면에서 세로 스크롤이
                네이티브로 새어 나가 관성 위치와 어긋나며 화면이 떨린다. */}
            <ul className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6 lg:justify-center lg:overflow-visible">
              {SCREENS.map((item, i) => (
                <Reveal key={item.screen} delayMs={i * 120} as="li" className="snap-center">
                  <span className="block">
                    {/* 기울기는 CSS 변수로 준다 — 인라인 style에 넣으면 hover 클래스가 이길 수 없다 */}
                    <span
                      className="block transition-transform duration-500 ease-out [transform:rotate(var(--tilt))_translateY(var(--drop))] hover:[transform:rotate(0deg)_translateY(0)]"
                      style={
                        {
                          '--tilt': `${TILT[i]}deg`,
                          '--drop': i % 2 ? '1.25rem' : '0rem',
                        } as CSSProperties
                      }
                    >
                      <AppPreview screen={item.screen} className="ring-1 ring-canvas/15" />
                    </span>
                    <span className="mt-6 block text-center">
                      <span className="block font-bold text-on-brand">{item.title}</span>
                      <span className="mt-1 block text-sm text-canvas/60">{item.body}</span>
                    </span>
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        <section className="w-full bg-canvas py-24 sm:py-28">
          <div className="mx-auto max-w-lg px-6">
            <Reveal>
              <InstallGuide state={state} onInstall={promptInstall} />
            </Reveal>
          </div>
        </section>

        <Band title="자주 묻는 것">
          <ul className="mx-auto max-w-2xl divide-y divide-border overflow-hidden rounded-card bg-surface shadow-sm">
            {FAQ.map((item) => (
              <li key={item.q}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-ink">
                    {item.q}
                    <ChevronDownIcon className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="text-pretty px-5 pb-5 leading-relaxed text-muted">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Band>
      </main>

      <footer className="w-full bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2">
              <AppMark className="h-9 w-9" />
              <span className="text-xl font-extrabold tracking-tight text-on-brand">kcalog</span>
            </span>
            <span className="text-canvas/60">
              사진 한 장으로 10초 안에 식사가 기록되는 AI 식단·체중 관리
            </span>
            <span className="text-sm text-canvas/40">
              1인 개발 사이드 프로젝트입니다. 기능과 화면은 계속 바뀝니다.
            </span>
          </div>
          {state !== 'installed' && (
            <a
              href="#install"
              className="shrink-0 rounded-tile border border-canvas/20 px-5 py-3 font-bold text-canvas transition-colors hover:bg-canvas/10 focus-visible:ring-2 focus-visible:ring-brand"
            >
              설치 방법 보기
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}

const CTA_CLASS =
  'flex min-h-14 w-full max-w-xs items-center justify-center rounded-tile bg-brand px-8 text-lg font-bold text-on-brand shadow-lg shadow-brand/30 transition-[background-color,transform] duration-200 hover:bg-brand-dark hover:scale-[1.02] touch-manipulation focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink'

function navLinkClass(scrolled: boolean): string {
  return `rounded-tile px-3 py-2 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
    scrolled ? 'text-brand-ink hover:bg-brand-soft' : 'text-canvas hover:bg-canvas/10'
  }`
}

/** 스크롤이 임계값을 넘었는지 — 헤더가 어두운 히어로 위에 있는지, 밝은 본문 위에 있는지 가른다 */
function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

/** 전폭 배경 + 가운데 정렬 컨테이너를 가진 한 구획 */
function Band({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="w-full bg-track py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-balance text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h2>
        </Reveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  )
}

/* 아이콘 — 인라인 SVG(라이브러리 없음, lucide 형태 참고). 옆에 제목 텍스트가 있으므로 장식 취급 */
function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CameraIcon(): ReactNode {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.3-2h7l1.3 2h1.7A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function ScaleIcon(): ReactNode {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 9a6 6 0 0 1 8 0l-2.2 2.4a3 3 0 0 0-3.6 0z" />
    </svg>
  )
}

function BotIcon(): ReactNode {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4M8 4h8" />
      <circle cx="9" cy="14" r="0.5" fill="currentColor" />
      <circle cx="15" cy="14" r="0.5" fill="currentColor" />
    </svg>
  )
}
