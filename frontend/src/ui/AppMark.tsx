/**
 * kcalog 마크 — 홈 화면 아이콘과 **같은 그림**을 앱 안에서도 쓴다.
 * 아이콘을 눌러 들어온 사람이 헤더에서 다른 로고를 보면 같은 앱인지 한 번 더 확인하게 된다.
 *
 * PNG인 이유: 마크의 `k`는 SVG 안에서 **글자**라, 원본 서체(Manrope)가 없는 기기에서는
 * 다른 서체로 그려진다. 앱 안과 홈 화면 아이콘이 갈리므로 래스터로 고정한다.
 * 배경 없는 마크라 흰 면·밝은 면 어디에 얹어도 링만 보인다.
 *
 * 장식이므로 대체 텍스트를 비운다 — 옆에 "kcalog"가 글자로 함께 있는 자리에 쓴다.
 * 마크만 홀로 놓는 자리에서는 호출측이 `alt`를 준다.
 */
export function AppMark({ className = '', alt = '' }: { className?: string; alt?: string }) {
  return <img src="/kcalog-mark.png" alt={alt} className={className} />
}
