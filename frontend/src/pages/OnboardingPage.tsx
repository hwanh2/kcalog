import { useState } from 'react'
import { fieldErrorsFrom } from '../api/client'
import { completeOnboarding, getKcalSuggestion } from '../api/member'
import type { ActivityLevel, Gender, Goal, KcalSuggestion } from '../api/member'
import { validateProfileFields } from '../api/memberValidation'
import type { FieldErrors } from '../api/memberValidation'
import { useAuth } from '../auth/useAuth'
import { MuscleGoalField } from '../features/onboarding/MuscleGoalField'
import { PLAN_BUILD_MS, PlanBuilding } from '../features/onboarding/PlanBuilding'
import { OptionCard, StepperField, WizardShell } from '../features/onboarding/WizardShell'
import { ACTIVITY_OPTIONS, AGE_DEFAULT, BODY_DEFAULTS, GOAL_OPTIONS } from '../features/onboarding/options'
import { birthYearFromAge } from '../lib/age'

const TOTAL_STEPS = 5

/**
 * 온보딩 5단계 위저드: 성별 → 키·몸무게·나이 → 활동량 → 목표 → 완료 플랜.
 * 목표 체중은 감량·증량을 고른 경우에만 선택 입력. 제출 성공 시 reloadMember로 가드가 홈으로 보낸다.
 */
