import { useEffect, useState } from 'react'

/**
 * 플랜을 만드는 동안 보여주는 화면 (design D20).
 *
 * 계산 자체는 순식간이라 결과가 즉시 튀어나온다. 그러면 회원 입장에서는 방금 답한 다섯 가지가
 * 쓰였는지 알 수 없다 — **무엇을 계산하고 있는지 한 줄씩 보여주면** 그 다섯 가지가 어디에
 * 들어갔는지가 드러난다. 연출이 아니라 계산 과정의 설명이다.
 *
 * 위저드 셸을 쓰지 않고 화면 전체를 차지한다. 단계 번호·뒤로가기·진행 막대·CTA는 지금 할 수 있는
 * 것이 없는 동안 손댈 수 없는 장식일 뿐이고, 시선을 진행 문구에서 뺏는다.
 *
 * 문구는 `role="status"`로 바꿔 읽히게 한다. 모션 축소 설정이면 담기는 연출이 멈추므로
 * (index.css 전역) 글이 유일한 단서가 된다.
 */
const STEPS = ['기초대사량을 계산하고 있어요', '활동량을 반영하고 있어요', '탄단지를 나누고 있어요']

/** 한 줄에 머무는 시간 — 읽고 넘어갈 만큼은 되어야 설명 구실을 한다 */
const STEP_MS = 1500

/** 플랜을 만드는 데 최소로 쓰는 시간. 응답이 이보다 느리면 응답을 기다린다 */
export const PLAN_BUILD_MS = STEP_MS * STEPS.length

export function PlanBuilding() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => Math.min(i + 1, STEPS.length - 1)), STEP_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-canvas px-6">
      <h1 className="text-center text-2xl font-bold text-balance text-ink">맞춤 플랜을 만들고 있어요</h1>

      <Plate filled={index + 1} />

      {/*
        live 영역(role="status")은 그대로 두고 안쪽만 바꾼다 — 영역째 갈아끼우면
        스크린리더가 새 영역으로 보고 바뀐 내용을 읽지 않을 수 있다.
      */}
      <p role="status" className="text-center text-sm font-medium text-ink">
        <span key={index} className="animate-fade-in inline-block">
          {STEPS[index]}
        </span>
      </p>
    </div>
  )
}

/**
 * 단계가 넘어갈 때마다 접시에 한 조각씩 담긴다 — 진행 표시(점 세 개)를 따로 두지 않아도
 * 어디까지 왔는지 보이고, 기다림이 "쌓이는 것"으로 읽힌다.
 *
 * 색은 앱의 탄·단·지 색 그대로다. 마지막 단계에서 접시가 다 차고, 곧바로 다음 화면의
 * 탄단지 카드로 이어진다 — 같은 색이 이어지므로 무엇이 담겼는지가 그때 밝혀진다.
 */
const FOODS = [
  { cx: 33, cy: 45, r: 9, className: 'fill-carb' },
  { cx: 49, cy: 43, r: 7.5, className: 'fill-protein' },
  { cx: 40, cy: 32, r: 6, className: 'fill-fat' },
]

function Plate({ filled }: { filled: number }) {
  return (
    <svg viewBox="0 0 80 80" role="img" aria-label="플랜을 담는 접시" className="h-28 w-28">
      {/* 위에서 내려다본 접시 — 옆에서 본 타원으로는 담긴 것이 접시 위에 떠 보였다.
          바깥 테두리와 안쪽 면을 나눠 그려야 접시로 읽힌다(랜딩 MealArt와 같은 방식) */}
      <circle cx="40" cy="40" r="30" className="fill-surface" />
      <circle cx="40" cy="40" r="30" className="stroke-border" fill="none" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="22" className="fill-track" />

      {FOODS.slice(0, filled).map((food) => (
        // key는 색으로 — 인덱스로 두면 조각이 늘 때 이미 놓인 것까지 다시 떨어진다
        <circle key={food.className} {...food} className={`${food.className} animate-drop-in`} />
      ))}
    </svg>
  )
}
