import type { ReactNode } from 'react'
import { CalorieRing } from '../dashboard/CalorieRing'
import { MacroProgress } from '../dashboard/MacroProgress'
import { WeightTrend } from '../weight/WeightTrend'
import { MealArt } from './MealArt'
import { Card } from '../../ui/form'

/**
 * 랜딩용 앱 화면 미리보기 — 폰 프레임 안에 각 탭 화면을 그린다.
 *
 * 캡처 이미지가 아니라 **앱이 실제로 쓰는 컴포넌트**(`CalorieRing`·`MacroProgress`·`WeightTrend`)를
 * 가짜 값으로 렌더한다. 화면을 고치면 미리보기도 같이 따라오므로 캡처처럼 낡지 않는다.
 *
 * 조각조각 읽히면 소음이라 프레임에 `role="img"`를 주어 스크린리더에는 설명 한 줄로만 전달한다.
 */
export type PreviewScreen = 'home' | 'record' | 'weight' | 'coach'

const LABELS: Record<PreviewScreen, string> = {
  home: 'kcalog 홈 화면 미리보기 — 남은 칼로리 510kcal, 탄단지 달성도',
  record: 'kcalog 음식기록 화면 미리보기 — 사진에서 인식한 음식과 칼로리',
  weight: 'kcalog 체중 화면 미리보기 — 최근 체중 추이 그래프',
  coach: 'kcalog AI PT 화면 미리보기 — 코치와 나눈 대화',
}

