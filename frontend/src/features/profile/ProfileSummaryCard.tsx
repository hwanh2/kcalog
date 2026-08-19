import type { ActivityLevel, Goal, MemberResponse } from '../../api/member'
import { ageFromBirthYear } from '../../lib/age'

const GOAL_LABELS: Record<Goal, string> = { CUT: '감량', MAINTAIN: '유지', BULK: '증량' }
const ACTIVITY_SHORT: Record<ActivityLevel, string> = {
  LOW: '적음',
  MID: '보통',
  HIGH: '활동적',
  VERY_HIGH: '매우 활동적',
}

/**
 * 프로필 머리 카드 — 브랜드 면에 이름·목표·연속 기록을 얹고, 아래 흰 띠에 신체 정보를 요약한다.
 * 값이 없는 항목은 '-'로 두어 자리(레이아웃)가 흔들리지 않게 한다.
 */
export function ProfileSummaryCard({
  member,
  streakDays,
}: {
  member: MemberResponse
  streakDays: number | null
}) {
  const stats = [
    { label: '성별', value: member.gender === null ? '-' : member.gender === 'MALE' ? '남성' : '여성' },
    { label: '키', value: member.heightCm === null ? '-' : `${member.heightCm}cm` },
    { label: '나이', value: ageOf(member.birthYear) },
    { label: '활동', value: member.activityLevel === null ? '-' : ACTIVITY_SHORT[member.activityLevel] },
  ]

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex items-center gap-3 bg-gradient-to-br from-brand to-brand-dark p-5">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-on-brand/25 text-on-brand"
        >
          <PersonIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-black text-on-brand">{member.nickname}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {member.goal && (
              <span className="rounded-full bg-on-brand/25 px-2 py-0.5 text-[11px] font-bold text-on-brand">
                {GOAL_LABELS[member.goal]}
              </span>
            )}
            {streakDays !== null && streakDays > 0 && (
              <span className="text-[11px] font-semibold text-on-brand/90">🔥 {streakDays}일 연속 기록</span>
            )}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-4 divide-x divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-3 text-center">
            <dt className="text-[11px] font-medium text-muted">{stat.label}</dt>
            <dd className="mt-0.5 text-sm font-bold text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** 만 나이가 아닌 연도 차이 — 생년만 받으므로 정확한 만 나이는 낼 수 없다 */
function ageOf(birthYear: number | null): string {
  if (birthYear === null) return '-'
  return `${ageFromBirthYear(birthYear)}세`
}

function PersonIcon() {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  )
}
