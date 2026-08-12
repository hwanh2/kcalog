/**
 * 탄·단·지 표시 — 앱 전체에서 같은 색을 쓴다(탄 앰버 · 단 로즈 · 지 시안).
 * tone="chip"은 배경 있는 칩(기록 카드), "text"는 배경 없는 글자(목록 한 줄)로 쓴다.
 */
export function MacroChips({
  carbG,
  proteinG,
  fatG,
  tone = 'chip',
}: {
  carbG: number
  proteinG: number
  fatG: number
  tone?: 'chip' | 'text'
}) {
  const macros = [
    { label: '탄', value: carbG, chip: 'bg-carb-soft text-carb', text: 'text-carb' },
    { label: '단', value: proteinG, chip: 'bg-protein-soft text-protein', text: 'text-protein' },
    { label: '지', value: fatG, chip: 'bg-fat-soft text-fat', text: 'text-fat' },
  ]
  return (
    <div className={tone === 'chip' ? 'flex flex-wrap gap-1.5' : 'flex gap-2'}>
      {macros.map((macro) => (
        <span
          key={macro.label}
          className={
            tone === 'chip'
              ? `rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${macro.chip}`
              : `text-[11px] font-semibold ${macro.text}`
          }
        >
          {macro.label} {macro.value}
          {tone === 'chip' ? 'g' : ''}
        </span>
      ))}
    </div>
  )
}
