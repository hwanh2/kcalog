import { useState } from 'react'
import { fieldErrorsFrom } from '../api/client'
import { completeOnboarding, getKcalSuggestion } from '../api/member'
import type { ActivityLevel, Gender, KcalSuggestionParams } from '../api/member'
import { toNumber, validateProfileFields } from '../api/memberValidation'
import type { FieldErrors } from '../api/memberValidation'
import { useAuth } from '../auth/useAuth'
import { Button, Field, Select, TextInput } from '../ui/form'

/**
 * 온보딩 2스텝: ① 프로필 입력 → ② 제안 칼로리 확인·수정 → 제출.
 * 제출 성공 시 reloadMember로 상태가 갱신되면 가드가 홈으로 보낸다 (직접 이동 없음).
 */
export function OnboardingPage() {
  const { reloadMember } = useAuth()

  const [step, setStep] = useState<'input' | 'confirm'>('input')
  const [gender, setGender] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [targetWeightKg, setTargetWeightKg] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [kcalInput, setKcalInput] = useState('')
  const [suggested, setSuggested] = useState<number | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function parseParams(): { params: KcalSuggestionParams | null; errors: FieldErrors } {
    const parsed = {
      birthYear: toNumber(birthYear),
      heightCm: toNumber(heightCm),
      weightKg: toNumber(weightKg),
      targetWeightKg: toNumber(targetWeightKg),
    }
    const fieldErrors = validateProfileFields(parsed)
    if (!gender) fieldErrors.gender = '성별을 선택해주세요'
    if (!activityLevel) fieldErrors.activityLevel = '활동량을 선택해주세요'
    if (Object.keys(fieldErrors).length > 0) return { params: null, errors: fieldErrors }
    return {
      params: {
        gender: gender as Gender,
        birthYear: parsed.birthYear!,
        heightCm: parsed.heightCm!,
        weightKg: parsed.weightKg!,
        targetWeightKg: parsed.targetWeightKg!,
        activityLevel: activityLevel as ActivityLevel,
      },
      errors: {},
    }
  }

  async function goConfirm() {
    setGlobalError(null)
    const { params, errors: fieldErrors } = parseParams()
    setErrors(fieldErrors)
    if (!params) return
    setBusy(true)
    try {
      const { dailyKcalTarget } = await getKcalSuggestion(params)
      setSuggested(dailyKcalTarget)
      setKcalInput(String(dailyKcalTarget))
      setStep('confirm')
    } catch {
      setGlobalError('제안 칼로리를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    setGlobalError(null)
    const { params } = parseParams()
    const kcal = toNumber(kcalInput)
    const kcalErrors = validateProfileFields({ dailyKcalTarget: kcal })
    setErrors(kcalErrors)
    if (!params || Object.keys(kcalErrors).length > 0) return
    setBusy(true)
    try {
      await completeOnboarding({ ...params, dailyKcalTarget: kcal! })
      await reloadMember() // onboardingCompleted=true → 가드가 홈으로 이동시킨다
    } catch (error) {
      const serverErrors = fieldErrorsFrom(error)
      if (serverErrors) {
        setErrors(serverErrors)
        setStep('input')
      } else {
        setGlobalError('저장에 실패했어요. 잠시 후 다시 시도해주세요.')
      }
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-semibold">온보딩</h1>
      {globalError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {globalError}
        </p>
      )}

      {step === 'input' && (
        <section className="mt-4 rounded-card bg-surface p-4 shadow-sm">
          <p className="mb-4 text-muted">목표 계산을 위해 기본 정보를 입력해주세요.</p>

          <Field id="gender" label="성별" error={errors.gender}>
            <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">선택</option>
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </Select>
          </Field>

          <Field id="birthYear" label="출생연도" error={errors.birthYear}>
            <TextInput id="birthYear" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
          </Field>

          <Field id="heightCm" label="키 (cm)" error={errors.heightCm}>
            <TextInput id="heightCm" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </Field>

          <Field id="weightKg" label="현재 체중 (kg)" error={errors.weightKg}>
            <TextInput id="weightKg" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </Field>

          <Field id="targetWeightKg" label="목표 체중 (kg)" error={errors.targetWeightKg}>
            <TextInput id="targetWeightKg" inputMode="decimal" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} />
          </Field>

          <Field id="activityLevel" label="활동량" error={errors.activityLevel}>
            <Select id="activityLevel" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
              <option value="">선택</option>
              <option value="LOW">낮음 (좌식 위주)</option>
              <option value="MID">보통 (가벼운 활동)</option>
              <option value="HIGH">높음 (활동적)</option>
            </Select>
          </Field>

          <Button type="button" onClick={goConfirm} disabled={busy} className="w-full">
            다음
          </Button>
        </section>
      )}

      {step === 'confirm' && (
        <section className="mt-4 rounded-card bg-surface p-4 shadow-sm">
          <p>
            제안 일일 칼로리: <strong className="text-brand">{suggested} kcal</strong>
          </p>
          <p className="mb-4 text-muted">그대로 쓰거나 원하는 값으로 수정할 수 있어요.</p>

          <Field id="dailyKcalTarget" label="일일 칼로리 목표" error={errors.dailyKcalTarget}>
            <TextInput id="dailyKcalTarget" inputMode="numeric" value={kcalInput} onChange={(e) => setKcalInput(e.target.value)} />
          </Field>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep('input')} disabled={busy} className="flex-1">
              이전
            </Button>
            <Button type="button" onClick={submit} disabled={busy} className="flex-1">
              시작하기
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}
