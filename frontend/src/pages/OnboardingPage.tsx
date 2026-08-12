import { useState } from 'react'
import { fieldErrorsFrom } from '../api/client'
import { completeOnboarding, getKcalSuggestion } from '../api/member'
import type { ActivityLevel, Gender, Goal, KcalSuggestion } from '../api/member'
import { validateProfileFields } from '../api/memberValidation'
import type { FieldErrors } from '../api/memberValidation'
import { useAuth } from '../auth/useAuth'
import { OptionCard, SliderField, WizardShell } from '../features/onboarding/WizardShell'
import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from '../features/onboarding/options'

const TOTAL_STEPS = 5
const CURRENT_YEAR = new Date().getFullYear()

/**
 * 온보딩 5단계 위저드: 성별 → 키·몸무게·나이 → 활동량 → 목표 → 완료 플랜.
 * 목표 체중은 감량·증량을 고른 경우에만 선택 입력. 제출 성공 시 reloadMember로 가드가 홈으로 보낸다.
 */
export function OnboardingPage() {
  const { reloadMember } = useAuth()

  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<Gender | null>(null)
  const [heightCm, setHeightCm] = useState(170)
  const [weightKg, setWeightKg] = useState(65)
  const [age, setAge] = useState(30)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [targetWeightKg, setTargetWeightKg] = useState('')

  const [suggestion, setSuggestion] = useState<KcalSuggestion | null>(null)
  const [kcalInput, setKcalInput] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const birthYear = CURRENT_YEAR - age

  /** 4단계 → 5단계로 넘어갈 때 제안 칼로리를 받아온다 */
  async function loadSuggestion() {
    if (!gender || !activityLevel || !goal) return
    setGlobalError(null)
    const fieldErrors = validateProfileFields({ birthYear, heightCm, weightKg })
    if (targetWeightKg.trim() !== '') {
      Object.assign(fieldErrors, validateProfileFields({ targetWeightKg: Number(targetWeightKg) }))
    }
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setBusy(true)
    try {
      const result = await getKcalSuggestion({ gender, birthYear, heightCm, weightKg, activityLevel, goal })
      setSuggestion(result)
      setKcalInput(String(result.dailyKcalTarget))
      setStep(5)
    } catch {
      setGlobalError('계산에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!gender || !activityLevel || !goal) return
    setGlobalError(null)
    const target = Number(kcalInput)
    const fieldErrors = validateProfileFields({ dailyKcalTarget: Number.isFinite(target) ? target : null })
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setBusy(true)
    try {
      await completeOnboarding({
        gender,
        birthYear,
        heightCm,
        weightKg,
        activityLevel,
        goal,
        ...(targetWeightKg.trim() !== '' ? { targetWeightKg: Number(targetWeightKg) } : {}),
        dailyKcalTarget: target,
      })
      await reloadMember()
    } catch (error) {
      const fields = fieldErrorsFrom(error)
      if (fields) {
        setErrors(fields)
      } else {
        setGlobalError('저장에 실패했어요. 잠시 후 다시 시도해주세요.')
      }
      setBusy(false)
    }
  }

  const notice = globalError && (
    <p role="alert" className="mb-3 text-sm text-danger">
      {globalError}
    </p>
  )

  if (step === 1) {
    return (
      <WizardShell
        step={1}
        total={TOTAL_STEPS}
        title="성별을 알려주세요"
        description="기초대사량 계산에 사용돼요."
        onNext={() => setStep(2)}
        nextDisabled={gender === null}
      >
        {notice}
        <div className="flex gap-3">
          <OptionCard layout="tile" icon="♂" label="남성" selected={gender === 'MALE'} onSelect={() => setGender('MALE')} />
          <OptionCard layout="tile" icon="♀" label="여성" selected={gender === 'FEMALE'} onSelect={() => setGender('FEMALE')} />
        </div>
      </WizardShell>
    )
  }

  if (step === 2) {
    return (
      <WizardShell
        step={2}
        total={TOTAL_STEPS}
        title="키와 몸무게, 나이"
        description="정확할수록 계산이 잘 맞아요."
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
      >
        {notice}
        <div className="space-y-3">
          <SliderField label="키" unit="cm" value={heightCm} min={100} max={230} onChange={setHeightCm} />
          <SliderField label="몸무게" unit="kg" value={weightKg} min={30} max={250} onChange={setWeightKg} />
          <SliderField label="나이" unit="세" value={age} min={10} max={100} onChange={setAge} />
        </div>
        <FieldErrorList errors={errors} keys={['heightCm', 'weightKg', 'birthYear']} />
      </WizardShell>
    )
  }

  if (step === 3) {
    return (
      <WizardShell
        step={3}
        total={TOTAL_STEPS}
        title="평소 활동량은 어느 정도인가요?"
        onBack={() => setStep(2)}
        onNext={() => setStep(4)}
        nextDisabled={activityLevel === null}
      >
        {notice}
        <div className="space-y-2">
          {ACTIVITY_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={activityLevel === option.value}
              onSelect={() => setActivityLevel(option.value)}
            />
          ))}
        </div>
      </WizardShell>
    )
  }

  if (step === 4) {
    const wantsTargetWeight = goal === 'CUT' || goal === 'BULK'
    return (
      <WizardShell
        step={4}
        total={TOTAL_STEPS}
        title="목표를 선택해주세요"
        onBack={() => setStep(3)}
        onNext={() => void loadSuggestion()}
        nextDisabled={goal === null || busy}
      >
        {notice}
        <div className="space-y-2">
          {GOAL_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={goal === option.value}
              onSelect={() => setGoal(option.value)}
            />
          ))}
        </div>

        {wantsTargetWeight && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <label htmlFor="targetWeightKg" className="block text-sm font-medium text-ink">
              목표 체중 <span className="text-muted">(선택)</span>
            </label>
            <p className="mt-0.5 text-xs text-muted">넣어두면 목표 달성 예상일을 알려드려요. 비워도 괜찮아요.</p>
            <div className="mt-2 flex items-baseline gap-1">
              <input
                id="targetWeightKg"
                inputMode="decimal"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                placeholder="예: 65"
                className="w-24 border-b border-border bg-transparent text-2xl font-bold text-ink outline-none"
              />
              <span className="text-sm text-muted">kg</span>
            </div>
            {errors.targetWeightKg && <p className="mt-1 text-sm text-danger">{errors.targetWeightKg}</p>}
          </div>
        )}
      </WizardShell>
    )
  }

  return (
    <WizardShell
      step={5}
      total={TOTAL_STEPS}
      title="맞춤 플랜이 준비됐어요"
      onBack={() => setStep(4)}
      onNext={() => void submit()}
      nextLabel="홈으로 시작하기"
      nextDisabled={busy}
    >
      {notice}
      {suggestion && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-brand p-4 text-on-brand">
            <p className="text-xs font-semibold text-on-brand/80">일일 유지 칼로리 (TDEE)</p>
            <p className="mt-1 text-3xl font-black">
              {suggestion.maintenanceKcal.toLocaleString()}
              <span className="ml-1 text-base font-bold">kcal</span>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <label htmlFor="dailyKcalTarget" className="text-xs text-muted">
              목표 섭취량 (수정할 수 있어요)
            </label>
            <div className="flex items-baseline gap-1">
              <input
                id="dailyKcalTarget"
                inputMode="numeric"
                value={kcalInput}
                onChange={(e) => setKcalInput(e.target.value)}
                className="w-32 bg-transparent text-3xl font-black text-ink outline-none"
              />
              <span className="text-base font-bold text-muted">kcal</span>
            </div>
            {errors.dailyKcalTarget && <p className="mt-1 text-sm text-danger">{errors.dailyKcalTarget}</p>}

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MacroCell label="탄" grams={suggestion.carbTargetG} className="bg-carb-soft text-carb" />
              <MacroCell label="단" grams={suggestion.proteinTargetG} className="bg-protein-soft text-protein" />
              <MacroCell label="지" grams={suggestion.fatTargetG} className="bg-fat-soft text-fat" />
            </div>
          </div>

          <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-ink">
            💡 목표는 언제든 프로필에서 바꿀 수 있어요. 기록이 쌓이면 실제 데이터로 유지 칼로리를 다시 계산해드려요.
          </p>
        </div>
      )}
    </WizardShell>
  )
}

function MacroCell({ label, grams, className }: { label: string; grams: number; className: string }) {
  return (
    <div className={`rounded-xl py-2 ${className}`}>
      <p className="text-xs font-bold">{label}</p>
      <p className="text-base font-black">{grams}g</p>
    </div>
  )
}

function FieldErrorList({ errors, keys }: { errors: FieldErrors; keys: string[] }) {
  const messages = keys.map((key) => errors[key]).filter(Boolean)
  if (messages.length === 0) return null
  return (
    <div role="alert" className="mt-3 space-y-1">
      {messages.map((message) => (
        <p key={message} className="text-sm text-danger">
          {message}
        </p>
      ))}
    </div>
  )
}
