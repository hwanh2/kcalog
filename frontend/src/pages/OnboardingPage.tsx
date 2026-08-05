import { useState } from 'react'
import { fieldErrorsFrom } from '../api/client'
import { completeOnboarding, getKcalSuggestion } from '../api/member'
import type { ActivityLevel, Gender, KcalSuggestionParams } from '../api/member'
import { toNumber, validateProfileFields } from '../api/memberValidation'
import type { FieldErrors } from '../api/memberValidation'
import { useAuth } from '../auth/useAuth'

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
    <main>
      <h1>온보딩</h1>
      {globalError && <p role="alert">{globalError}</p>}

      {step === 'input' && (
        <section>
          <p>목표 계산을 위해 기본 정보를 입력해주세요.</p>

          <label htmlFor="gender">성별</label>
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">선택</option>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
          {errors.gender && <p role="alert">{errors.gender}</p>}

          <label htmlFor="birthYear">출생연도</label>
          <input id="birthYear" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
          {errors.birthYear && <p role="alert">{errors.birthYear}</p>}

          <label htmlFor="heightCm">키 (cm)</label>
          <input id="heightCm" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          {errors.heightCm && <p role="alert">{errors.heightCm}</p>}

          <label htmlFor="weightKg">현재 체중 (kg)</label>
          <input id="weightKg" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          {errors.weightKg && <p role="alert">{errors.weightKg}</p>}

          <label htmlFor="targetWeightKg">목표 체중 (kg)</label>
          <input id="targetWeightKg" inputMode="decimal" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} />
          {errors.targetWeightKg && <p role="alert">{errors.targetWeightKg}</p>}

          <label htmlFor="activityLevel">활동량</label>
          <select id="activityLevel" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
            <option value="">선택</option>
            <option value="LOW">낮음 (좌식 위주)</option>
            <option value="MID">보통 (가벼운 활동)</option>
            <option value="HIGH">높음 (활동적)</option>
          </select>
          {errors.activityLevel && <p role="alert">{errors.activityLevel}</p>}

          <button type="button" onClick={goConfirm} disabled={busy}>
            다음
          </button>
        </section>
      )}

      {step === 'confirm' && (
        <section>
          <p>
            제안 일일 칼로리: <strong>{suggested} kcal</strong>
          </p>
          <p>그대로 쓰거나 원하는 값으로 수정할 수 있어요.</p>

          <label htmlFor="dailyKcalTarget">일일 칼로리 목표</label>
          <input id="dailyKcalTarget" inputMode="numeric" value={kcalInput} onChange={(e) => setKcalInput(e.target.value)} />
          {errors.dailyKcalTarget && <p role="alert">{errors.dailyKcalTarget}</p>}

          <button type="button" onClick={() => setStep('input')} disabled={busy}>
            이전
          </button>
          <button type="button" onClick={submit} disabled={busy}>
            시작하기
          </button>
        </section>
      )}
    </main>
  )
}
