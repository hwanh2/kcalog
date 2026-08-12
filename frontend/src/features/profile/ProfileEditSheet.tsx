import { useEffect, useState } from 'react'
import { fieldErrorsFrom } from '../../api/client'
import { getKcalSuggestion, updateMember } from '../../api/member'
import type { ActivityLevel, Goal, MemberResponse, UpdateMemberRequest } from '../../api/member'
import { toNumber, validateProfileFields } from '../../api/memberValidation'
import type { FieldErrors } from '../../api/memberValidation'
import { Sheet } from '../../ui/Sheet'
import { Button, Field, Select, TextInput } from '../../ui/form'

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  LOW: '거의 앉아서 생활 (주 0~1회 운동)',
  MID: '보통 (주 2~3회 운동)',
  HIGH: '활동적 (주 4~5회 운동)',
  VERY_HIGH: '매우 활동적 (거의 매일 운동 · 육체노동)',
}

const GOAL_LABELS: Record<Goal, string> = {
  CUT: '체중 감량',
  MAINTAIN: '체중 유지',
  BULK: '근육 증량',
}

/**
 * 프로필 편집 시트 — 키·목표 체중·목표 방향·활동량·일일 칼로리.
 * 저장값과 달라진 필드만 PATCH하고, 계산에 영향을 주는 값이 바뀌면 새 제안 칼로리를 보여준다(확정은 사용자 몫).
 */
export function ProfileEditSheet({
  member,
  reloadMember,
  onClose,
}: {
  member: MemberResponse
  reloadMember: () => Promise<void>
  onClose: () => void
}) {
  const [heightCm, setHeightCm] = useState(String(member.heightCm ?? ''))
  const [targetWeightKg, setTargetWeightKg] = useState(String(member.targetWeightKg ?? ''))
  const [activityLevel, setActivityLevel] = useState<string>(member.activityLevel ?? '')
  const [goal, setGoal] = useState<string>(member.goal ?? '')
  const [kcalInput, setKcalInput] = useState(String(member.dailyKcalTarget ?? ''))
  const [suggested, setSuggested] = useState<number | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  // 안내와 오류는 알리는 방식이 달라야 한다(status vs alert)
  const [message, setMessage] = useState<{ text: string; kind: 'info' | 'error' } | null>(null)
  const [busy, setBusy] = useState(false)

  // 키·활동량·목표 방향이 저장값과 달라지면 새 제안 칼로리를 조회해 보여준다
  useEffect(() => {
    const parsedHeight = toNumber(heightCm)
    const changed =
      parsedHeight !== member.heightCm || activityLevel !== member.activityLevel || goal !== (member.goal ?? '')
    const valid =
      parsedHeight !== null &&
      activityLevel !== '' &&
      goal !== '' &&
      Object.keys(validateProfileFields({ heightCm: parsedHeight })).length === 0
    if (!changed || !valid || member.gender === null || member.birthYear === null || member.latestWeightKg === null) {
      setSuggested(null)
      return
    }
    let cancelled = false
    getKcalSuggestion({
      gender: member.gender,
      birthYear: member.birthYear,
      heightCm: parsedHeight,
      weightKg: member.latestWeightKg,
      activityLevel: activityLevel as ActivityLevel,
      goal: goal as Goal,
    })
      .then((r) => {
        if (!cancelled) setSuggested(r.dailyKcalTarget)
      })
      .catch(() => {
        if (!cancelled) setSuggested(null)
      })
    return () => {
      cancelled = true
    }
  }, [heightCm, activityLevel, goal, member])

  async function save() {
    setMessage(null)
    const parsed = {
      heightCm: toNumber(heightCm),
      targetWeightKg: toNumber(targetWeightKg),
      dailyKcalTarget: toNumber(kcalInput),
    }
    const fieldErrors = validateProfileFields(parsed)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    // 저장값과 달라진 필드만 PATCH
    const request: UpdateMemberRequest = {}
    if (parsed.heightCm !== member.heightCm) request.heightCm = parsed.heightCm!
    if (parsed.targetWeightKg !== member.targetWeightKg) request.targetWeightKg = parsed.targetWeightKg!
    if (activityLevel !== member.activityLevel) request.activityLevel = activityLevel as ActivityLevel
    if (goal !== (member.goal ?? '') && goal !== '') request.goal = goal as Goal
    if (parsed.dailyKcalTarget !== member.dailyKcalTarget) request.dailyKcalTarget = parsed.dailyKcalTarget!
    if (Object.keys(request).length === 0) {
      setMessage({ text: '변경된 내용이 없습니다.', kind: 'info' })
      return
    }

    setBusy(true)
    try {
      await updateMember(request)
      await reloadMember()
      onClose()
    } catch (error) {
      const serverErrors = fieldErrorsFrom(error)
      if (serverErrors) setErrors(serverErrors)
      else setMessage({ text: '저장에 실패했어요. 잠시 후 다시 시도해주세요.', kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet label="프로필 편집" onClose={onClose} full>
      <p className="mb-3 text-lg font-bold text-ink">프로필 편집</p>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mb-3 text-sm ${message.kind === 'error' ? 'font-medium text-danger' : 'text-brand-ink'}`}
        >
          {message.text}
        </p>
      )}

      <Field id="heightCm" label="키 (cm)" error={errors.heightCm}>
        <TextInput id="heightCm" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
      </Field>

      <Field id="targetWeightKg" label="목표 체중 (kg, 선택)" error={errors.targetWeightKg}>
        <TextInput
          id="targetWeightKg"
          inputMode="decimal"
          value={targetWeightKg}
          onChange={(e) => setTargetWeightKg(e.target.value)}
        />
      </Field>

      <Field id="goal" label="목표">
        <Select id="goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="">선택</option>
          {Object.entries(GOAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="activityLevel" label="활동량">
        <Select id="activityLevel" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      {suggested !== null && (
        <p className="mb-4 text-sm text-muted">
          새 제안 일일 칼로리: <strong className="text-ink">{suggested} kcal</strong>{' '}
          <Button type="button" variant="ghost" onClick={() => setKcalInput(String(suggested))}>
            제안 적용
          </Button>
        </p>
      )}

      <Field id="dailyKcalTarget" label="일일 칼로리 목표" error={errors.dailyKcalTarget}>
        <TextInput
          id="dailyKcalTarget"
          inputMode="numeric"
          value={kcalInput}
          onChange={(e) => setKcalInput(e.target.value)}
        />
      </Field>

      <Button type="button" onClick={save} disabled={busy} className="w-full py-3">
        저장
      </Button>
    </Sheet>
  )
}
