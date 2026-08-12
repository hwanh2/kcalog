// @vitest-environment node
//
// node 환경으로 돌리는 이유 — jsdom에서는 `import.meta.url`이 file 스킴이 아니라 경로를
// 만들 수 없고, `?raw` import는 vitest가 CSS를 빈 문자열로 대체해 무용지물이다.
// `process.cwd()`는 실행 위치에 좌우돼 취약하다. 모듈 기준 경로가 유일하게 안정적이다.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { INK, SURFACE } from '../src/theme/tokens.ts'

const CSS = readFileSync(fileURLToPath(new URL('../src/index.css', import.meta.url)), 'utf8')

/**
 * `index.css`의 `@theme`와 `tokens.ts`가 어긋나지 않게 막는다.
 *
 * 대비 검증은 `tokens.ts`만 읽으므로, 한쪽만 고치면 **테스트는 통과하는데 실제 화면 색은
 * 검증되지 않는 상태**가 된다. 그러면 이 change의 존재 이유("눈이 아니라 테스트로")가
 * 그 지점에서 무력해진다. 주석으로 "양쪽 함께 고쳐라"라고 적어두는 것으로는 부족하다.
 */

/** `@theme { ... }` 블록에서 `--color-*` 선언을 모은다 */
function themeColors(): Record<string, string> {
  const block = CSS.match(/@theme\s*\{([\s\S]*?)\n\}/)
  if (!block) throw new Error('index.css에서 @theme 블록을 찾지 못했다')
  const colors: Record<string, string> = {}
  for (const [, name, value] of block[1].matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    colors[name] = value.toLowerCase()
  }
  return colors
}

/** carbSoft → carb-soft */
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

describe('@theme ↔ tokens.ts 동기화', () => {
  const css = themeColors()

  it('@theme 블록을 실제로 읽어냈다 — 정규식이 헛돌면 아래 검사가 전부 무의미해진다', () => {
    expect(Object.keys(css).length).toBeGreaterThan(15)
    expect(css.brand).toBe('#ff6b00')
  })

  const declared = Object.entries({ ...SURFACE, ...INK }) as [string, string][]

  it.each(declared)('--color-%s 값이 CSS와 같다', (name, value) => {
    expect(css[kebab(name)]).toBe(value.toLowerCase())
  })

  it('CSS에만 있고 tokens.ts에 없는 색이 없다 — 빠진 색은 대비 검증을 통째로 비껴간다', () => {
    const known = new Set([...Object.keys(SURFACE), ...Object.keys(INK)].map(kebab))
    expect(Object.keys(css).filter((name) => !known.has(name))).toEqual([])
  })
})
