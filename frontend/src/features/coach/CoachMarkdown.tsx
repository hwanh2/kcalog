import type { ReactNode } from 'react'

/**
 * 코치 응답용 초경량 마크다운 — 굵게(**), 인라인 코드(`), 불릿·번호 목록, 문단만 지원.
 * dangerouslySetInnerHTML을 쓰지 않고 React 노드로 변환해 XSS를 원천 차단한다.
 */
export function CoachMarkdown({ text }: { text: string }) {
  return <div className="space-y-1.5">{renderBlocks(text)}</div>
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-0.5 pl-5">
          {items.map((it, k) => (
            <li key={k}>{renderInline(it)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} className="list-decimal space-y-0.5 pl-5">
          {items.map((it, k) => (
            <li key={k}>{renderInline(it)}</li>
          ))}
        </ol>,
      )
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    blocks.push(<p key={key++}>{renderInline(line)}</p>)
    i++
  }

  return blocks
}

/** 인라인 서식 — **굵게**, `코드` */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    if (match[1] != null) {
      nodes.push(<strong key={key++}>{match[1]}</strong>)
    } else {
      nodes.push(
        <code key={key++} className="rounded bg-canvas px-1 text-[0.85em]">
          {match[2]}
        </code>,
      )
    }
    last = regex.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}
