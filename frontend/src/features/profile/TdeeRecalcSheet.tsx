import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTdee } from '../../api/tdee'
import type { TdeeInfo } from '../../api/tdee'
import { Sheet } from '../../ui/Sheet'
import { TdeeSummary } from '../tdee/TdeeSummary'

/**
 * 유지칼로리 다시 계산 — 지금 프로필·기록 기준의 유지칼로리를 보여주고 목표에 반영한다.
 *
 * "다시 계산"은 서버에 새 계산을 시키는 것이 아니다. `GET /api/tdee`가 부를 때마다 최근 기록으로
 * 계산하므로 값은 늘 최신이고, 이 시트가 하는 일은 **결과를 보여주고 목표에 반영하는 것**이다.
 * 다만 열 때 캐시를 무효화한다 — "다시 계산"을 눌렀는데 옛 값이 뜨면 버튼이 거짓말이 된다(design D4).
 */
export function TdeeRecalcSheet({ onApplied, onClose }: { onApplied: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: tdee } = useQuery({ queryKey: ['tdee'], queryFn: getTdee })

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['tdee'] })
  }, [queryClient])

  return (
    <Sheet label="유지칼로리 다시 계산" onClose={onClose}>
      <p className="mb-1 text-lg font-bold text-ink">유지칼로리 다시 계산</p>
      <p className="text-sm text-muted">지금 프로필과 최근 기록으로 계산한 값이에요.</p>

      {/* 조회 전에는 아무것도 그리지 않는다 — 빈 숫자가 잠깐 떴다 바뀌면 재계산이 실패한 것처럼 보인다 */}
      {tdee && (
        <div className="mt-3">
          <TdeeSummary
            tdee={tdee}
            onApplied={() => {
              onApplied()
              onClose()
            }}
          />
          <Basis tdee={tdee} />
        </div>
      )}
    </Sheet>
  )
}

/**
 * 계산 근거 — 무엇을 넣어 이 숫자가 나왔는지.
 * 배지("최근 14일 실측")는 **어느 방식인지**만 말한다. 그 방식이 무엇을 보는지까지 말해야
 * 회원이 숫자를 믿거나 의심할 근거가 생긴다 — 특히 목표 칼로리를 바꾸라고 권하는 자리다.
 *
 * ⚠️ 목표 조정폭(감량 −500 등)은 여기 적지 않는다. 서버가 가진 정책 상수를 화면에 베껴 두면
 * 서버만 바뀌었을 때 화면이 조용히 거짓말을 한다(NutritionTargetCard가 탄단지에서 같은 이유로 피한 것).
 */
function Basis({ tdee }: { tdee: TdeeInfo }) {
  const adaptive = tdee.source === 'ADAPTIVE'
  return (
    <section aria-label="계산 근거" className="mt-4 rounded-tile bg-canvas p-3">
      <h3 className="text-xs font-bold text-ink">무엇으로 계산했나요?</h3>
      {tdee.maintenanceKcal == null ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          최근 {tdee.windowDays}일 동안의 식사 기록과 체중 기록으로 계산해요. 둘 중 하나라도 부족하면 성별·나이·키·체중·활동량으로
          추정하는데, 그 값들도 아직 다 채워지지 않았어요.
        </p>
      ) : adaptive ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          최근 {tdee.windowDays}일간 <strong className="font-semibold text-ink">기록한 식사의 하루 평균 칼로리</strong>에서, 같은 기간{' '}
          <strong className="font-semibold text-ink">체중 추세가 움직인 만큼</strong>을 에너지로 환산해 더하거나 뺐어요(체지방 1kg
          ≈ 7,700kcal). 살이 빠지고 있었다면 먹은 것보다 더 썼다는 뜻이라 유지칼로리가 섭취량보다 높게 나와요.
        </p>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          아직 실제 기록으로 역산할 만큼 데이터가 없어 <strong className="font-semibold text-ink">성별·나이·키·현재 체중</strong>으로
          기초대사량을 구하고 <strong className="font-semibold text-ink">활동량</strong>을 곱한 추정치예요. 최근 {tdee.windowDays}일
          중 대부분의 날에 식사를 기록하고 체중을 두 번 이상 재면 내 기록으로 다시 계산해요.
        </p>
      )}
      {tdee.recommendedTargetKcal != null && (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          추천 목표는 이 유지칼로리에 <strong className="font-semibold text-ink">내 목표 방향(감량·유지·증량)</strong>만큼 더하거나 뺀
          값이에요. 목표 방향은 프로필 편집에서 바꿀 수 있어요.
        </p>
      )}
    </section>
  )
}
