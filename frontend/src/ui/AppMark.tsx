/**
 * 오늘식단 마크 — 홈 화면 아이콘과 **같은 그림**을 앱 안에서도 쓴다.
 * 아이콘을 눌러 들어온 사람이 헤더에서 다른 로고를 보면 같은 앱인지 한 번 더 확인하게 된다.
 *
 * PNG인 이유: 홈 화면 아이콘과 한 벌로 tools/icons/make-icons.mjs에서 함께 뽑는다.
 * 그림을 고치면 그 스크립트에서 다시 뽑아 둘이 갈리지 않게 한다.
 * 배경 없는 마크라 흰 면, 밝은 면 어디에 얹어도 링만 보인다.
 *
 * 장식이므로 대체 텍스트를 비운다. 옆에 "오늘식단"이 글자로 함께 있는 자리에 쓴다.
 * 마크만 홀로 놓는 자리에서는 호출측이 `alt`를 준다.
 *
 * `onDark`: 어두운 면(랜딩 히어로, 푸터) 위에서는 가운데 숟가락과 젓가락만 흰색인 그림을 쓴다.
 * 기본 마크의 그림은 slate-600이라 그런 면에서는 링만 뜨고 가운데가 비어 보인다.
 *
 * 가로가 세로보다 길다(292×261). 왼쪽 잔상 때문이다. 호출측은 높이만 정하고
 * 폭은 `w-auto`로 둔다 — 정사각으로 묶으면 그림이 눌린다.
 */
export function AppMark({
  className = '',
  alt = '',
  onDark = false,
}: {
  className?: string
  alt?: string
  onDark?: boolean
}) {
  return (
    <img
      src={onDark ? '/kcalog-mark-on-dark-v3.png' : '/kcalog-mark-v3.png'}
      alt={alt}
      className={className}
    />
  )
}
