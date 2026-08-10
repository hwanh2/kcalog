import { WeightPanel } from '../features/weight/WeightPanel'
import { todayLocalDate } from '../lib/date'

/** 체중 탭 — 오늘 체중 입력·추세선·목표 에스티메이터 */
export function WeightPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">체중</h1>
      <WeightPanel date={todayLocalDate()} />
    </section>
  )
}
