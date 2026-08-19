/** 탭 한 번에 해당하는 짧은 떨림 (ms) */
const TAP_MS = 10

/**
 * 누른 순간의 짧은 진동.
 *
 * 두 갈래다.
 *
 * | | 방법 |
 * | --- | --- |
 * | 안드로이드 | `navigator.vibrate` — 표준 Vibration API |
 * | iOS 17.4~26.4 | 숨겨둔 `<input type="checkbox" switch>`를 토글 |
 *
 * **iOS 사파리는 Vibration API를 한 번도 지원한 적이 없다**(3.2~26.5 전 버전). iOS 17.4에 생긴
 * 토글 스위치가 상태를 바꿀 때 Taptic Engine이 울리는 것을 빌려 쓴다 — 스위치를 직접 클릭해서는
 * 안 되고 **`<label>`을 통해야** 울린다.
 *
 * ⚠️ 이건 컨트롤을 용도 밖으로 쓰는 편법이고, Apple이 **iOS 26.5에서 이미 한 번 막았다.**
 * 막힌 환경에서도 오류는 나지 않고 조용히 아무 일도 일어나지 않는다 — 그래서 나중에
 * "왜 진동이 없지?"의 원인을 찾기 어렵다. 이 주석이 그 답이다.
 *
 * 지원하지 않는 환경(데스크톱 등)에서도 조용히 넘어간다. 부르는 쪽은 확인할 것이 없다.
 */
export function tapHaptic(): void {
  if (typeof navigator === 'undefined') return
  // 표준이 먹으면 거기서 끝낸다 — 편법은 iOS에서만 탄다
  if (navigator.vibrate?.(TAP_MS)) return
  toggleHiddenSwitch()
}

/**
 * 화면에 없는 스위치를 하나 두고 계속 토글한다.
 *
 * 부를 때마다 만들었다 지우는 방법도 있지만, 그러면 화면 낭독기가 갑자기 나타난 컨트롤을
 * 읽을 틈이 생긴다. **한 번 만들어 접근성 트리에서 빼두고** 상태만 바꾼다.
 */
function toggleHiddenSwitch(): void {
  if (typeof document === 'undefined' || !document.body) return
  // label을 클릭해야 울린다 — 스위치를 직접 click()하면 상태만 바뀌고 Taptic Engine은 안 돈다
  hiddenSwitch()?.click()
}

let cached: HTMLLabelElement | null = null

function hiddenSwitch(): HTMLLabelElement | null {
  if (cached?.isConnected) return cached

  const label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  // 화면에서 지우되 레이아웃에는 끼지 않는다. display:none이면 클릭이 통하지 않는다
  label.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;'

  const input = document.createElement('input')
  input.type = 'checkbox'
  // JSX가 아니라 여기서 붙이는 이유: React가 모르는 속성을 거치지 않게 한다
  input.setAttribute('switch', '')
  input.setAttribute('aria-hidden', 'true')
  input.tabIndex = -1 // 탭 이동 순서에 끼면 키보드 사용자가 빈 칸을 지나가게 된다

  label.appendChild(input)
  document.body.appendChild(label)
  cached = label
  return label
}

/** 테스트에서 모듈 상태를 비운다 — 실제 코드에서는 부르지 않는다 */
export function resetHapticsForTest(): void {
  cached?.remove()
  cached = null
}
