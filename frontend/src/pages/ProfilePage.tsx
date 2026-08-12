import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/dashboard'
import { getReport } from '../api/report'
import type { MemberResponse } from '../api/member'
import { getTdee } from '../api/tdee'
import { getWeightSummary } from '../api/weight'
import { useAuth } from '../auth/useAuth'
import { NutritionTargetCard } from '../features/profile/NutritionTargetCard'
import { ProfileEditSheet } from '../features/profile/ProfileEditSheet'
import { ProfileSummaryCard } from '../features/profile/ProfileSummaryCard'
import { WeeklySummaryCard } from '../features/profile/WeeklySummaryCard'
import { WeightProgressCard } from '../features/profile/WeightProgressCard'
import { addDays, todayLocalDate, todayServiceDate } from '../lib/date'
import { Button } from '../ui/form'

export function ProfilePage() {
  const { state, reloadMember, signOut } = useAuth()
  if (state.status !== 'authed') return null
  return <Profile member={state.member} reloadMember={reloadMember} signOut={signOut} />
}

/** 최근 3주 — 각 주의 아무 날짜(anchor)를 넘기면 서버가 그 주 범위로 잡아준다 */
const WEEK_ANCHORS = [14, 7, 0]

function Profile({
  member,
  reloadMember,
  signOut,
}: {
  member: MemberResponse
  reloadMember: () => Promise<void>
  signOut: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)

  const today = todayServiceDate()
  const weights = useQuery({
    queryKey: ['weights', 'summary', 'profile'],
    // 체중은 달력 날짜 기준(ServiceDay 미적용 — design D8)
    queryFn: () => getWeightSummary(addDays(todayLocalDate(), -89), todayLocalDate()),
  })
  const tdee = useQuery({ queryKey: ['tdee'], queryFn: getTdee })
  const dashboard = useQuery({ queryKey: ['dashboard', today], queryFn: () => getDashboard(today) })
  const reports = useQuery({
    queryKey: ['reports', 'weekly3'],
    queryFn: () => Promise.all(WEEK_ANCHORS.map((back) => getReport('WEEK', addDays(today, -back)))),
  })

  return (
    <section className="space-y-3 pb-2">
      <ProfileSummaryCard member={member} streakDays={weights.data?.streakDays ?? null} />

      <WeightProgressCard
        points={weights.data?.points ?? []}
        latestKg={weights.data?.latestKg ?? member.latestWeightKg}
        targetKg={member.targetWeightKg}
      />

      <NutritionTargetCard
        maintenanceKcal={tdee.data?.maintenanceKcal ?? null}
        targetKcal={member.dailyKcalTarget}
        carbTargetG={dashboard.data?.carbTargetG ?? null}
        proteinTargetG={dashboard.data?.proteinTargetG ?? null}
        fatTargetG={dashboard.data?.fatTargetG ?? null}
        onEdit={() => setEditing(true)}
      />

      <WeeklySummaryCard reports={reports.data ?? []} points={weights.data?.points ?? []} />

      <nav aria-label="설정" className="overflow-hidden rounded-card border border-border bg-surface">
        <MenuItem label="프로필 편집" onClick={() => setEditing(true)} />
        <MenuItem label="도움말 & 피드백" href="https://github.com/hwanh2/kcalog/issues" external />
        <MenuItem label="앱 정보" value={`v${APP_VERSION}`} />
      </nav>

      <Button type="button" variant="secondary" onClick={() => void signOut()} className="w-full">
        로그아웃
      </Button>

      <p className="pt-1 text-center text-[11px] text-muted">kcalog v{APP_VERSION}</p>

      {editing && (
        <ProfileEditSheet member={member} reloadMember={reloadMember} onClose={() => setEditing(false)} />
      )}
    </section>
  )
}

const APP_VERSION = '1.0.0'

/**
 * 설정 메뉴 한 줄 — 누를 수 있는 항목(onClick·href)만 화살표를 보여주고,
 * 값만 알리는 항목(앱 정보)은 오른쪽에 값을 둔다. 동작하지 않는 항목은 만들지 않는다.
 */
function MenuItem({
  label,
  value,
  onClick,
  href,
  external,
}: {
  label: string
  value?: string
  onClick?: () => void
  href?: string
  external?: boolean
}) {
  const body = (
    <>
      <span className="flex-1 text-left text-sm font-semibold text-ink">{label}</span>
      {value && <span className="text-xs font-medium text-muted">{value}</span>}
      {(onClick || href) && (
        <span aria-hidden className="text-muted">
          ›
        </span>
      )}
    </>
  )
  const className = 'flex w-full items-center gap-2 border-b border-border px-4 py-3.5 last:border-b-0'

  if (href) {
    return (
      <a
        href={href}
        className={className}
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {body}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}
