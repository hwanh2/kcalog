import { GuideNote } from '../../ui/GuideNote'
import { Sheet } from '../../ui/Sheet'

/**
 * 유지칼로리를 왜 알아야 하는지 (design D12).
 *
 * 목표 숫자만 보면 "이 앱이 정해준 값"으로 읽힌다. 실제로는 **유지칼로리라는 기준선**이 있고
 * 목표는 거기서 얼마나 뺄지 더할지를 정한 결과다. 기준선을 모르면 목표를 조절할 수도 없다.
 *
 * 숫자는 체지방 1kg ≈ 7700kcal 기준이며, 백엔드의 `TdeeCalc.KCAL_PER_KG`와 같은 값을 쓴다.
 *
 * 레이아웃은 **위계로 읽힌다**(design D13): 결론 → 근거 숫자 → 보조 설명 → 각주.
 * 같은 무게의 카드를 나열하면 어디부터 읽어야 할지 몰라 아무것도 안 읽는다.
 */
export function CalorieGuideSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="유지칼로리 안내" onClose={onClose}>
      {/* 줄바꿈은 balance에 맡긴다. <br>로 고정하면 글자 크기, 기기 폭이 달라질 때 한쪽 줄만 짧아진다 */}
      <h2 className="pr-12 text-xl font-black leading-snug text-balance text-ink">
        유지칼로리를 알아야 조절할 수 있어요
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-ink/80">
        먹어도 체중이 그대로인 칼로리예요. 다이어트도 벌크업도 결국{' '}
        <span className="font-semibold text-ink">이 값에서 얼마나 빼고 더하느냐</span>가 전부예요. 기준을
        모르면 그냥 막연히 적게 먹는 것밖에 안 돼요.
      </p>

      <h3 className="mt-6 text-xs font-bold tracking-wide text-muted">얼마나 덜 먹으면 될까요</h3>
      {/* 핵심 숫자는 본문 크기에 묻히면 안 된다. 한 달 결과를 카드에서 가장 큰 글자로 둔다 */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <DeficitCard perDay="−500" month="−2.0" week="−0.45" />
        <DeficitCard perDay="−300" month="−1.2" week="−0.27" />
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        한 달에 <span className="font-semibold text-ink">1~2kg</span>이 무리 없는 속도예요. 더 빨리 빼고
        싶으면 더 줄여도 되지만, 일주일에 체중의 1%를 넘겨 빠지면 근육도 같이 빠져요.
      </p>

      {/* 증량 카드는 색을 달리 쓴다. 감량과 나란히 같은 색으로 두면 대칭처럼 읽힌다 */}
      <div className="mt-3 rounded-2xl bg-track p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">늘릴 때는 더 천천히</h3>
          <p className="shrink-0 text-lg font-black tabular-nums text-ink">
            +300
            <span className="ml-0.5 text-[11px] font-bold text-muted">kcal/일</span>
          </p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          더 먹은 만큼 전부 근육이 되지는 않아요. 그래서 감량(−500)보다 적게 잡아요. 빠르게 늘리면 늘어난
          무게의 상당 부분이 지방이에요.
        </p>
      </div>

      <ul className="mt-5 divide-y divide-border border-y border-border">
        <GuideNote title="처음 값은 추정이에요">
          키·몸무게·나이·활동량으로 계산한 값이라 사람마다 10~15% 어긋나요.{' '}
          <span className="font-medium text-ink">2주 동안 대부분의 날을 기록하면</span> 실제로 먹은 양과
          체중 변화로 역산한 값으로 바뀌어요. 그게 진짜 내 유지칼로리예요.
        </GuideNote>
        <GuideNote title="체중은 하루에도 흔들려요">
          물·소금·전날 먹은 탄수화물 때문에 하루 만에 1kg 넘게 오르내려요. 어제보다 늘었다고 실패한 게
          아니에요. <span className="font-medium text-ink">체중 탭의 추세선</span>으로 주 단위 흐름만 보세요.
        </GuideNote>
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        여기 숫자는 평균이에요. 몸도 생활도 사람마다 달라서, 2~3주 해보고 생각한 만큼 안 움직이면 그때
        조절하면 돼요.
      </p>
    </Sheet>
  )
}

/** 하루 적자 → 한 달 결과. 한 달 값이 가장 크고, 하루, 주는 그 근거로 위아래에 붙는다 */
function DeficitCard({ perDay, month, week }: { perDay: string; month: string; week: string }) {
  return (
    <div className="rounded-2xl bg-brand-soft p-3.5">
      <p className="text-[11px] font-bold text-brand-ink">
        하루 {perDay}
        <span className="ml-0.5 font-semibold">kcal</span>
      </p>
      {/* "한 달"을 큰 숫자와 같은 줄에 둔다. 아래 작은 줄로 내리면 무엇의 값인지 안 읽힌다 */}
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="text-sm font-bold text-muted">한 달</span>
        <span className="text-2xl font-black leading-none tabular-nums text-ink">
          {month}
          <span className="ml-0.5 text-sm font-bold">kg</span>
        </span>
      </p>
      <p className="mt-1 text-[11px] font-medium text-muted">일주일 {week}kg</p>
    </div>
  )
}
