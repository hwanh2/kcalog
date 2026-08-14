import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTdee } from '../../api/tdee'
import { updateMember } from '../../api/member'
import { useSafeMutation } from '../../lib/useSafeMutation'
import { ErrorNotice } from '../../ui/ErrorNotice'
import { Button, Card } from '../../ui/form'

/** 유지칼로리 카드 — 실측/공식 TDEE와 추천 목표. "적용"은 기존 회원 PATCH로 dailyKcalTarget 갱신 */
export function TdeeCard() {
  const queryClient = useQueryClient()
  const { data: tdee } = useQuery({ queryKey: ['tdee'], queryFn: getTdee })

  const apply = useSafeMutation((kcal: number) => updateMember({ dailyKcalTarget: kcal }), {
    errorMessage: '목표 칼로리를 적용하지 못했어요. 잠시 후 다시 시도해주세요.',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tdee'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  if (!tdee) return null

  // 프로필·기록 부족으로 유지칼로리조차 못 낸 경우
  if (tdee.maintenanceKcal == null) {
    return (
      <Card className="mt-4">
        <p className="font-semibold text-ink">내 유지칼로리</p>
        <p className="mt-1 text-sm text-muted">체중과 식사를 꾸준히 기록하면 실제 데이터로 유지칼로리를 계산해드려요.</p>
      </Card>
    )
  }

  const rec = tdee.recommendedTargetKcal
  const canApply = rec != null && rec !== tdee.currentTargetKcal
  const adaptive = tdee.source === 'ADAPTIVE'

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">내 유지칼로리</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            adaptive ? 'bg-brand-soft text-brand-ink' : 'bg-canvas text-muted'
          }`}
        >
          {adaptive ? `최근 ${tdee.windowDays}일 실측` : '공식 추정'}
        </span>
      </div>
      <p className="mt-1 text-2xl font-bold text-ink">
        {tdee.maintenanceKcal.toLocaleString()} <span className="text-base font-normal text-muted">kcal</span>
      </p>
      {!adaptive && <p className="mt-1 text-xs text-muted">데이터가 더 쌓이면 실제 대사에 맞게 정밀해져요.</p>}

      {rec != null && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-canvas p-3">
          <div>
            <p className="text-xs text-muted">추천 목표</p>
            <p className="font-semibold text-ink">{rec.toLocaleString()} kcal</p>
          </div>
          {canApply ? (
            <Button type="button" onClick={() => apply.mutate(rec)} disabled={apply.isPending}>
              적용
            </Button>
          ) : (
            <span className="text-xs text-success">현재 목표와 같아요</span>
          )}
        </div>
      )}
      <ErrorNotice message={apply.error} className="mt-2" />
    </Card>
  )
}
