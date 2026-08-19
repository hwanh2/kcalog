import { Sheet } from '../../ui/Sheet'

/**
 * 탄단지 목표를 어떻게 읽어야 하는지 (design D9).
 * 홈의 달성도·온보딩 결과·프로필 영양 목표 — 목표 숫자가 보이는 세 곳이 함께 쓴다.
 *
 * 숫자만 보면 두 가지로 오해한다 — "탄수가 왜 이렇게 많지", "고기를 이만큼 먹어야 하나".
 * 둘 다 목표를 **기준선이 아니라 처방으로** 읽어서 생긴다.
 *
 * 레이아웃은 유지칼로리 안내와 같은 위계를 쓴다(design D13) — 결론 한 줄, 그 뒤에 항목별 설명.
 */
export function MacroGuideSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="탄단지 목표 안내" onClose={onClose}>
      <h2 className="pr-12 text-xl font-black leading-snug text-ink">
        정확히 맞추지 않아도
        <br />
        괜찮아요
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-ink/80">
        탄단지는 <span className="font-semibold text-ink">기준선</span>이에요. 세 숫자를 딱 맞추는 것보다
        총 칼로리를 지키는 쪽이 훨씬 중요해요.
      </p>

      <ul className="mt-5 divide-y divide-border border-y border-border">
        <GuideNote title="탄수가 많게 느껴진다면">
          일부를 지방으로 바꿔 드셔도 괜찮아요. 견과류·올리브유·고기의 기름진 부위처럼요. 총 칼로리만
          비슷하면 몸에서 크게 달라지지 않아요.
        </GuideNote>
        <GuideNote title="단백질이 많아 보인다면">
          목표에는 <span className="font-medium text-ink">밥·빵·채소에 들어 있는 단백질도 모두 포함</span>
          돼 있어요. 고기나 보충제로만 채우는 숫자가 아니라, 하루에 먹는 모든 음식을 합한 값이에요.
        </GuideNote>
        <GuideNote title="목표는 몸에 맞춰 정해져요">
          몸무게와 근육량 목표 여부를 함께 보고 계산해요. 기록이 쌓여 체중이 바뀌면 목표도 같이 움직여요.
        </GuideNote>
      </ul>
    </Sheet>
  )
}

function GuideNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="py-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-muted">{children}</p>
    </li>
  )
}