export function OnboardingPage() {
  const { reloadMember } = useAuth()

  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<Gender | null>(null)
  const [heightCm, setHeightCm] = useState(BODY_DEFAULTS.MALE.heightCm)
  const [weightKg, setWeightKg] = useState(BODY_DEFAULTS.MALE.weightKg)
  const [age, setAge] = useState(AGE_DEFAULT)
  /*
    성별을 고르면 그 성별의 평균에서 시작한다. 다만 2단계에서 이미 고친 값이 있으면 덮지 않는다 , 
    되돌아가 성별만 바꿨을 뿐인데 방금 맞춰둔 키, 몸무게가 날아가면 안 된다.
  */
  const [bodyTouched, setBodyTouched] = useState(false)

  function chooseGender(next: Gender) {
    setGender(next)
    if (!bodyTouched) {
      setHeightCm(BODY_DEFAULTS[next].heightCm)
      setWeightKg(BODY_DEFAULTS[next].weightKg)
    }
  }
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [muscleGoal, setMuscleGoal] = useState(false)
  const [targetWeightKg, setTargetWeightKg] = useState('')

  const [suggestion, setSuggestion] = useState<KcalSuggestion | null>(null)
  const [kcalInput, setKcalInput] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** 5단계에 도착했지만 아직 결과를 보여주지 않는 동안 */
  const [building, setBuilding] = useState(false)

  // 화면은 세는나이. 2002년생이면 25세다 (lib/age)
  const birthYear = birthYearFromAge(age)

  /**
   * 2단계 확정 — 값이 보이는 이 화면에서 범위를 검증한다.
   * 뒤 단계로 미루면 오류 문구가 없는 화면에서 '다음'이 죽은 것처럼 막힌다.
   */
  function confirmBody() {
    const fieldErrors = validateProfileFields({ birthYear, heightCm, weightKg })
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return
    setStep(3)
  }

  /** 4단계 → 5단계로 넘어갈 때 제안 칼로리를 받아온다 */
  async function loadSuggestion() {
    if (!gender || !activityLevel || !goal) return
    setGlobalError(null)
    const fieldErrors = validateProfileFields({ birthYear, heightCm, weightKg })
    if (targetWeightKg.trim() !== '') {
      Object.assign(fieldErrors, validateProfileFields({ targetWeightKg: Number(targetWeightKg) }))
    }
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) {
      // 신체 정보 오류는 2단계에만 문구가 있으므로 그 화면으로 되돌려 보여준다
      if (fieldErrors.heightCm || fieldErrors.weightKg || fieldErrors.birthYear) {
        setStep(2)
      }
      return
    }

    setBusy(true)
    // 결과를 기다리는 동안 5단계에 먼저 도착시킨다. 무엇을 계산 중인지 그 화면이 보여준다
    setStep(5)
    setBuilding(true)
    try {
      // 계산이 빨라도 최소 시간은 채운다. 응답이 더 느리면 응답을 기다린다
      const [result] = await Promise.all([
        getKcalSuggestion({
          gender, birthYear, heightCm, weightKg, activityLevel, goal, muscleGoal,
        }),
        new Promise((resolve) => setTimeout(resolve, PLAN_BUILD_MS)),
      ])
      setSuggestion(result)
      setKcalInput(String(result.dailyKcalTarget))
    } catch {
      // 실패하면 값이 보이는 화면으로 되돌린다. 빈 5단계에 남겨두면 할 수 있는 것이 없다
      setStep(4)
      setGlobalError('계산에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setBuilding(false)
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
        muscleGoal,
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
          <OptionCard
            layout="tile"
            icon="♂"
            label="남성"
            selected={gender === 'MALE'}
            onSelect={() => chooseGender('MALE')}
          />
          <OptionCard
            layout="tile"
            icon="♀"
            label="여성"
            selected={gender === 'FEMALE'}
            onSelect={() => chooseGender('FEMALE')}
          />
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
        onNext={confirmBody}
      >
        {notice}
        <div className="space-y-3">
          <StepperField
            label="키"
            unit="cm"
            value={heightCm}
            min={100}
            max={230}
            onChange={(v) => {
              setBodyTouched(true)
              setHeightCm(v)
            }}
          />
          <StepperField
            label="몸무게"
            unit="kg"
            value={weightKg}
            min={30}
            max={250}
            inputMode="decimal"
            onChange={(v) => {
              setBodyTouched(true)
              setWeightKg(v)
            }}
          />
          <StepperField label="나이" unit="세" value={age} min={10} max={100} onChange={setAge} />
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
    /*
      고른 방향과 목표 체중이 서로 어긋난 경우. 감량인데 지금보다 무겁거나, 증량인데 가볍다.
      막지는 않는다. 지금 체중을 잘못 넣었을 수도, 정말 그렇게 하려는 것일 수도 있어
      어느 쪽인지 우리가 알 수 없다. 넘어가기 전에 한 번 보여주기만 한다.
    */
    const parsedTarget = Number(targetWeightKg)
    const targetConflict =
      targetWeightKg.trim() !== '' && Number.isFinite(parsedTarget)
        ? goal === 'CUT' && parsedTarget > weightKg
          ? '감량인데 목표가 더 무거워요'
          : goal === 'BULK' && parsedTarget < weightKg
            ? '증량인데 목표가 더 가벼워요'
            : null
        : null
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

        {/*
          방향(감량, 유지, 증량) 바로 아래. 방향은 체중이 어디로 갈지이고 이 토글은
          그 체중을 근육으로 채우고 싶은지다. 나란히 두어야 둘의 차이가 읽힌다 (design D4)
        */}
        <div className="mt-3 border-t border-border pt-2">
          <MuscleGoalField checked={muscleGoal} onChange={setMuscleGoal} />
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
                className="w-24 rounded border-b border-border bg-transparent text-2xl font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
              />
              <span className="text-sm text-muted">kg</span>
            </div>
            {errors.targetWeightKg && <p className="mt-1 text-sm text-danger">{errors.targetWeightKg}</p>}
            {/* 오류가 아니라 확인 요청이다. 진행을 막지 않으므로 alert이 아니라 status */}
            {targetConflict && (
              <p role="status" className="mt-2 text-xs leading-relaxed text-brand-ink">
                {targetConflict} (지금 {weightKg}kg)
              </p>
            )}
          </div>
        )}
      </WizardShell>
    )
  }

  const targetNote =
    goal === 'CUT'
      ? '감량이라 500kcal 적게 · 주 0.45kg 속도'
      : goal === 'BULK'
        ? '증량이라 300kcal 더'
        : '유지라 유지 칼로리 그대로'

  /*
    탄단지를 어떻게 잡았는지. 비율만 말하면 "왜 하필 그 비율"이 남는다.
    단백질은 체중에서, 지방은 목표 칼로리의 25%에서, 탄수는 나머지에서 나온다(design D1).
    단백질 g/kg는 실제 값에서 되짚어 보여준다. 상, 하한에 잘렸을 때도 화면과 어긋나지 않는다.
  */
  const proteinPerKg = suggestion ? (suggestion.proteinTargetG / weightKg).toFixed(1) : ''
  const macroNote = `단백질 체중 1kg당 ${proteinPerKg}g · 지방 25% · 나머지 탄수화물`

  /*
    만드는 동안은 위저드 셸을 벗는다. 단계 번호, 뒤로가기, 진행 막대, CTA는 지금 손댈 수 없고,
    시선을 진행 문구에서 뺏는다. 제목도 "준비됐어요"가 아니어야 화면이 스스로와 맞는다.
  */
  if (building) {
    return <PlanBuilding />
  }

  return (
    <WizardShell
      step={5}
      total={TOTAL_STEPS}
      title="맞춤 플랜이 준비됐어요"
      /* 마지막 화면은 더 물을 것이 없다. 몇 번째인지가 할 말이 없고, 결과에서 시선만 나눈다 */
      showSteps={false}
      onBack={() => setStep(4)}
      onNext={() => void submit()}
      nextLabel="시작하기"
      nextDisabled={busy}
    >
      {notice}
      {suggestion && (
        /* animate-settle-in. 만드는 동안 기다린 결과라 툭 나타나지 않고 자리를 잡는다 */
        <div className="animate-settle-in space-y-3">
          <div className="rounded-2xl bg-brand p-4 text-on-brand">
            <p className="text-xs font-semibold text-on-brand/80">일일 유지 칼로리 (TDEE)</p>
            <p className="mt-1 text-3xl font-black">
              {suggestion.maintenanceKcal.toLocaleString()}
              <span className="ml-1 text-base font-bold">kcal</span>
            </p>
            {/* 이 숫자가 왜 중요한지. 목표는 여기서 얼마나 빼고 더할지를 정한 결과다 */}
            <p className="mt-1.5 text-xs text-on-brand/80">먹어도 체중이 그대로인 칼로리예요</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <label htmlFor="dailyKcalTarget" className="text-xs text-muted">
              목표 섭취량 (수정할 수 있어요)
            </label>
            <div className="flex items-baseline gap-1">
              {/*
                폭을 값 길이에 맞춘다. w-32로 고정했더니 네 자리보다 짧을 때 남은 자리만큼
                'kcal'이 멀리 떨어졌다. tabular-nums라 숫자 한 자가 정확히 1ch다.
              */}
              <input
                id="dailyKcalTarget"
                inputMode="numeric"
                value={kcalInput}
                onChange={(e) => setKcalInput(e.target.value)}
                style={{ width: `${Math.max(kcalInput.length, 2)}ch` }}
                className="rounded bg-transparent text-3xl font-black tabular-nums text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
              />
              <span className="text-base font-bold text-muted">kcal</span>
            </div>
            {errors.dailyKcalTarget && <p className="mt-1 text-sm text-danger">{errors.dailyKcalTarget}</p>}
            {/* 제안값이 어디서 나왔는지. 유지 칼로리에서 방향만큼 조정한 결과다 */}
            <p className="mt-1 text-xs text-muted">{targetNote}</p>

            <p className="mt-3 text-xs text-muted">탄단지 목표</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MacroCell label="탄" grams={suggestion.carbTargetG} className="bg-carb-soft text-carb-ink" />
              <MacroCell label="단" grams={suggestion.proteinTargetG} className="bg-protein-soft text-protein-ink" />
              <MacroCell label="지" grams={suggestion.fatTargetG} className="bg-fat-soft text-fat-ink" />
            </div>
            {/* 비율이 아니라 무엇을 기준으로 잡았는지. 단백질은 체중, 지방은 비율, 탄수는 나머지 */}
            <p className="mt-2 text-xs text-muted">{macroNote}</p>
          </div>

          {/*
            이 앱에서 가장 중요한 한 가지. 여기 숫자는 공식으로 낸 추정이고,
            매일 기록해야 내 몸의 값으로 바뀐다. 다른 설명보다 위에 두고 색을 준다.
          */}
          <section className="rounded-2xl bg-success-soft px-4 py-4">
            <h2 className="text-[15px] font-bold text-ink">매일 기록해야 정확해져요</h2>
            <p className="mt-1.5 text-sm leading-[1.75] text-ink/75">
              지금 숫자는 키·몸무게·나이로 낸 <span className="font-semibold text-ink">추정값</span>이에요.
              식사와 체중을 매일 남기면 2주 뒤부터{' '}
              <span className="font-semibold text-ink">실제로 먹은 양과 체중 변화</span>로 유지 칼로리를
              다시 계산해요. 공식이 아니라 내 몸에서 나온 값이 되는 거예요.
            </p>
            <p className="mt-2 text-sm leading-[1.75] text-ink/75">
              체중은 <span className="font-semibold text-ink">아침에 화장실 다녀와서</span> 재는 게 가장
              일정해요. 하루하루 오르내리는 건 물과 소금 때문이니 신경 쓰지 않아도 돼요.
            </p>
          </section>

          {/*
            카드 안 한 줄은 "무엇"만 말한다. "왜"는 여기서 이어 받는다 , 
            접거나 (i)로 숨기지 않는 이유는 이 숫자를 처음 보는 자리이기 때문이다.
            스크롤해야 닿는 위치라 급한 사람은 그냥 시작하면 된다 (design D19).
          */}
          <section className="rounded-2xl border border-border bg-surface px-4 py-2">
            <h2 className="sr-only">플랜을 이렇게 잡았어요</h2>
            <ul className="divide-y divide-border">
              <PlanNote title="유지 칼로리를 알면 스스로 조절할 수 있어요">
                2주 뒤 체중이 생각만큼 안 움직이면{' '}
                <span className="font-semibold text-ink">여기서 200~300kcal만 더 빼면</span> 돼요. 기준을
                모르면 무작정 굶는 것 말고는 방법이 없어요.
              </PlanNote>
              <PlanNote title="단백질 → 지방 → 탄수화물 순서로 정했어요">
                단백질은 근육을 지키는 몫이라{' '}
                <span className="font-semibold text-ink">체중에 맞춰 먼저</span> 정해요 (1kg당 1.2~2.0g).
                지방은 호르몬에 필요한 최소선을 지키려고 25%로 두고요. 남은 칼로리를 탄수화물이 채우니
                탄수화물이 가장 크게 나와요.
              </PlanNote>
              <PlanNote title="탄수화물이 많게 느껴지면 지방으로 옮겨도 돼요">
                탄수화물은 1g에 4kcal, 지방은 9kcal예요. 그래서{' '}
                <span className="font-semibold text-ink">탄수화물 20g을 덜고 지방 9g을 더하면</span> 총
                칼로리가 같아요. 세 숫자를 맞추는 것보다 총 칼로리를 지키는 쪽이 훨씬 중요해요.
              </PlanNote>
            </ul>
          </section>

          <p className="px-1 pb-1 text-xs leading-relaxed text-muted">
            목표는 언제든 프로필에서 바꿀 수 있어요.
          </p>
        </div>
      )}
    </WizardShell>
  )
}

/** 제목과 본문의 크기, 색을 벌리고 줄간격을 넓혔다. 같은 굵기로 붙여 두면 글 덩어리로만 보인다 */
function PlanNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="py-4">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-1.5 text-sm leading-[1.75] text-ink/75">{children}</p>
    </li>
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
