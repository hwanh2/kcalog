import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { completeTutorial } from '../../api/member'
import { useAuth } from '../../auth/useAuth'
import { useDialog } from '../../ui/useDialog'
import { Spotlight } from './Spotlight'
import { TutorialCard } from './TutorialCard'
import { TUTORIAL_STEPS } from './steps'
import { useTargetRect } from './useTargetRect'

/** 말풍선과 비추는 자리 사이 최소 간격 */
const GAP = 12

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
  const { state, reloadMember } = useAuth()
  const pending = state.status === 'authed' && !state.member.tutorialCompleted

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

  // 비출 대상이 화면 밖이면 데려온다. 어두운 화면에 말풍선만 뜨는 걸 막는다
  useEffect(() => {
    if (!step.targetId) return
    const el = document.getElementById(step.targetId)
    if (!el) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [step.targetId])

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
  const flip = box !== null && box.top + box.height + GAP > window.innerHeight - cardHeight - 32

  const isLast = index === TUTORIAL_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-40">
      {/* 대상을 못 찾으면(라우트 전환 직후, id 오타) 화면 전체를 덮고 가운데에 띄운다 */}
      {box === null ? (
        <div aria-hidden="true" className="absolute inset-0 animate-fade-in bg-ink/70" />
      ) : (
        <Spotlight box={box} />
      )}

      <div
        className={`pointer-events-none absolute inset-0 flex flex-col px-4 py-[max(1rem,env(safe-area-inset-bottom))] ${
          box === null ? 'justify-center' : flip ? 'justify-start' : 'justify-end'
        }`}
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
