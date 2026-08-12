import type { ProjectionInfo } from '../../api/weight'
import { Card } from '../../ui/form'
import { daysUntil, formatKoreanDate, progressFraction, round1 } from './estimator'
import { todayLocalDate } from '../../lib/date'

/** 목표 달성 예상 — 밝은 카드. 목표가 있을 때만 렌더(부모가 판단).
 *  진행바(시작·현재·목표) + status별 안내. ON_TRACK이면 D-day·페이스·예상일 표시. 도달 상태는 별도 문구 */
export function GoalEstimator({
  startKg,
  currentKg,
  projection,
}: {
  startKg: number
  currentKg: number
  projection: ProjectionInfo
}) {
  const target = projection.targetKg
  if (target == null) return null

  const remaining = round1(target - currentKg) // 목표까지 (음수=감량 필요)
  const fraction = progressFraction(startKg, currentKg, target)
  // 도달: weeks 0 또는 잔여 거의 0 (백엔드가 projectedDate=최신기록일로 주는 케이스)
  const reached = projection.status === 'ON_TRACK' && (projection.weeks === 0 || Math.abs(remaining) < 0.1)
  const onTrackFuture = projection.status === 'ON_TRACK' && !reached && projection.projectedDate != null
  // 최신 기록이 과거면 예상일이 과거가 될 수 있어 D-day는 양수일 때만 노출
  const dday = onTrackFuture ? daysUntil(todayLocalDate(), projection.projectedDate as string) : null

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">목표 달성 예상</p>
        {dday != null && dday > 0 && (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink">
            예상 D-{dday}일
          </span>
        )}
      </div>
      <h2 className="mt-1 text-lg font-bold text-ink">
        {reached ? (
          <>목표 체중 {target} kg 도달 🎉</>
        ) : (
          <>
            목표 체중 {target} kg까지{' '}
            <span className="text-brand-ink">
              {remaining > 0 ? '+' : ''}
              {remaining} kg
            </span>
          </>
        )}
      </h2>

      {/* 진행바 — 시작→목표 중 현재 위치 */}
      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-carb"
            style={{ width: `${Math.round(fraction * 100)}%` }}
            role="progressbar"
            aria-valuenow={Math.round(fraction * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>시작 {round1(startKg)}kg</span>
          <span className="font-medium text-ink">현재 {round1(currentKg)}kg</span>
          <span>목표 {target}kg</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        {reached ? (
          '🎉 목표 체중에 도달했어요!'
        ) : onTrackFuture ? (
          <>
            💡 현재 페이스(주당 평균 {projection.weeklyRateKg}kg) 지속 시,{' '}
            <span className="font-medium text-brand-ink">{formatKoreanDate(projection.projectedDate as string)}</span>
            에 도달할 것으로 계산돼요.
          </>
        ) : projection.status === 'INSUFFICIENT_DATA' ? (
          '기록이 더 쌓이면 목표 도달 예상일을 알려드려요.'
        ) : (
          '현재 추세로는 목표 도달을 예상하기 어려워요.'
        )}
      </p>
    </Card>
  )
}