export function AppPreview({
  screen = 'home',
  className = '',
}: {
  screen?: PreviewScreen
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={LABELS[screen]}
      className={`relative w-[17.5rem] shrink-0 rounded-[2.25rem] bg-ink p-2.5 shadow-xl ${className}`}
    >
      <div className="relative h-[38rem] overflow-hidden rounded-[1.75rem] bg-canvas">
        <div className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" />

        <div className="px-3.5 pt-9">
          {screen === 'home' && <HomeScreen />}
          {screen === 'record' && <RecordScreen />}
          {screen === 'weight' && <WeightScreen />}
          {screen === 'coach' && <CoachScreen />}
        </div>

        {/* 아래가 잘린 게 아니라 이어진다는 신호 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-canvas to-transparent" />
      </div>
    </div>
  )
}

function ScreenTitle({ sub, children }: { sub?: string; children: ReactNode }) {
  return (
    <div className="leading-tight">
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
      <p className="text-[13px] font-bold">{children}</p>
    </div>
  )
}

function HomeScreen() {
  return (
    <div className="space-y-3">
      <ScreenTitle sub="오늘, 8월 15일 (금)">좋은 저녁이에요</ScreenTitle>

      <Card className="!p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold">오늘의 칼로리</p>
            <p className="text-[10px] font-medium text-success">순조롭게 가고 있어요</p>
          </div>
          <span className="text-[11px] font-semibold text-brand-ink">리포트 ›</span>
        </div>
        <div className="mt-2">
          <CalorieRing totalKcal={1420} dailyKcalTarget={1930} remainingKcal={510} />
        </div>
      </Card>

      <Card className="!p-3">
        <MacroProgress
          carbG={178}
          proteinG={92}
          fatG={41}
          carbTargetG={241}
          proteinTargetG={145}
          fatTargetG={54}
        />
      </Card>

      <div className="flex items-center gap-2.5 rounded-2xl bg-success-soft px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success text-sm">
          ✨
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-bold">오늘의 AI 코칭</span>
          <span className="block truncate text-[10px] text-ink/80">
            단백질이 53g 모자라요. 저녁에 채워보세요.
          </span>
        </span>
      </div>

      <Card className="!p-3">
        <div className="flex items-end justify-between">
          <span>
            <span className="block text-[10px] font-bold text-muted">오늘 체중</span>
            <span className="text-xl font-black leading-none">
              72.9<span className="ml-0.5 text-[10px] font-bold text-muted">kg</span>
            </span>
          </span>
          <span className="text-[11px] font-black text-brand-ink">-0.4kg / 7일</span>
        </div>
      </Card>
    </div>
  )
}

const RECOGNIZED = [
  { name: '김치찌개', amount: '1인분', kcal: 480 },
  { name: '흰쌀밥', amount: '1공기', kcal: 300 },
  { name: '계란말이', amount: '3조각', kcal: 180 },
] as const

function RecordScreen() {
  return (
    <div className="space-y-3">
      <ScreenTitle sub="사진에서 찾은 음식">분석 결과</ScreenTitle>

      <div className="overflow-hidden rounded-2xl">
        <MealArt className="block w-full" />
      </div>

      <Card className="!p-3">
        <p className="text-[11px] font-extrabold">인식한 항목</p>
        <ul className="mt-2 space-y-2">
          {RECOGNIZED.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-track text-muted">
                  <ForkGlyph />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="block text-[10px] text-muted">{item.amount}</span>
                </span>
              </span>
              <span className="shrink-0 font-black tabular-nums">{item.kcal}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-track px-2.5 py-1.5 text-[11px]">
          <span className="font-bold">합계</span>
          <span className="font-black tabular-nums">960 kcal</span>
        </div>
      </Card>

      <div className="flex h-9 items-center justify-center rounded-tile bg-brand text-[12px] font-bold text-on-brand">
        이대로 저장
      </div>
    </div>
  )
}

/** 30일치 체중 — 조금씩 내려가는 흐름 */
const WEIGHT_POINTS = Array.from({ length: 24 }, (_, i) => {
  const drift = 74.6 - i * 0.075
  // 실제 기록처럼 하루하루는 튀고 추세선은 완만하게
  const jitter = [0.35, -0.2, 0.15, -0.4, 0.05, 0.3][i % 6]
  const day = String((i % 28) + 1).padStart(2, '0')
  return { logDate: `2026-08-${day}`, weightKg: Number((drift + jitter).toFixed(1)), trendKg: Number(drift.toFixed(2)) }
})

function WeightScreen() {
  return (
    <div className="space-y-3">
      <ScreenTitle sub="최근 24일">체중</ScreenTitle>

      <Card className="!p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted">현재</p>
            <p className="text-2xl font-black leading-none">
              72.9<span className="ml-0.5 text-xs font-bold text-muted">kg</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted">목표까지</p>
            <p className="text-lg font-black leading-none text-brand-ink">-2.9kg</p>
          </div>
        </div>
        <WeightTrend points={WEIGHT_POINTS} />
      </Card>

      <Card className="!p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold">연속 기록</span>
          <span className="font-black text-brand-ink">18일째</span>
        </div>
      </Card>
    </div>
  )
}

const CHAT = [
  { from: 'me', text: '오늘 저녁 뭐 먹을까?' },
  {
    from: 'ai',
    text: '단백질이 53g 모자라요. 닭가슴살 150g이나 두부 한 모를 곁들이면 오늘 목표에 딱 맞습니다.',
  },
  { from: 'me', text: '탄수화물은 괜찮아?' },
  { from: 'ai', text: '178g으로 목표의 74%예요. 밥 한 공기까지는 여유가 있습니다.' },
] as const

function CoachScreen() {
  return (
    <div className="space-y-3">
      <ScreenTitle sub="기록을 보고 답합니다">AI PT</ScreenTitle>

      <div className="space-y-2.5">
        {CHAT.map((message, i) => (
          <div key={i} className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <span
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                message.from === 'me'
                  ? 'rounded-br-sm bg-brand text-on-brand'
                  : 'rounded-bl-sm bg-surface text-ink shadow-sm'
              }`}
            >
              {message.text}
            </span>
          </div>
        ))}
        {/* 답변이 오는 중 */}
        <div className="flex justify-start">
          <span className="flex gap-1 rounded-2xl rounded-bl-sm bg-surface px-3 py-2.5 shadow-sm">
            <Dot />
            <Dot delay="0.15s" />
            <Dot delay="0.3s" />
          </span>
        </div>
      </div>
    </div>
  )
}

function Dot({ delay = '0s' }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
      style={{ animationDelay: delay }}
    />
  )
}

function ForkGlyph() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
      <path d="M21 15v7" />
    </svg>
  )
}
