/** 아직 구현 전인 탭(리포트·AI PT)의 준비 중 안내 — 각 기능 change에서 실제 화면으로 교체된다 */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <section className="flex flex-col items-center py-24 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">준비 중인 기능이에요. 곧 만나요!</p>
    </section>
  )
}
