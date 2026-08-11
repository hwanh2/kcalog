import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import {
  clearMessages,
  getBriefing,
  getMessages,
  streamMessage,
} from '../api/coach'
import type {
  CoachingBriefing,
  CoachingChatMessage,
  CoachingRecommendation,
  RecommendationCategory,
} from '../api/coach'
import { CoachMarkdown } from '../features/coach/CoachMarkdown'
import { Card } from '../ui/form'

const QUICK_PROMPTS = [
  '오늘 뭐 먹을까?',
  '내 감량 페이스 어때?',
  '단백질 부족한가?',
  '외식할 때 팁 있어?',
]

export function CoachPage() {
  const { data: briefing } = useQuery({ queryKey: ['coachBriefing'], queryFn: getBriefing })

  return (
    <section>
      <div>
        <p className="text-xs text-muted">개인 코칭</p>
        <h1 className="text-xl font-semibold">AI PT</h1>
      </div>

      {briefing && <Briefing briefing={briefing} />}
      <Chat />
      {briefing && briefing.recommendations.length > 0 && (
        <Recommendations items={briefing.recommendations} />
      )}
    </section>
  )
}

function Briefing({ briefing }: { briefing: CoachingBriefing }) {
  const { stats } = briefing
  return (
    <div className="mt-4 space-y-3">
      <div
        className="rounded-2xl p-4 text-white shadow-sm"
        style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
      >
        <p className="text-xs font-semibold text-white/80">오늘의 브리핑</p>
        <p className="mt-1 text-lg font-bold">{briefing.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/90">{briefing.message}</p>
      </div>

      {briefing.hasData && (
        <div className="grid grid-cols-3 gap-2">
          <StatCell label="감량" value={formatLoss(stats.lossKg)} unit="kg" />
          <StatCell label="달성률" value={stats.adherencePct != null ? String(stats.adherencePct) : '–'} unit="%" />
          <StatCell label="연속" value={stats.streakDays != null ? String(stats.streakDays) : '0'} unit="일" />
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-canvas p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-bold text-ink">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted">{unit}</span>
      </p>
    </div>
  )
}

const CATEGORY_STYLE: Record<RecommendationCategory, { icon: string; bg: string }> = {
  meal: { icon: '🍽️', bg: 'bg-brand' },
  activity: { icon: '🏃', bg: 'bg-success' },
  hydration: { icon: '💧', bg: 'bg-carb' },
  habit: { icon: '✨', bg: 'bg-fat' },
}

function Recommendations({ items }: { items: CoachingRecommendation[] }) {
  return (
    <div className="mt-4">
      <p className="font-semibold text-ink">오늘의 추천</p>
      <div className="mt-2 space-y-2">
        {items.map((rec, i) => {
          const style = CATEGORY_STYLE[rec.category] ?? CATEGORY_STYLE.habit
          return (
            <Card key={i} className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${style.bg}`}
              >
                {style.icon}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{rec.title}</p>
                {rec.detail && <p className="text-xs text-muted">{rec.detail}</p>}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// 타자기 리빌 속도 — 네트워크 도착과 분리해 일정 속도로 노출한다.
// CHARS_PER_TICK를 키우거나 INTERVAL_MS를 줄이면 빨라진다(기본 ≈ 55자/초).
const REVEAL_CHARS_PER_TICK = 1
const REVEAL_INTERVAL_MS = 18

function Chat() {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // 스트리밍 중인 턴 — 서버 저장 전까지 로컬로 질문 + 실시간 응답을 렌더
  const [pending, setPending] = useState<{ question: string; answer: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // 타자기 리빌 상태(리렌더와 무관하게 ref로) — target: 도착한 전체 텍스트, shown: 노출한 글자 수
  const targetRef = useRef('')
  const shownRef = useRef(0)
  const streamDoneRef = useRef(false)
  const errorRef = useRef<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { data: messages = [] } = useQuery({ queryKey: ['coachMessages'], queryFn: getMessages })

  const clear = useMutation({
    mutationFn: clearMessages,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['coachMessages'] }),
  })

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, pending])

  // 언마운트 시 리빌 타이머와 진행 중 스트림 정리 — 연결이 남아 서버 응답까지 열려 있지 않게
  useEffect(() => () => {
    if (timerRef.current != null) window.clearInterval(timerRef.current)
    abortRef.current?.abort()
  }, [])

  function submit(content: string) {
    const text = content.trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)
    setPending({ question: text, answer: '' })
    targetRef.current = ''
    shownRef.current = 0
    streamDoneRef.current = false
    errorRef.current = null

    // 일정 속도로 노출 — 도착이 몰려도 리빌은 REVEAL_CHARS_PER_TICK씩만
    timerRef.current = window.setInterval(() => {
      if (shownRef.current < targetRef.current.length) {
        shownRef.current = Math.min(shownRef.current + REVEAL_CHARS_PER_TICK, targetRef.current.length)
        const shown = targetRef.current.slice(0, shownRef.current)
        setPending((p) => (p ? { ...p, answer: shown } : p))
      } else if (streamDoneRef.current) {
        if (timerRef.current != null) window.clearInterval(timerRef.current)
        timerRef.current = null
        void finalize()
      }
    }, REVEAL_INTERVAL_MS)

    const controller = new AbortController()
    abortRef.current = controller

    void streamMessage(
      text,
      (piece) => {
        targetRef.current += piece
      },
      controller.signal,
    )
      .catch((e: unknown) => {
        if (controller.signal.aborted) return // 언마운트로 중단 — 안내를 띄울 화면이 없다
        errorRef.current =
          e instanceof ApiError && e.status === 429
            ? '오늘 대화를 다 사용했어요. 내일 다시 이어가요.'
            : '지금은 답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.'
        targetRef.current = errorRef.current // 안내 문구도 타자기로 노출
      })
      .finally(() => {
        streamDoneRef.current = true
        if (abortRef.current === controller) abortRef.current = null
      })
  }

  async function finalize() {
    if (errorRef.current) {
      setBusy(false) // 안내 문구는 pending에 남겨 둔다
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['coachMessages'] })
    setPending(null)
    setBusy(false)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft">🤖</span>
          <div>
            <p className="text-sm font-semibold text-ink">코치 미아</p>
            <p className="text-[11px] text-success">데이터 분석 중 · 온라인</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => clear.mutate()}
            className="text-xs text-muted underline hover:text-ink"
          >
            초기화
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="mt-2 max-h-80 min-h-40 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface p-3"
      >
        {messages.length === 0 && !pending && (
          <p className="py-8 text-center text-sm text-muted">
            궁금한 식단·체중 질문을 편하게 물어보세요!
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {pending && (
          <>
            <Bubble message={{ id: -1, role: 'USER', content: pending.question, createdAt: '' }} />
            <div className="text-left">
              <span className="inline-block max-w-[85%] rounded-2xl rounded-tl-none bg-canvas px-3 py-2 text-left text-sm text-ink">
                {pending.answer === '' ? '…' : <CoachMarkdown text={pending.answer} />}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void submit(q)}
            disabled={busy}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-brand disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit(input)
        }}
        className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-surface p-1.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="코치에게 물어보기"
          aria-label="코치에게 물어보기"
          className="flex-1 bg-transparent px-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy || input.trim() === ''}
          aria-label="보내기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand hover:bg-brand-dark disabled:opacity-50"
        >
          ↑
        </button>
      </form>
    </div>
  )
}

function Bubble({ message }: { message: CoachingChatMessage }) {
  const mine = message.role === 'USER'
  return (
    <div className={mine ? 'text-right' : 'text-left'}>
      <span
        className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-left text-sm ${
          mine
            ? 'whitespace-pre-wrap rounded-tr-none bg-brand text-on-brand'
            : 'rounded-tl-none bg-canvas text-ink'
        }`}
      >
        {mine ? message.content : <CoachMarkdown text={message.content} />}
      </span>
    </div>
  )
}

function formatLoss(lossKg: number | null): string {
  if (lossKg == null) return '–'
  return lossKg > 0 ? `+${lossKg}` : String(lossKg)
}
