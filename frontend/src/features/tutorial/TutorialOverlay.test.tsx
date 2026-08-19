import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../shell/AppShell'
import { makeMember, renderWithAuth } from '../../test/utils'
import { RECORDS_PATH, TUTORIAL_IDS, TUTORIAL_STEPS } from './steps'

vi.mock('../../api/member', () => ({
  completeTutorial: vi.fn().mockResolvedValue({}),
  restartTutorial: vi.fn().mockResolvedValue({}),
}))
// 셸이 코치 FAB을 그린다. 코치 스텝이 비출 대상이라 실물을 쓰고 조회만 막는다
vi.mock('../../api/coach', () => ({
  getPraise: vi.fn(() => Promise.resolve({ praise: null })),
  dismissPraise: vi.fn(),
}))

const { completeTutorial } = await import('../../api/member')

/**
 * 실제 배치대로 셸 안에 둔다. 화면이 바뀌어도 오버레이가 살아 있어야 한다.
 * 홈, 음식기록 자리에는 앵커만 둔 대역을 놓는다. 진짜 화면은 조회를 여럿 걸어 이 테스트와 상관없다.
 */
function shellRoutes() {
  return (
    <Route element={<AppShell />}>
      <Route
        path="/app"
        element={
          <div>
            <div id={TUTORIAL_IDS.calorie}>칼로리 카드</div>
            <div id={TUTORIAL_IDS.macro}>탄단지 카드</div>
            <div id={TUTORIAL_IDS.weight}>체중 카드</div>
          </div>
        }
      />
      <Route
        path="/app/records"
        element={
          <div>
            음식기록 화면
            <div id={TUTORIAL_IDS.photo}>사진으로 기록하기</div>
            <div id={TUTORIAL_IDS.note}>무엇을 드셨나요?</div>
          </div>
        }
      />
    </Route>
  )
}

/** 마지막 스텝의 인덱스이자 거기까지 가는 데 필요한 다음 클릭 수 */
const LAST = TUTORIAL_STEPS.length - 1

const pending = { status: 'authed' as const, member: makeMember({ tutorialCompleted: false }) }
const seen = { status: 'authed' as const, member: makeMember({ tutorialCompleted: true }) }

function renderTutorial(state: typeof pending) {
  return renderWithAuth(shellRoutes(), { state, path: '/app' })
}

/** 다음을 n번 눌러 스텝을 옮긴다 */
async function advance(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i += 1) {
    await user.click(screen.getByRole('button', { name: '다음' }))
  }
}

describe('TutorialOverlay', () => {
  beforeEach(() => {
    vi.mocked(completeTutorial).mockClear()
  })

  it('안내를 아직 안 본 회원에게 첫 스텝이 뜬다', () => {
    renderTutorial(pending)

    expect(screen.getByRole('dialog', { name: '앱 둘러보기' })).toBeInTheDocument()
    expect(screen.getByText(TUTORIAL_STEPS[0].title)).toBeInTheDocument()
  })

  it('이미 본 회원에게는 뜨지 않는다', () => {
    renderTutorial(seen)

    expect(screen.queryByRole('dialog', { name: '앱 둘러보기' })).not.toBeInTheDocument()
  })

  it('다음, 이전으로 스텝을 오간다', async () => {
    const user = userEvent.setup()
    renderTutorial(pending)

    await advance(user, 2)
    expect(screen.getByText(TUTORIAL_STEPS[2].title)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByText(TUTORIAL_STEPS[1].title)).toBeInTheDocument()
  })

  it('첫 스텝에는 이전이 없다', () => {
    renderTutorial(pending)

    expect(screen.queryByRole('button', { name: '이전' })).not.toBeInTheDocument()
  })

  it('코치 스텝을 지나면 음식기록으로 옮겨간다. 촬영은 열지 않는다', async () => {
    const user = userEvent.setup()
    renderTutorial(pending)

    await advance(user, LAST)

    expect(screen.getByText('음식기록 화면')).toBeInTheDocument()
    expect(screen.getByText(TUTORIAL_STEPS[LAST].title)).toBeInTheDocument()
    // ?camera=1로 들어가면 진입과 동시에 OS 카메라가 열려 안내가 그 뒤로 묻힌다 (design D7)
    expect(screen.queryByLabelText('식사 사진 촬영')).not.toBeInTheDocument()
  })

  it('음식기록의 첫 스텝에서 이전을 누르면 홈으로 함께 돌아온다', async () => {
    const user = userEvent.setup()
    renderTutorial(pending)

    // 화면이 갈리는 자리 하나만 본다. 같은 화면 안에서 오가는 것은 위 테스트가 덮는다
    const firstRecords = TUTORIAL_STEPS.findIndex((s) => s.path === RECORDS_PATH)
    await advance(user, firstRecords)
    await user.click(screen.getByRole('button', { name: '이전' }))

    expect(screen.getByText('칼로리 카드')).toBeInTheDocument()
    expect(screen.getByText(TUTORIAL_STEPS[firstRecords - 1].title)).toBeInTheDocument()
  })

  it('마지막 스텝의 시작하기가 완료를 저장하고 닫는다', async () => {
    const user = userEvent.setup()
    const { reloadMember } = renderTutorial(pending)

    await advance(user, LAST)
    await user.click(screen.getByRole('button', { name: '시작하기' }))

    expect(completeTutorial).toHaveBeenCalledOnce()
    await waitFor(() => expect(reloadMember).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog', { name: '앱 둘러보기' })).not.toBeInTheDocument()
  })

  it('중간에 건너뛰어도 완료로 저장한다. 다음 접속에 또 띄우면 방해다', async () => {
    const user = userEvent.setup()
    renderTutorial(pending)

    await advance(user, 2)
    await user.click(screen.getByRole('button', { name: '건너뛰기' }))

    expect(completeTutorial).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: '앱 둘러보기' })).not.toBeInTheDocument()
  })

  it('진행 위치를 스텝 수만큼 보여준다', () => {
    renderTutorial(pending)

    const dots = screen.getByRole('dialog', { name: '앱 둘러보기' }).querySelectorAll('span')
    expect(dots).toHaveLength(TUTORIAL_STEPS.length)
  })

  it('스텝마다 비출 앵커가 화면에 있다. id 오타는 스팟라이트만 조용히 지운다', async () => {
    const user = userEvent.setup()
    renderTutorial(pending)

    for (const [i, step] of TUTORIAL_STEPS.entries()) {
      if (step.targetId) {
        expect(document.getElementById(step.targetId)).not.toBeNull()
      }
      if (i < TUTORIAL_STEPS.length - 1) {
        await user.click(screen.getByRole('button', { name: '다음' }))
      }
    }
  })
})
