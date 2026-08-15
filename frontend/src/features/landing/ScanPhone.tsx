import { MealArt } from './MealArt'

/**
 * "찍는 순간" 장면 — 카메라 화면 위로 스캔 선이 오르내리고 인식한 이름표가 떠 있다.
 * 스캔 선은 앱의 분석 중 화면과 같은 `animate-scan`을 쓴다(움직임 줄이기 설정이면 멈춘다).
 */
export function ScanPhone({ className = '' }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="음식 사진을 찍으면 AI가 김치찌개·흰쌀밥·계란말이를 찾아내는 화면"
      className={`relative w-[16rem] shrink-0 rounded-[2.25rem] bg-ink p-2.5 shadow-2xl sm:w-[18rem] ${className}`}
    >
      <div className="relative h-[34rem] overflow-hidden rounded-[1.75rem] bg-ink">
        <div className="absolute left-1/2 top-2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" />

        {/* 카메라가 보고 있는 것 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <MealArt className="h-auto w-full" />
        </div>

        {/* 초점 격자 */}
        <div className="absolute inset-6 top-16 bottom-28">
          <Corner className="left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-lg" />
          <Corner className="right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-lg" />
          <Corner className="bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg" />
          <Corner className="bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg" />

          {/* 위아래로 훑는 선 — 격자 전체를 오르내려야 하므로 감싸는 쪽이 전체 높이다 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="animate-scan h-1/4 w-full bg-gradient-to-b from-transparent via-brand/70 to-transparent" />
          </div>
        </div>

        {/* 찾아낸 것들 */}
        <Tag className="left-4 top-[7.5rem]">김치찌개 · 480</Tag>
        <Tag className="right-4 top-[11rem]">흰쌀밥 · 300</Tag>
        <Tag className="left-8 top-[19rem]">계란말이 · 180</Tag>

        {/* 셔터 */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-ink via-ink/80 to-transparent pb-7 pt-10">
          <span className="rounded-full bg-canvas/10 px-3 py-1 text-[11px] font-semibold text-canvas/80 backdrop-blur">
            접시를 통째로 담아도 됩니다
          </span>
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-canvas/70">
            <span className="h-10 w-10 rounded-full bg-canvas" />
          </span>
        </div>
      </div>
    </div>
  )
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute h-7 w-7 border-canvas/80 ${className}`} />
}

function Tag({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`absolute z-10 rounded-full bg-ink/75 px-2.5 py-1 text-[11px] font-bold text-canvas shadow-lg ring-1 ring-brand/60 backdrop-blur ${className}`}
    >
      {children}
    </span>
  )
}
