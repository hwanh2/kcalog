import { WeightPanel } from '../features/weight/WeightPanel'
import { TdeeCard } from '../features/tdee/TdeeCard'
import { todayLocalDate } from '../lib/date'

/** 체중 탭 — 오늘 체중 입력·추세선·목표 예상 + 유지칼로리(적응형 TDEE) */
export function WeightPage() {
  return (
    <section>
      {/* 하단 탭이 "체중"이라고 말하고 있다 — 같은 말을 본문에 또 적으면 첫 화면이 밀린다.
          다만 h1을 없애지는 않는다: 스크린리더는 제목으로 화면을 식별한다(app-shell 스펙) */}
      <h1 className="sr-only">체중</h1>
      <WeightPanel date={todayLocalDate()} />
      <TdeeCard />
    </section>
  )
}
