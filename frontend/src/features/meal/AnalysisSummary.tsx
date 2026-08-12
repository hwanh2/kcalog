import { totals } from './mealItems'
import type { EditableItem } from './mealItems'

/**
 * 분석 결과 요약 — 음식 수·총 칼로리·탄단지. 오버레이 모드에서도 값을 한눈에 훑게 한다.
 * 항목별 양(g)·신뢰도는 분석 응답에 없어 표시하지 않는다(지어내지 않음).
 */
export function AnalysisSummary({ items }: { items: EditableItem[] }) {
  const t = totals(items)
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted">분석 결과 · {items.length}개 음식</p>
        <p className="text-3xl font-black text-ink">
          {t.kcal.toLocaleString()}
          <span className="ml-1 text-base font-bold text-muted">kcal</span>
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5 text-center">
        <MacroChip label="탄" grams={t.carbG} className="bg-carb-soft text-carb" />
        <MacroChip label="단" grams={t.proteinG} className="bg-protein-soft text-protein" />
        <MacroChip label="지" grams={t.fatG} className="bg-fat-soft text-fat" />
      </div>
    </div>
  )
}

function MacroChip({ label, grams, className }: { label: string; grams: number; className: string }) {
  return (
    <div className={`rounded-tile px-2.5 py-1.5 ${className}`}>
      <p className="text-[11px] font-bold">{label}</p>
      <p className="text-sm font-black">{grams}g</p>
    </div>
  )
}

/** 음식 항목 리스트 — 행을 누르면 편집 시트가 열린다. 보정·오류 상태를 배지로 알린다.
 *  onFavorite을 주면 항목마다 ★이 붙어 그 값을 즐겨찾기로 저장할 수 있다 */
export function AnalyzedItemList({
  items,
  onSelect,
  onFavorite,
  selectedIndex = null,
  errorIndices,
}: {
  items: EditableItem[]
  onSelect: (index: number) => void
  onFavorite?: (index: number) => void
  selectedIndex?: number | null
  errorIndices?: number[]
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const hasError = errorIndices?.includes(index)
        const selected = selectedIndex === index
        return (
          <li key={index} className="relative">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`${item.name || '이름 없음'} 항목 편집`}
              aria-pressed={selected}
              className={`flex w-full items-center gap-2 rounded-tile border bg-surface px-4 py-3 text-left ${
                selected ? 'border-brand ring-1 ring-brand' : hasError ? 'border-danger' : 'border-border'
              } ${onFavorite ? 'pr-12' : ''}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">
                  {item.name || '이름 없음'}
                  {/* 오류는 테두리 색만으로 알리면 색을 못 보는 사용자에게 전달되지 않아 문구를 함께 단다 */}
                  {hasError && (
                    <span className="ml-1.5 rounded-full bg-protein-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">
                      확인 필요
                    </span>
                  )}
                  {item.corrected && (
                    <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-medium text-success">
                      내 보정값
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted">
                  {item.quantity && item.unit && (
                    <span className="mr-1 font-medium text-ink">
                      {item.quantity}
                      {item.unit} ·
                    </span>
                  )}
                  탄 {item.carbG || 0} · 단 {item.proteinG || 0} · 지 {item.fatG || 0}
                </span>
              </span>
              <span className="shrink-0 font-bold text-ink">{item.kcal || 0} kcal</span>
              <span aria-hidden className="shrink-0 text-muted">
                ›
              </span>
            </button>
            {onFavorite && (
              <button
                type="button"
                aria-label={`${item.name || '이름 없음'} 즐겨찾기에 저장`}
                onClick={() => onFavorite(index)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-lg text-muted"
              >
                ☆
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
