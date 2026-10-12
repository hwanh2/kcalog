/**
 * 토스 미니앱 빌드인지. `vite build --mode toss`에서만 참이다 (add-apps-in-toss D1).
 */
export const IS_TOSS = import.meta.env.VITE_PLATFORM === 'toss'

/**
 * 앱인토스 SDK 호출 모음. 반드시 `IS_TOSS` 분기 안에서만 부른다. 웹 브라우저에서는 SDK가 에러를 던진다.
 *
 * 삼항을 이 모듈 안에 두는 이유: 상수 접기는 모듈 경계를 넘지 못해서, 호출하는 쪽에서만 `IS_TOSS`로 막으면
 * 웹 빌드에도 SDK 청크가 만들어지고 PWA 프리캐시에 실린다. 여기서 접혀야 import 자체가 사라진다.
 */
export const loadToss: () => Promise<typeof import('./toss')> =
  import.meta.env.VITE_PLATFORM === 'toss'
    ? () => import('./toss')
    : () => Promise.reject(new Error('토스 빌드가 아니다'))
