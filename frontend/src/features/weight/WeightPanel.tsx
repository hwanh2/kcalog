import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getWeightSummary, recordWeight } from '../../api/weight'
import { addDays } from '../../lib/date'
import { useMutationWithError } from '../../lib/useMutationWithError'
import { Card } from '../../ui/form'
import { WeightTrend } from './WeightTrend'
import { GoalEstimator } from './GoalEstimator'
import { prevChange, round1, sliceByRange } from './estimator'
import type { TrendRange } from './estimator'
import { validateWeight } from './weightValidation'

const RANGES: TrendRange[] = ['1주', '1개월', '3개월']

/** 체중 탭 위젯 — 스테퍼 입력 + 추세선(범위 토글) + 목표 에스티메이터. 요약은 [date-89, date] 조회(90일) */
export function WeightPanel({ date }: { date: string }) {
  const queryClient = useQueryClient()
  const from = addDays(date, -89)
  const { data: summary } = useQuery({
    queryKey: ['weightSummary', from, date],
    queryFn: () => getWeightSummary(from, date),
  })
  const existingKg = summary?.points.find((p) => p.logDate === date)?.weightKg
  const existing = existingKg != null

  /**
   * 그날 기록이 없으면 마지막으로 잰 값에서 시작한다 — 빈 칸(0.0)에서 시작하면 어제와 오늘이
   * 끊겨 읽힌다(design D3). ±0.1 버튼은 이미 이 값에서 출발하고 있었고, 화면에만 안 보였다.
   */
  const startKg = existingKg ?? summary?.latestKg ?? null
  /** 채워진 값이 **그날 잰 것이 아닐 때** — 출처를 밝히지 않으면 어제 값이 오늘 기록으로 들어간다 */
  const fromLatest = !existing && startKg != null

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<TrendRange>('1주')
  useEffect(() => {
    setInput(startKg != null ? String(startKg) : '')
    setError(null)
  }, [date, startKg])

  const mutation = useMutationWithError((weightKg: number) => recordWeight({ weightKg, logDate: date }), {
    errorMessage: '체중을 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weightSummary'] })
      void queryClient.invalidateQueries({ queryKey: ['weights'] }) // 대시보드 미니카드 갱신
    },
  })

  /** −/＋ 0.1 조절 — 현재 입력(없으면 기존일·최신값·70 순)에서 시작 */
  function step(delta: number) {
    const cur = Number(input)
    const base = input !== '' && Number.isFinite(cur) ? cur : (startKg ?? 70)
    setInput(String(round1(base + delta)))
    setError(null)
  }

  function save() {
    const result = validateWeight(input)
    if ('error' in result) {
      // 직전 저장 실패 문구를 함께 지운다 — 안 지우면 그게 남아 검증 오류를 가린다
      mutation.clearError()
      setError(result.error)
      return
    }
    setError(null)
    mutation.mutate(result.value) // 실패 문구는 useMutationWithError가 재시도 때 비운다
  }

  const [, m, d] = date.split('-')
  const change = summary ? prevChange(summary.points) : null
  const streak = summary?.streakDays ?? 0
  const chartPoints = summary ? sliceByRange(summary.points, range) : []

  return (
    <>
      {/* ① 체중 기록 — 오렌지 히어로 카드.
          위 여백은 셸의 <main pt-4>가 준다 — 여기서 또 얹으면 이 화면만 아래로 밀린다(design D8) */}
      <section className="rounded-card bg-gradient-to-br from-brand to-brand-dark p-5 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/80">
            오늘 · {Number(m)}월 {Number(d)}일
          </p>
          {streak > 0 && (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
              🔥 {streak}일 연속
            </span>
          )}
        </div>

        <div className="mt-2 flex items-end gap-1.5">
          <input
            aria-label="체중 (kg)"
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0.0"
            style={{ width: `${Math.max((input || '0.0').length, 1)}ch` }}
            className="rounded bg-transparent text-4xl font-extrabold tracking-tight text-white outline-none placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-white"
          />
          <span className="mb-0.5 text-lg font-semibold text-white/75">kg</span>
        </div>
        {/* 채워둔 값이 오늘 잰 것이 아님을 밝힌다 — 이게 없으면 그대로 저장해 어제 값이
            오늘 기록이 된다(design D3의 위험). 그날 기록이 있으면 뜨지 않는다 */}
        {fromLatest && (
          <p className="mt-1 text-sm text-white/80">최근 기록값이에요 · 오늘 잰 값으로 고쳐주세요</p>
        )}
        {change != null && (
          <p className="mt-1 text-sm text-white/80">
            {change.label}{' '}
            <span className="font-semibold text-white">
              {change.delta > 0 ? '+' : ''}
              {change.delta}kg
            </span>
          </p>
        )}
        {/*
          입력 검증 오류와 저장 실패를 같은 자리에 보여준다. save()가 한쪽을 세울 때 다른 쪽을
          비우므로 둘이 동시에 남지 않는다 — 뒤늦은 실패가 옛 검증 오류에 가려지지 않는다.
          색은 오렌지 히어로 카드 위라 text-danger가 오히려 안 읽혀 흰색을 쓴다(design "구현 이탈").
        */}
        {(error ?? mutation.error) && (
          <p role="alert" className="mt-1 text-sm font-medium text-white">
            {error ?? mutation.error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-label="0.1 감소"
            onClick={() => step(-0.1)}
            className="rounded-full bg-white/20 px-4 py-2.5 text-sm font-medium text-white active:bg-white/30"
          >
            − 0.1
          </button>
          <button
            type="button"
            aria-label="0.1 증가"
            onClick={() => step(0.1)}
            className="rounded-full bg-white/20 px-4 py-2.5 text-sm font-medium text-white active:bg-white/30"
          >
            ＋ 0.1
          </button>
          <button
            type="button"
            onClick={save}
            disabled={mutation.isPending}
            aria-label={existing ? '체중 수정' : '체중 저장'}
            className="flex-1 rounded-full bg-brand-soft py-2.5 font-semibold text-brand-ink disabled:opacity-70"
          >
            저장
          </button>
        </div>
      </section>

      {/* ② 추세선 */}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">체중 변화 추세선</p>
          <div className="flex rounded-full bg-canvas p-0.5 text-xs" role="tablist" aria-label="추세 범위">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1 ${
                  range === r ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <WeightTrend points={chartPoints} />
      </Card>

      {/* ③ 목표 달성 에스티메이터 (목표·기록 있을 때만) */}
      {summary && summary.latestKg != null && summary.points.length > 0 && (
        <GoalEstimator
          startKg={summary.points[0].weightKg}
          currentKg={summary.latestKg}
          projection={summary.projection}
        />
      )}
    </>
  )
}
