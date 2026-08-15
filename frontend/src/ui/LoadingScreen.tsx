/**
 * 화면 전체를 차지하는 대기 화면 — 인증 확인·로그인 처리처럼 아직 아무것도 그릴 수 없을 때(design D4).
 *
 * 앱을 열 때 가장 먼저 보이는 화면이라 맨 텍스트 한 줄로 두지 않는다(ui-feedback 스펙).
 *
 * ⚠️ 문구를 `sr-only`로 숨기지 않는 이유 — 모션 축소 설정이면 전역 규칙(index.css)이 링을 멈춰
 * 세운다. 그때 움직임은 단서가 되지 못하므로 **글이 유일하게 남는 단서**다.
 */
export function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6">
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* 링 — 한 변만 브랜드 색이라 회전이 보인다. 멈춰도 원형 테두리로 남는다 */}
        <span
          aria-hidden
          className="absolute inset-0 animate-spin rounded-full border-4 border-border border-t-brand"
        />
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-dark to-brand text-base font-black text-on-brand">
          K
        </span>
      </div>
      <p role="status" className="text-sm font-medium text-muted">
        {message}
      </p>
    </div>
  )
}
