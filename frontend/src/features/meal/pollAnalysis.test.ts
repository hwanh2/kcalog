import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAnalysis } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'
import { pollAnalysis } from './pollAnalysis'

vi.mock('../../api/analysis', () => ({ getAnalysis: vi.fn() }))
const getAnalysisMock = vi.mocked(getAnalysis)

const job = (status: Analysis['status']): Analysis => ({
  id: 1,
  status,
  imageUrl: '/api/photos/1/x',
  result: null,
  errorCode: null,
})

beforeEach(() => vi.clearAllMocks())

describe('pollAnalysis', () => {
  it('ANALYZING가 아닐 때까지 폴링 후 결과 반환', async () => {
    getAnalysisMock
      .mockResolvedValueOnce(job('ANALYZING'))
      .mockResolvedValueOnce(job('ANALYZING'))
      .mockResolvedValueOnce(job('COMPLETED'))

    const result = await pollAnalysis(1, { sleep: () => Promise.resolve() })
    expect(result.status).toBe('COMPLETED')
    expect(getAnalysisMock).toHaveBeenCalledTimes(3)
  })

  it('타임아웃 초과 시 에러', async () => {
    getAnalysisMock.mockResolvedValue(job('ANALYZING'))
    let t = 0
    await expect(
      pollAnalysis(1, { sleep: () => Promise.resolve(), now: () => (t += 1000), timeoutMs: 1500 }),
    ).rejects.toThrow('ANALYSIS_TIMEOUT')
  })
})
