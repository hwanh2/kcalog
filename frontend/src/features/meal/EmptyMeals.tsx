import type { MealType } from '../../api/meal'
import { MEAL_TYPE_LABELS } from './mealDefaults'

/**
 * 끼니 빈 상태 — 그 끼니에 아직 기록이 없을 때.
 *
 * 예전에는 한 줄짜리 문구가 둥근 카드(24px) 안에 들어 있었다. 내용에 비해 카드가 커
 * **알약처럼 떠 보이면서** 정작 "아직 없다"는 사실은 작게 읽혔다. 즐겨찾기 빈 상태와
 * 같은 모양으로 맞춘다 — 일러스트 + 문구(DESIGN.md 6, `EmptyFavorites`).
 *
 * 그림은 **빈 식판**이다. 같은 화면 아래쪽 즐겨찾기 빈 상태가 접시를 쓰므로 소재를 갈라
 * 두 빈 상태가 서로 다른 자리를 말한다는 게 드러나게 한다("칸을 채운다" vs "별표로 담는다").
 *
 * 다음 행동 버튼을 따로 두지 않는 이유: 바로 아래가 "지금 추가하기"다.
 * 여기에 버튼을 또 두면 같은 곳으로 가는 입구가 한 화면에 둘이 된다.
 */
export function EmptyMeals({ mealType }: { mealType: MealType }) {
  return (
    <div className="py-8 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 160 120"
        className="mx-auto h-24 w-40 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/*
          식판 — 테두리와 빈 칸만. 칸이 비어 있다는 것 자체가 메시지다.
          칸 배치는 실제 식판대로: **얕은 반찬 칸이 위, 밥·국 칸이 아래**(앉은 사람 쪽).
          처음엔 위아래가 뒤집혀 있어 큰 칸이 위로 갔다.
        */}
        <rect x="18" y="26" width="124" height="70" rx="12" fill="currentColor" opacity="0.06" stroke="none" />
        <rect x="18" y="26" width="124" height="70" rx="12" opacity="0.2" />
        <rect x="32" y="36" width="32" height="14" rx="6" opacity="0.12" />
        <rect x="76" y="36" width="52" height="14" rx="6" opacity="0.12" />
        <circle cx="48" cy="72" r="14" opacity="0.16" />
        <rect x="76" y="60" width="52" height="24" rx="8" opacity="0.16" />
      </svg>
      <p className="mt-3 text-sm font-semibold text-muted">
        아직 {MEAL_TYPE_LABELS[mealType]} 기록이 없어요
      </p>
      <p className="mt-1 text-xs text-muted">아래에서 사진으로 찍거나 직접 담을 수 있어요</p>
    </div>
  )
}
