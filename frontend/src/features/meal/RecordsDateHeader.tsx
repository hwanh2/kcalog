import { Link } from 'react-router'
import { koreanWeekday, weekDates } from '../../lib/date'
import { UserIcon } from '../../ui/icons'

/**
 * 음식기록 탭의 날짜 머리 — 브랜드 면 위에 선택한 날짜 + 그 주(월~일) 띠.
 *
 * 이 탭은 원래 "오늘만 담는 화면"이었고 지난 날짜는 홈에서 넘겨봤다. 그런데 홈에서 날짜를
 * 옮기고 넘어와도 기록 화면은 늘 오늘이라 **홈과 기록 화면이 다른 날을 보고 있었다.**
 * 날짜를 이 화면이 직접 들고, 홈은 그 값을 실어 보낸다(design D21).
 *
 * 앱 헤더를 감춘 자리를 이게 대신하므로 프로필 진입도 여기 있다(design D18).
 * 알림 같은 새 진입점은 두지 않는다 — 없는 기능의 자리를 미리 만들지 않는다.
 */
export function RecordsDateHeader({
  date,
  today,
  onChange,
}: {
  date: string
  /** 서비스 기준 오늘 — 이후 날짜는 고를 수 없다(먹지 않은 날에 담을 이유가 없다) */
  today: string
  onChange: (next: string) => void
}) {
  const [, month, day] = date.split('-')

  return (
    // -mx-4 -mt-4 — 셸 본문의 좌우·위 여백을 거슬러 화면 끝까지 채운다(머리는 면이 이어져야 한다)
    <header className="-mx-4 -mt-4 bg-brand px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-on-brand">
      <div className="flex items-center justify-between gap-2">
        {/* 네이티브 날짜 선택을 제목 위에 투명하게 덮는다 — 홈의 캘린더 아이콘과 같은 방식.
            overflow-hidden도 같은 이유다(design D27). 이 머리는 화면 왼쪽에 붙어 있어 넘쳐도
            아직 증상이 없었을 뿐이다 — 자리 배치에 기대는 안전은 안전이 아니다 */}
        <div className="relative overflow-hidden">
          <p className="flex items-center gap-1.5 text-xl font-extrabold tabular-nums">
            {Number(month)}.{Number(day)} {koreanWeekday(date)}
            <span aria-hidden className="text-xs">
              ▼
            </span>
          </p>
          <input
            type="date"
            aria-label="날짜 선택"
            value={date}
            max={today}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0"
          />
        </div>

        <Link
          to="/app/profile"
          aria-label="프로필"
          className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-on-brand touch-manipulation focus-visible:ring-2 focus-visible:ring-on-brand"
        >
          <UserIcon />
        </Link>
      </div>

      {/* 주간 띠 — 그 날짜가 속한 주(월~일). 오늘 이후는 누를 수 없다 */}
      <ul className="mt-1 flex">
        {weekDates(date).map((d) => {
          const selected = d === date
          const future = d > today
          return (
            <li key={d} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(d)}
                disabled={future}
                aria-current={selected ? 'date' : undefined}
                aria-label={`${Number(d.split('-')[1])}월 ${Number(d.split('-')[2])}일 ${koreanWeekday(d)}요일`}
                className="flex w-full min-h-11 flex-col items-center gap-0.5 py-0.5 touch-manipulation focus-visible:ring-2 focus-visible:ring-on-brand disabled:opacity-40"
              >
                <span className="text-[11px] font-semibold">{koreanWeekday(d)}</span>
                {/*
                  선택된 날은 흰 면에 브랜드 글씨 — 브랜드 면 위 흰 글씨는 대비가 낮아(2.86:1)
                  같은 색조로 강약을 주면 어느 날이 선택됐는지 읽히지 않는다. 면을 뒤집는다.
                */}
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] tabular-nums ${
                    selected ? 'bg-surface font-extrabold text-brand-ink' : 'font-semibold'
                  }`}
                >
                  {Number(d.split('-')[2])}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </header>
  )
}
