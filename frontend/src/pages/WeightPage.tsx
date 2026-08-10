import { useState } from 'react'
import { WeightPanel } from '../features/weight/WeightPanel'
import { todayLocalDate } from '../lib/date'

/** 체중 탭 — 날짜 선택 + 체중 입력·추이 (기존 기록 탭 위젯 이식) */
export function WeightPage() {
  const [date, setDate] = useState(todayLocalDate)

  return (
    <section>
      <h1 className="text-xl font-semibold">체중</h1>

      <label htmlFor="weight-date" className="mt-3 block text-sm text-muted">
        날짜
      </label>
      <input
        id="weight-date"
        type="date"
        value={date}
        onChange={(e) => e.target.value && setDate(e.target.value)}
        className="mt-1 rounded-md border border-border bg-surface px-3 py-2"
      />

      <WeightPanel date={date} />
    </section>
  )
}
