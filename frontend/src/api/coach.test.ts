import { describe, expect, it } from 'vitest'
import { parseSseBuffer } from './coach'

describe('parseSseBuffer', () => {
  it('완결된 이벤트를 뽑고 미완결 조각은 rest로 남긴다', () => {
    const buffer = 'event:token\ndata:{"t":"안"}\n\nevent:token\ndata:{"t":"녕"}\n\nevent:do'
    const { events, rest } = parseSseBuffer(buffer)
    expect(events).toEqual([
      { event: 'token', data: '{"t":"안"}' },
      { event: 'token', data: '{"t":"녕"}' },
    ])
    expect(rest).toBe('event:do')
  })

  it('data 뒤 공백을 제거하고 event 없으면 message로 본다', () => {
    const { events } = parseSseBuffer('data: hello\n\n')
    expect(events).toEqual([{ event: 'message', data: 'hello' }])
  })

  it('완결 이벤트가 없으면 전체를 rest로 둔다', () => {
    const { events, rest } = parseSseBuffer('event:token\ndata:{"t":"x"}')
    expect(events).toHaveLength(0)
    expect(rest).toBe('event:token\ndata:{"t":"x"}')
  })
})
