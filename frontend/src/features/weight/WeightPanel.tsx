import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getWeights, recordWeight } from '../../api/weight'
import { addDays } from '../../lib/date'
import { Button, Card, TextInput } from '../../ui/form'
import { WeightTrend } from './WeightTrend'
import { validateWeight } from './weightValidation'

/** 기록 탭 체중 위젯 — 선택 날짜의 체중 입력(upsert) + 최근 30일 추이. date 기준 [date-29d, date] 조회 */
export function WeightPanel({ date }: { date: string }) {
  const queryClient = useQueryClient()
  const from = addDays(date, -29)
  const { data: weights } = useQuery({
    queryKey: ['weights', from, date],
    queryFn: () => getWeights(from, date),
  })
  const existing = weights?.find((w) => w.logDate === date)
  const existingKg = existing?.weightKg

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  // 날짜 변경·기존값 로드 시 입력 동기화 (객체가 아닌 값에 의존해 불필요한 재실행 방지)
  useEffect(() => {
    setInput(existingKg != null ? String(existingKg) : '')
    setError(null)
  }, [date, existingKg])

  const mutation = useMutation({
    mutationFn: (weightKg: number) => recordWeight({ weightKg, logDate: date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weights'] }),
  })

  function save() {
    const result = validateWeight(input)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setError(null)
    mutation.mutate(result.value)
  }

  return (
    <Card className="mt-4">
      <p className="mb-2 font-medium">체중 기록</p>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <TextInput
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="체중 (kg)"
            placeholder="kg"
          />
          {error && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        <Button type="button" onClick={save} disabled={mutation.isPending} aria-label={existing ? '체중 수정' : '체중 저장'}>
          {existing ? '수정' : '저장'}
        </Button>
      </div>

      <WeightTrend weights={weights ?? []} />
    </Card>
  )
}
