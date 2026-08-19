/**
 * 근육량 목표 여부. 탄단지 비율을 가른다 (design D3, D4).
 *
 * 목표 단계에서 방향(감량, 유지, 증량)을 고른 바로 아래에 둔다. 방향은 **체중이 어디로 갈지**이고,
 * 이 토글은 **그 체중을 근육으로 채우고 싶은지**다. 둘은 겹치지 않는다 , 
 * 감량하면서 근육을 지키려는 사람이 정확히 여기서 갈린다.
 *
 * 체크박스를 쓴다. 껐다 켜는 값 하나이고, 브라우저 기본 동작(키보드, 스크린리더)이 그대로 맞는다.
 */
export function MuscleGoalField({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label htmlFor="muscleGoal" className="flex min-h-11 items-start gap-3 rounded-tile py-2 text-sm">
      <input
        id="muscleGoal"
        name="muscleGoal"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand focus-visible:ring-2 focus-visible:ring-brand-ink"
      />
      <span className="min-w-0">
        <span className="block font-medium text-ink">근육량도 목표인가요?</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
          단백질 목표를 높이고 탄수화물을 그만큼 줄여요. 감량 중에 근육을 지킬 때도 켜세요.
        </span>
      </span>
    </label>
  )
}
