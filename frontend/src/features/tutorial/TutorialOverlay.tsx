import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { completeTutorial } from '../../api/member'
import { useAuth } from '../../auth/useAuth'
import { useDialog } from '../../ui/useDialog'
import { Spotlight } from './Spotlight'
import { TutorialCard } from './TutorialCard'
import { TUTORIAL_STEPS } from './steps'
import { useTargetRect } from './useTargetRect'
import { useTutorialActive } from './useTutorialActive'

/** 말풍선과 비추는 자리 사이 최소 간격 */
const GAP = 12
/** 말풍선과 화면 가장자리 사이 여백 */
const EDGE = 16
/** 스크롤이 멈췄다고 볼 때까지 기다리는 시간 */
const SCROLL_SETTLE_MS = 140

/**
 * 온보딩을 마친 회원에게 앱을 한 번 보여준다.
 *
 * 셸에 두는 이유는 중간에 음식기록으로 옮겨가기 때문이다. 페이지에 두면 그때
 * 언마운트되며 진행 상태가 날아간다(design D7).
 *
 * 열림 여부는 서버 플래그 하나로 정한다. "이번 세션에 이미 닫았다"를 따로 들면
 * 프로필의 다시 보기가 그 지역 상태에 막힌다(design D9).
 */
export function TutorialOverlay() {
  const { reloadMember } = useAuth()
  const pending = useTutorialActive()

  // 저장 요청이 오가는 동안(약 200ms) 마지막 스텝이 붙들려 있지 않게 즉시 감춘다
  const [finishing, setFinishing] = useState(false)

  // 다시 보기로 플래그가 거짓이 되면 함께 푼다. 풀지 않으면 감춰진 채로 남는다 (design D9)
  useEffect(() => {
    if (pending) setFinishing(false)
  }, [pending])

  if (!pending || finishing) return null

  return (
    <Overlay
      onFinish={() => {
        setFinishing(true)
        void (async () => {
          try {
            await completeTutorial()
            await reloadMember()
          } catch {
            // 저장에 실패해도 안내를 다시 띄우지 않는다. 다음 접속에 한 번 더 뜰 뿐이다
          }
        })()
      }}
    />
  )
}

