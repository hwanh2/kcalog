import { useEffect, useState } from 'react'
import { fieldErrorsFrom } from '../../api/client'
import { getKcalSuggestion, updateMember } from '../../api/member'
import type { ActivityLevel, Gender, Goal, MemberResponse, UpdateMemberRequest } from '../../api/member'
import { toNumber, validateProfileFields } from '../../api/memberValidation'
import type { FieldErrors } from '../../api/memberValidation'
import { ageFromBirthYear } from '../../lib/age'
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
  BULK: '체중 증량',
}

const GENDER_LABELS: Record<Gender, string> = { MALE: '남성', FEMALE: '여성' }

/**
 * 입력한 출생연도를 나이로 환산해 라벨에 붙인다 — 프로필 카드는 "나이 32세"로 보여주는데
 * 여기서 "출생연도 1994"만 물으면 같은 값인지 확신할 수 없다. 범위를 벗어나면 붙이지 않는다.
 * 프로필 카드와 같은 환산을 쓴다(lib/age. 세는나이. 생년만 받으므로 만 나이는 낼 수 없다).
 */
function ageSuffix(birthYear: string): string {
  const parsed = toNumber(birthYear)
  if (parsed === null || Object.keys(validateProfileFields({ birthYear: parsed })).length > 0) return ''
  return ` (${ageFromBirthYear(parsed)}세)`
}

/**
 * 프로필 편집 시트 — 성별·출생연도·키·목표 체중·목표 방향·활동량·일일 칼로리.
 * 저장값과 달라진 필드만 PATCH하고, 계산에 영향을 주는 값이 바뀌면 새 제안 칼로리를 보여준다(확정은 사용자 몫).
 *
 * 성별·출생연도까지 여는 이유: 프로필 카드가 보여주는 넉 줄(성별·키·나이·활동) 중 둘을 고칠 수 없었고,
 * 그 둘이 유지칼로리 공식에 직접 들어간다 — 잘못 넣으면 이후 계산이 계속 틀어진다(design D1·D2).
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
  const [gender, setGender] = useState<string>(member.gender ?? '')
  const [birthYear, setBirthYear] = useState(String(member.birthYear ?? ''))
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

  // 계산에 들어가는 값(성별·출생연도·키·활동량·목표 방향)이 저장값과 달라지면 새 제안 칼로리를 조회해 보여준다.
  // ⚠️ 조회에 넘기는 것은 **편집 중인 값**이다 — 저장값을 넘기면 방금 고친 성별·나이가 제안에 안 들어간다
  useEffect(() => {
    const parsedHeight = toNumber(heightCm)
    const parsedBirthYear = toNumber(birthYear)
    const changed =
      parsedHeight !== member.heightCm ||
      parsedBirthYear !== member.birthYear ||
      gender !== (member.gender ?? '') ||
      activityLevel !== member.activityLevel ||
      goal !== (member.goal ?? '')
    const valid =
      parsedHeight !== null &&
      parsedBirthYear !== null &&
      gender !== '' &&
      activityLevel !== '' &&
      goal !== '' &&
      Object.keys(validateProfileFields({ heightCm: parsedHeight, birthYear: parsedBirthYear })).length === 0
    if (!changed || !valid || member.latestWeightKg === null) {
      setSuggested(null)
      return
    }
    let cancelled = false
    getKcalSuggestion({
      gender: gender as Gender,
      birthYear: parsedBirthYear,
      heightCm: parsedHeight,
      weightKg: member.latestWeightKg,
      activityLevel: activityLevel as ActivityLevel,
      goal: goal as Goal,
      // 이 시트가 쓰는 것은 제안 칼로리뿐이고 근육량 목표는 거기 영향을 주지 않는다.
      // 그래도 저장값을 그대로 실어 보낸다. 응답의 탄단지가 회원의 실제 목표와 어긋나지 않게
      muscleGoal: member.muscleGoal,
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
  }, [gender, birthYear, heightCm, activityLevel, goal, member])

  async function save() {
    setMessage(null)
    const parsed = {
      birthYear: toNumber(birthYear),
      heightCm: toNumber(heightCm),
      targetWeightKg: toNumber(targetWeightKg),
      dailyKcalTarget: toNumber(kcalInput),
    }
    const fieldErrors = validateProfileFields(parsed)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    // 저장값과 달라진 필드만 PATCH
    const request: UpdateMemberRequest = {}
    if (gender !== (member.gender ?? '') && gender !== '') request.gender = gender as Gender
    if (parsed.birthYear !== member.birthYear) request.birthYear = parsed.birthYear!
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

      <Field id="gender" label="성별">
        <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">선택</option>
          {Object.entries(GENDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      {/*
        저장하는 값은 출생연도다 — 만 나이를 저장하면 해가 바뀔 때마다 값이 썩어 유지칼로리가
        조용히 틀려진다(design D1). 프로필 카드는 "나이"로 보여주므로 아래에 환산값을 함께 둔다.
      */}
      <Field id="birthYear" label={`출생연도${ageSuffix(birthYear)}`} error={errors.birthYear}>
        <TextInput id="birthYear" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
      </Field>

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

      {/*
        문장 속 ghost 버튼(회색 글자)이라 누를 수 있는 줄 모른다는 지적을 받았다.
        아래 "추천 목표" 줄과 같은 모양 — 면 위에 값과 버튼을 갈라 놓아 누를 것이 드러나게 한다.
      */}
      {suggested !== null && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-tile bg-brand-soft p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-ink">새 제안 일일 칼로리</p>
            <p className="font-semibold text-ink">{suggested} kcal</p>
          </div>
          <Button type="button" onClick={() => setKcalInput(String(suggested))} className="shrink-0">
            제안 적용
          </Button>
        </div>
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
