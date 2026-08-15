/**
 * 즐겨찾기 빈 상태 — 무엇을 하면 채워지는지 그림과 문구로 알린다.
 * 일러스트는 인라인 SVG(이미지 파일·라이브러리 없음), 장식이므로 스크린리더에서 감춘다.
 *
 * 바탕색은 `muted`에 낮은 투명도. 처음엔 `border`(#e2e8f0)를 썼는데 흰 면 위에서
 * 가장 옅은 조각이 #f7f9fa까지 흐려져 **그림이 있는지도 보이지 않았다.**
 *
 * 포크·나이프는 하단 내비의 음식기록 아이콘과 **같은 형태(lucide utensils)** 를 키운 것이다 —
 * 같은 뜻에는 같은 모양(DESIGN.md 5).
 */
export function EmptyFavorites() {
  return (
    <div className="py-6 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 160 120"
        className="mx-auto h-24 w-40 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/*
          가로 배치는 겹치지 않게 폭을 나눠 잡았다 — 포크 20~38 · 접시 50~110 · 나이프 120~138.
          접시 반지름을 키우면 나이프 칼날과 물린다(처음 rx=40이라 실제로 겹쳤다).
        */}
        {/* 접시 — 그림자(아래) · 테두리 · 안쪽 원 */}
        <ellipse cx="80" cy="74" rx="30" ry="10" fill="currentColor" opacity="0.07" stroke="none" />
        <ellipse cx="80" cy="66" rx="30" ry="10" opacity="0.2" />
        <ellipse cx="80" cy="66" rx="18" ry="5.5" opacity="0.12" />

        {/* 포크 — 가운데 갈래를 목까지 내려 U와 만나게 한다(짧으면 붕 뜬 선으로 보인다) */}
        <path d="M20 26v16a9 9 0 0 0 9 9 9 9 0 0 0 9-9V26" opacity="0.2" />
        <path d="M29 26v20" opacity="0.2" />
        <path d="M29 51v39" opacity="0.2" />

        {/* 나이프 — 하단 내비 아이콘과 같은 lucide 칼 비율을 확대한 것 */}
        <path d="M138 70V26a18 18 0 0 0-18 18v18a8 8 0 0 0 8 8z" fill="currentColor" opacity="0.09" stroke="none" />
        <path d="M138 70V26a18 18 0 0 0-18 18v18a8 8 0 0 0 8 8z" opacity="0.2" />
        <path d="M138 70v20" opacity="0.2" />
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
