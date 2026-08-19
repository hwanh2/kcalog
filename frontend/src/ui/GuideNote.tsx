import type { ReactNode } from 'react'

/**
 * 안내 시트의 한 항목: 제목 한 줄과 설명.
 *
 * 두 시트(유지칼로리, 탄단지)가 함께 쓴다. 처음에는 시트마다 같은 것을 따로 두었는데,
 * 한쪽만 손대면 조용히 어긋난다(PR #53 리뷰).
 *
 * 제목과 본문은 크기로도 갈라 둔다. 굵기 하나로만 나누면 글 덩어리로 보인다.
 */
export function GuideNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="py-4">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-1.5 text-sm leading-[1.75] text-ink/75">{children}</p>
    </li>
  )
}
