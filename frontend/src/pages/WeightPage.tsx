import { WeightPanel } from '../features/weight/WeightPanel'
import { TdeeCard } from '../features/tdee/TdeeCard'
import { todayLocalDate } from '../lib/date'

/** 체중 탭 — 오늘 체중 입력·추세선·목표 예상 + 유지칼로리(적응형 TDEE) */
export function WeightPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">체중</h1>
      <WeightPanel date={todayLocalDate()} />
      <TdeeCard />
    </section>
  )
}
