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
          <AppMark className="h-9 w-9" alt="kcalog" />
        )}
        <span className="text-sm text-muted">
          {step} / {total}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold text-brand-ink">STEP {step}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>

      <div className="mt-6 flex-1">{children}</div>

      <div className="mt-6">
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
 * 슬라이더 + 직접 입력 — 큰 숫자 자체가 입력칸이라 정밀 입력도 가능하다.
 * 입력칸을 비운 상태를 허용해야 지우고 다시 칠 수 있어, 표시 문자열을 따로 들고 있다가
 * 숫자로 읽히는 동안만 부모에 올린다(부모는 항상 마지막 유효 숫자를 갖는다).
 */
export function SliderField({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  const [raw, setRaw] = useState(String(value))
  // 슬라이더 등 밖에서 값이 바뀌면 표시도 따라간다
  useEffect(() => setRaw(String(value)), [value])

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-xs text-muted">{unit}</span>
      </div>
      <input
        type="number"
        aria-label={label}
        value={raw}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          setRaw(e.target.value)
          const parsed = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(parsed)) onChange(parsed)
        }}
        className="mt-1 w-full rounded bg-transparent text-4xl font-black text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
      />
      <input
        type="range"
        aria-label={`${label} 슬라이더`}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand"
      />
    </div>
  )
}
