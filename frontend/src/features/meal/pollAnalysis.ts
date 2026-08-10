import { getAnalysis } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'

/** 분석 작업이 끝(ANALYZING이 아님)날 때까지 폴링. 타임아웃 초과 시 에러(프론트가 실패로 처리). */
export async function pollAnalysis(
  id: number,
  opts: { intervalMs?: number; timeoutMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Analysis> {
  const interval = opts.intervalMs ?? 1500
  const timeout = opts.timeoutMs ?? 60_000
  const now = opts.now ?? (() => Date.now())
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
  const start = now()

  for (;;) {
    const analysis = await getAnalysis(id)
    if (analysis.status !== 'ANALYZING') return analysis
    if (now() - start > timeout) throw new Error('ANALYSIS_TIMEOUT')
    await sleep(interval)
  }
}
