import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fieldErrorsFrom } from '../api/client'
import { getKcalSuggestion, updateMember } from '../api/member'
import type { ActivityLevel, MemberResponse, UpdateMemberRequest } from '../api/member'
import { toNumber, validateProfileFields } from '../api/memberValidation'
import type { FieldErrors } from '../api/memberValidation'
import { useAuth } from '../auth/useAuth'

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  LOW: '낮음 (좌식 위주)',
  MID: '보통 (가벼운 활동)',
  HIGH: '높음 (활동적)',
}

export function ProfilePage() {
  const { state, reloadMember, signOut } = useAuth()
  if (state.status !== 'authed') return null
  return <ProfileForm member={state.member} reloadMember={reloadMember} signOut={signOut} />
}

function ProfileForm({
  member,
  reloadMember,
  signOut,
}: {
  member: MemberResponse
  reloadMember: () => Promise<void>
  signOut: () => Promise<void>
}) {
  const [heightCm, setHeightCm] = useState(String(member.heightCm ?? ''))
  const [targetWeightKg, setTargetWeightKg] = useState(String(member.targetWeightKg ?? ''))
  const [activityLevel, setActivityLevel] = useState<string>(member.activityLevel ?? '')
  const [kcalInput, setKcalInput] = useState(String(member.dailyKcalTarget ?? ''))
  const [suggested, setSuggested] = useState<number | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 키·목표 체중·활동량이 저장값과 달라지면 새 제안 칼로리를 조회해 보여준다 (확정은 사용자 몫)
  useEffect(() => {
    const parsedHeight = toNumber(heightCm)
    const parsedTarget = toNumber(targetWeightKg)
    const changed =
      parsedHeight !== member.heightCm ||
      parsedTarget !== member.targetWeightKg ||
      activityLevel !== member.activityLevel
    const valid =
      parsedHeight !== null && parsedTarget !== null && activityLevel !== '' &&
      Object.keys(validateProfileFields({ heightCm: parsedHeight, targetWeightKg: parsedTarget })).length === 0
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
      targetWeightKg: parsedTarget,
      activityLevel: activityLevel as ActivityLevel,
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
  }, [heightCm, targetWeightKg, activityLevel, member])

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
    if (parsed.dailyKcalTarget !== member.dailyKcalTarget) request.dailyKcalTarget = parsed.dailyKcalTarget!
    if (Object.keys(request).length === 0) {
      setMessage('변경된 내용이 없습니다.')
      return
    }

    setBusy(true)
    try {
      await updateMember(request)
      await reloadMember()
      setMessage('저장했습니다.')
    } catch (error) {
      const serverErrors = fieldErrorsFrom(error)
      if (serverErrors) setErrors(serverErrors)
      else setMessage('저장에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h1>프로필</h1>
      <p>
        {member.nickname}
        {member.email ? ` · ${member.email}` : ''}
      </p>
      <p>최신 체중: {member.latestWeightKg ?? '-'} kg</p>

      {message && <p role="status">{message}</p>}

      <label htmlFor="heightCm">키 (cm)</label>
      <input id="heightCm" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
      {errors.heightCm && <p role="alert">{errors.heightCm}</p>}

      <label htmlFor="targetWeightKg">목표 체중 (kg)</label>
      <input id="targetWeightKg" inputMode="decimal" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} />
      {errors.targetWeightKg && <p role="alert">{errors.targetWeightKg}</p>}

      <label htmlFor="activityLevel">활동량</label>
      <select id="activityLevel" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
        {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {suggested !== null && (
        <p>
          새 제안 일일 칼로리: <strong>{suggested} kcal</strong>{' '}
          <button type="button" onClick={() => setKcalInput(String(suggested))}>
            제안 적용
          </button>
        </p>
      )}

      <label htmlFor="dailyKcalTarget">일일 칼로리 목표</label>
      <input id="dailyKcalTarget" inputMode="numeric" value={kcalInput} onChange={(e) => setKcalInput(e.target.value)} />
      {errors.dailyKcalTarget && <p role="alert">{errors.dailyKcalTarget}</p>}

      <div>
        <button type="button" onClick={save} disabled={busy}>
          저장
        </button>
      </div>

      <hr />
      <Link to="/">홈으로</Link>
      <button type="button" onClick={() => void signOut()}>
        로그아웃
      </button>
    </main>
  )
}
