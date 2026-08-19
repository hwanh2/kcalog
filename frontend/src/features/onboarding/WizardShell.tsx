import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AppMark } from '../../ui/AppMark'

/**
 * 온보딩 단계 셸 — 진행 표시·STEP 라벨·질문·하단 고정 CTA·뒤로가기를 한 곳에서 담당한다.
 * 단계마다 질문 하나만 묻는 구조라 본문은 선택지/입력만 넘기면 된다.
 */
export function WizardShell({
  step,
  total,
  title,
  description,
  onBack,
  onNext,
  nextLabel = '다음',
  nextDisabled = false,
  showSteps = true,
  children,
}: {
  step: number
  total: number
  title: string
  description?: string
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  /** 몇 번째 단계인지 감춘다. 마지막 화면은 더 물을 것이 없어 진행 표시가 할 말이 없다 */
  showSteps?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col px-5 pt-6 pb-6">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="이전 단계"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink"
          >
            ‹
          </button>
        ) : (
          // 첫 단계에는 뒤로 갈 곳이 없다 — 빈 자리로 두는 대신 마크를 세운다.
          // 가입 직후 처음 만나는 화면이라, 어느 앱의 질문인지 여기서 한 번 더 말해준다
          <AppMark className="h-9 w-auto" alt="칼로그" />
        )}
        {showSteps && (
          <span className="text-sm text-muted">
            {step} / {total}
          </span>
        )}
      </div>

      <div className="mt-5">
        {showSteps && <p className="text-xs font-bold text-brand-ink">STEP {step}</p>}
        <h1 className={`text-2xl font-bold text-ink ${showSteps ? 'mt-1' : ''}`}>{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>

      <div className="mt-6 flex-1">{children}</div>

      {/*
        하단은 화면에 붙인다. 마지막 단계의 설명이 길어지면서 '시작하기'가 스크롤 아래로
        밀려났다. 설명을 접거나 (i)로 숨기는 대신 버튼을 항상 손 닿는 곳에 둔다.
        sticky는 일반 흐름에서 자리를 차지하므로 본문 마지막 줄을 가리지 않는다.
      */}
      <div className="sticky bottom-0 -mx-5 mt-6 bg-canvas px-5 pb-[env(safe-area-inset-bottom)] pt-3">
        {/* 내용이 버튼 뒤로 딱 잘려 사라지지 않게. 위로 갈수록 투명해지는 띠를 한 겹 얹는다 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-canvas to-transparent"
        />
        {showSteps && (
          <div
            className="mb-3 flex gap-1.5"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label="온보딩 진행"
          >
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-brand' : 'bg-border'}`}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="w-full rounded-2xl bg-brand py-4 font-bold text-on-brand hover:bg-brand-dark disabled:bg-border disabled:text-muted"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

/** 선택 카드 — 성별·활동량·목표가 공유한다. 선택 시 brand 테두리 + 연한 배경 */
export function OptionCard({
  selected,
  onSelect,
  label,
  description,
  icon,
  layout = 'row',
}: {
  selected: boolean
  onSelect: () => void
  label: string
  description?: string
  icon?: ReactNode
  layout?: 'row' | 'tile'
}) {
  const base = selected ? 'border-brand bg-brand-soft' : 'border-border bg-surface'
  if (layout === 'tile') {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border py-8 ${base}`}
      >
        {icon && <span className="text-3xl">{icon}</span>}
        <span className="font-bold text-ink">{label}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left ${base}`}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      {selected && (
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-on-brand"
        >
          ✓
        </span>
      )}
    </button>
  )
}

/**
 * 스테퍼 + 직접 입력. 양쪽 버튼으로 한 칸씩 옮기고, 큰 숫자를 눌러 바로 칠 수도 있다.
 *
 * 슬라이더를 걷어낸 자리다. 드래그는 손가락으로 1cm를 맞추기 어려웠고, 화면 폭이 좁을수록
 * 한 픽셀이 여러 칸을 건너뛰었다. 버튼은 눌린 만큼만 움직인다.
 *
 * 입력칸을 비운 상태를 허용해야 지우고 다시 칠 수 있어, 표시 문자열을 따로 들고 있다가
 * 숫자로 읽히는 동안만 부모에 올린다(부모는 항상 마지막 유효 숫자를 갖는다).
 * 초점을 잃을 때 비어 있으면 마지막 값으로 되돌린다. 빈 칸으로 다음 단계에 가지 않게.
 */
export function StepperField({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  inputMode = 'numeric',
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step?: number
  inputMode?: 'numeric' | 'decimal'
  onChange: (v: number) => void
}) {
  const [raw, setRaw] = useState(String(value))
  // 버튼 등 밖에서 값이 바뀌면 표시도 따라간다
  useEffect(() => setRaw(String(value)), [value])

  /* 버튼은 범위를 넘지 않는다. 직접 입력은 막지 않는다. 범위 검증은 '다음'에서 문구와 함께 알린다 */
  const nudge = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)))

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-xs text-muted">{unit}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <StepButton label={`${label} 줄이기`} disabled={value <= min} onClick={() => nudge(-step)}>
          −
        </StepButton>
        {/* min-w-0. flex-1만 주면 긴 값이 버튼을 밀어낸다 */}
        <input
          type="text"
          inputMode={inputMode}
          aria-label={label}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value)
            const parsed = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(parsed)) onChange(parsed)
          }}
          onBlur={() => setRaw(String(value))}
          className="min-w-0 flex-1 rounded bg-transparent text-center text-4xl font-black tabular-nums text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
        />
        <StepButton label={`${label} 늘리기`} disabled={value >= max} onClick={() => nudge(step)}>
          +
        </StepButton>
      </div>
    </div>
  )
}

/** 44px 탭 대상. 아이콘 대신 글자를 쓰므로 크기를 키우고 굵게 해서 눌리는 것처럼 보이게 한다 */
function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-track text-xl font-bold text-ink touch-manipulation disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-ink"
    >
      {children}
    </button>
  )
}
