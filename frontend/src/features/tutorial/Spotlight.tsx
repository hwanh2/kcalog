import type { TargetBox } from './useTargetRect'

/** 비추는 자리 둘레의 여백 */
const PAD = 8

/**
 * 비추는 요소만 밝게 남긴다.
 *
 * 구멍을 뚫는 게 아니라 **화면보다 큰 그림자**를 두른다. clip-path나 SVG 마스크로 진짜 구멍을
 * 만들 수도 있지만 사각형 하나에 두 배로 복잡하고, 그림자는 라운드도 따라온다(design D1, D6).
 *
 * 그 결과 비춰진 요소도 눌리지 않는다. 이건 결함이 아니라 원하는 동작이다. 회원이 카드를 눌러
 * 다른 화면으로 새면 안내가 끊긴다.
 */
export function Spotlight({ box }: { box: TargetBox }) {
  return (
    <div
      aria-hidden="true"
      className="tutorial-spotlight pointer-events-none absolute ring-2 ring-white/60"
      style={{
        top: box.top - PAD,
        left: box.left - PAD,
        width: box.width + PAD * 2,
        height: box.height + PAD * 2,
        // 대상의 라운드를 그대로 쓴다. 값을 고정하면 원형 버튼(코치 FAB)이 사각으로 비춰진다
        borderRadius: box.radius,
      }}
    />
  )
}
