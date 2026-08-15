import { useQuery } from '@tanstack/react-query'
import { getTdee } from '../../api/tdee'
import { Card } from '../../ui/form'
import { TdeeSummary } from './TdeeSummary'

/** 유지칼로리 카드 — 체중 탭. 본문은 프로필 재계산 시트와 공유한다(design D4) */
export function TdeeCard() {
  const { data: tdee } = useQuery({ queryKey: ['tdee'], queryFn: getTdee })
  if (!tdee) return null

  return (
    <Card className="mt-4">
      <p className="font-semibold text-ink">내 유지칼로리</p>
      <TdeeSummary tdee={tdee} />
    </Card>
  )
}