function Overlay({ onFinish }: { onFinish: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [index, setIndex] = useState(0)
  const step = TUTORIAL_STEPS[index]
  const box = useTargetRect(step.targetId)
  const viewport = useViewportHeight()
  const scrolling = useScrolling()

  // Esc, 포커스 이동, 가둠, 복귀는 그대로 쓰고 스크롤 잠금만 끈다.
  // 잠그면 화면 밖에 있는 대상을 스크롤로 데려올 수 없다 (design D4)
  const panelRef = useDialog(onFinish, { lockScroll: false })

  /*
    스텝이 사는 화면으로 옮긴다. 다음 버튼이 아니라 **스텝이 경로를 들고 있어야**
    이전으로 돌아갈 때도 함께 돌아온다.

    의존성은 `step.path` 하나다. `pathname`까지 넣으면 이동이 끝난 뒤 한 번 더 돌면서
    같은 경로로 또 navigate한다.
  */
  const pathRef = useRef(pathname)
  pathRef.current = pathname
  useEffect(() => {
    if (pathRef.current !== step.path) navigate(step.path)
  }, [step.path, navigate])

  /*
    비출 대상이 화면 밖이면 데려온다. 어두운 화면에 말풍선만 뜨는 걸 막는다.

    ⚠️ 셸과 순서를 다퉈야 한다. 셸은 라우트가 바뀔 때 `window.scrollTo(0, 0)`으로 맨 위로
    올리는데, 자식 이펙트가 부모보다 먼저 도는 React 순서 때문에 **여기서 스크롤한 것을 셸이
    곧바로 되돌린다.** 음식기록의 입력 영역은 기록 목록 아래라, 지면 스팟라이트가 화면 밖에
    남아 어두운 화면만 보인다(design D15).

    한 프레임 미뤄 셸 뒤에 놓는 것으로는 안 된다. navigate가 만드는 렌더가 그 프레임 뒤로
    밀리면 셸이 다시 이긴다. 실제로 세 번에 한 번꼴로 졌다. **안내가 열려 있는 동안 셸이
    스크롤 되돌리기를 쉬게 해서** 다투는 상황 자체를 없앤다(`useTutorialActive`).

    `pathname`을 의존성에 넣는 이유는 따로 있다. 스텝이 바뀐 커밋에서는 아직 옛 화면이라
    대상이 없다. 라우트가 바뀐 커밋에서 한 번 더 돌아야 그때 생긴 대상을 잡는다.
  */
  useEffect(() => {
    const targetId = step.targetId
    if (!targetId) return
    const el = document.getElementById(targetId)
    if (!el) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [step.targetId, pathname])

  /*
    말풍선은 아래에 붙여둔다. 스텝마다 자리가 옮겨 다니면 다음 버튼을 누르려고 엄지를 매번
    다시 옮겨야 한다. 비추는 자리와 겹칠 때만(코치 FAB) 위로 넘긴다.

    겹침을 보려면 말풍선 높이가 필요하다. 그려놓고 재되 스텝이 바뀔 때만 잰다. 높이가 달라지는
    것은 설명 줄 수와 이전 버튼 유무뿐이고, 매 렌더마다 재면 setState가 렌더를 다시 부른다.
  */
  const [cardHeight, setCardHeight] = useState(0)
  useLayoutEffect(() => {
    setCardHeight(panelRef.current?.offsetHeight ?? 0)
  }, [index, panelRef])

  /*
    자리를 flex(justify-start/end)로 바꾸면 **순간이동한다.** 아래 붙은 자리를 기준으로 두고
    거기서 얼마나 끌어올릴지를 transform으로 준다. 그래야 두 자리 사이를 미끄러져 간다.

    위로 넘어간 자리는 아래 여백(안전 영역 포함)을 그대로 물려받아 의도보다 조금 내려온다.
    위쪽은 빈 공간이 넉넉해 눈에 띄지 않는다. 안전 영역 값을 읽어오는 코드를 더할 차이가 아니다.
  */
  const flip = box !== null && box.top + box.height + GAP > viewport - cardHeight - 2 * EDGE
  const lift = Math.max(0, viewport - cardHeight - 2 * EDGE)
  const offsetY = box === null ? -Math.round(lift / 2) : flip ? -Math.round(lift) : 0

  const isLast = index === TUTORIAL_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-40">
      {/* 대상을 못 찾으면(첫 프레임, id 오타) 화면 전체를 덮고 가운데에 띄운다 */}
      {box === null ? (
        <div aria-hidden="true" className="absolute inset-0 animate-fade-in bg-ink/70" />
      ) : (
        <Spotlight box={box} glide={!scrolling} />
      )}

      <div
        className="tutorial-card-slot pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        style={{ transform: `translate3d(0, ${offsetY}px, 0)` }}
      >
        <div className="mx-auto w-full max-w-sm">
          <TutorialCard
            panelRef={panelRef}
            title={step.title}
            body={step.body}
            index={index}
            total={TUTORIAL_STEPS.length}
            onPrev={() => setIndex(index - 1)}
            onNext={() => (isLast ? onFinish() : setIndex(index + 1))}
            onSkip={onFinish}
          />
        </div>
      </div>
    </div>
  )
}

/** 말풍선 자리를 계산할 화면 높이. 회전이나 주소창 접힘으로 바뀐다 */
function useViewportHeight(): number {
  const [height, setHeight] = useState(() => window.innerHeight)
  useEffect(() => {
    const sync = () => setHeight(window.innerHeight)
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  return height
}

/**
 * 지금 스크롤이 도는 중인지. 스팟라이트의 전환을 켜고 끄는 데 쓴다.
 *
 * 스크롤 중에는 프레임마다 재는 값이 이미 정확하므로 전환이 필요 없고, 켜두면 오히려 뒤늦게
 * 따라오며 늘어진다. 멈춰 있을 때의 자리 변경만 미끄러지게 한다. 스텝은 바뀌는데 스크롤은
 * 필요 없는 경우가 그것이다(체중 카드에서 코치로, 코치에서 음식기록으로).
 */
function useScrolling(): boolean {
  const [scrolling, setScrolling] = useState(false)
  useEffect(() => {
    let timer = 0
    const sync = () => {
      setScrolling(true)
      clearTimeout(timer)
      timer = window.setTimeout(() => setScrolling(false), SCROLL_SETTLE_MS)
    }
    window.addEventListener('scroll', sync, { passive: true })
    return () => {
      window.removeEventListener('scroll', sync)
      clearTimeout(timer)
    }
  }, [])
  return scrolling
}
