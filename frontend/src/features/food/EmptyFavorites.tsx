/**
 * 즐겨찾기 빈 상태 — 무엇을 하면 채워지는지 그림과 문구로 알린다.
 * 일러스트는 인라인 SVG(이미지 파일·라이브러리 없음), 장식이므로 스크린리더에서 감춘다.
 */
export function EmptyFavorites() {
  return (
    <div className="py-6 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 160 120"
        className="mx-auto h-28 w-40 text-border"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 접시 두 장 */}
        <path d="M18 92a26 26 0 0 1 52 0z" fill="currentColor" opacity="0.35" stroke="none" />
        <path d="M90 92a26 26 0 0 1 52 0z" fill="currentColor" opacity="0.25" stroke="none" />
        {/* 사과 */}
        <circle cx="52" cy="48" r="19" fill="currentColor" opacity="0.3" stroke="none" />
        <path d="M52 29c2-6 7-9 12-9-1 6-5 9-12 9z" fill="currentColor" opacity="0.45" stroke="none" />
        {/* 배 */}
        <path
          d="M100 44c0-7 5-11 11-11s11 4 11 11c0 6-4 8-4 14a11 11 0 0 1-14 0c0-6-4-8-4-14z"
          fill="currentColor"
          opacity="0.25"
          stroke="none"
        />
        {/* 별 — 눌러서 담는다는 신호 */}
        <path
          d="M118 18l3.6 7.3 8 1.2-5.8 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.7 8-1.2z"
          fill="currentColor"
          opacity="0.55"
          stroke="none"
        />
      </svg>
      <p className="mt-3 text-sm font-semibold text-muted">
        자주 먹는 음식에 별표를 누르면
        <br />
        즐겨찾기로 저장돼요
      </p>
      <p className="mt-1 text-xs text-muted">사진 분석 결과에서도 저장할 수 있어요</p>
    </div>
  )
}
