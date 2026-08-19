import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router'
import { dismissPraise, getPraise } from '../../api/coach'
import { CloseIcon } from '../../ui/icons'
import { SproutIcon } from './SproutIcon'

/**
 * 우하단 코치. 누르면 AI PT 탭으로 가고, 칭찬할 일이 생기면 얼굴 위에 말풍선이 뜬다.
 *
 * 촬영 FAB이 있던 자리다. 촬영은 홈 카드와 음식기록 탭이 이미 맡고 있어 이 자리를 내줬다(design D12).
 */
export function CoachFab() {
  const { pathname } = useLocation()
  const queryClient = useQueryClient()
  const { data, refetch } = useQuery({ queryKey: ['praise'], queryFn: getPraise })

  /*
    화면을 옮길 때만 다시 본다. 주기적으로 부르면 서버 부하가 늘고, 보고 있는 동안 말풍선이
    불쑥 나타난다. 칭찬은 급한 소식이 아니다(design D14).
  */
  useEffect(() => {
    void refetch()
  }, [pathname, refetch])

  // 닫은 칭찬은 서버 왕복을 기다리지 않고 곧바로 감춘다. 누른 뒤 남아 있으면 눌리지 않은 줄 안다
  const [closedId, setClosedId] = useState<number | null>(null)
  const dismiss = useMutation({
    mutationFn: dismissPraise,
    // 실패해도 알리지 않는다. 다음 조회에 다시 뜨는 것으로 충분하다
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['praise'] }),
  })

  const praise = data?.praise ?? null
  const shown = praise && praise.id !== closedId ? praise : null

  function close(id: number) {
    setClosedId(id)
    dismiss.mutate(id)
  }

  return (
    /* 아래 여백은 내비 높이(55px) + 안전 영역 + 한 칸 띄움이다. 고정값만 두면 안전 영역이 있는
       기기에서 내비가 두꺼워져 코치가 그 위에 얹힌다(design D24, 카메라 FAB에서 이어받았다) */
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 flex flex-col items-end gap-2">
      {shown && (
        <div
          role="status"
          className="animate-fade-in relative flex max-w-[16rem] items-stretch overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        >
          {/* 꼬리가 얼굴을 가리킨다. 닫기 버튼 쪽이 아니라 얼굴 위에 오도록 오른쪽에서 띄운다 */}
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-border bg-surface"
          />
          {/*
            본문과 닫기는 서로 다른 동작이라 별개 요소로 둔다. 하나로 합치면 닫으려다 화면이
            바뀐다(design D11). 본문을 누르면 읽은 것으로 치고 코치에게 간다.
          */}
          <Link
            to="/app/ai-pt"
            onClick={() => close(shown.id)}
            className="press min-h-11 flex-1 px-3 py-2.5 text-[13px] font-bold leading-snug text-ink touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-ink"
          >
            {shown.message}
          </Link>
          <button
            type="button"
            onClick={() => close(shown.id)}
            aria-label="칭찬 닫기"
            // 아이콘은 작아도 누르는 자리는 44px이어야 한다
            className="flex min-h-11 min-w-11 items-center justify-center text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-ink"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* 테두리를 두지 않는다. 화분의 오렌지와 겹쳐 링이 하나 더 있는 것처럼 보였다.
          띄우는 일은 그림자가 맡고, 선이 없어진 만큼 그림을 키운다 */}
      <Link
        to="/app/ai-pt"
        aria-label="AI 코치"
        className="press flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-xl touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
      >
        <SproutIcon size={40} />
      </Link>
    </div>
  )
}
