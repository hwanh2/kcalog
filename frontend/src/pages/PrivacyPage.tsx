import type { MouseEvent, ReactNode } from 'react'
import { IS_TOSS, loadToss } from '../platform'

/**
 * 개인정보 처리방침 (add-apps-in-toss D13). 로그인 없이 열리는 공개 페이지라 웹 랜딩, 로그인 화면,
 * 프로필, 앱인토스 콘솔 등록에서 같은 주소(/privacy)를 가리킨다.
 *
 * 내용은 실제 운영 구성(deploy/, application.yml)에서 옮겼다. 보관 기간이나 위탁처를 바꾸면 여기도 고친다:
 * 미확정 분석 사진 24시간(app.storage.retention-hours), DB 백업 14일(BACKUP_RETENTION_DAYS),
 * 서버 로그 30일(deploy/monitoring/loki.yml).
 */
export function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-canvas px-5 pt-8 pb-16 text-ink">
      <h1 className="text-2xl font-bold">개인정보 처리방침</h1>
      <p className="mt-2 text-sm text-muted">시행일 2026년 10월 10일</p>
      <p className="mt-4 text-sm leading-relaxed">
        칼로그(이하 "서비스")는 이용자의 개인정보를 소중히 다루고, 「개인정보 보호법」에 따라 아래와 같이 처리해요.
      </p>

      <Section title="1. 처리하는 개인정보">
        <List
          items={[
            '로그인: 카카오로 가입하면 카카오 회원번호와 닉네임, 토스 앱에서 이용하면 토스가 미니앱별로 발급하는 사용자 식별키. 토스 이용자의 이름, 연락처는 받지 않아요. 카카오 닉네임은 첫 설정을 마치면 서비스 닉네임으로 바뀌어 남지 않아요.',
            '프로필: 서비스 닉네임(처음에는 "익명의 다이어터"처럼 자동으로 붙고 바꿀 수 있음), 성별, 출생연도, 키, 활동량, 목표(감량, 유지, 증량), 목표 체중, 근육량 목표 여부, 하루 목표 칼로리',
            '기록: 식사(음식 이름, 양, 칼로리와 영양 정보, 시각), 식사 사진, 사진에 덧붙인 설명, 체중, 즐겨찾기와 영양값 보정 기록, AI 코치와 나눈 대화',
            '의견 보내기: 의견 내용, 앱 버전, 기기와 브라우저 정보',
            '자동 수집: 서비스 이용 기록(접속 시각, IP 주소, 기기와 브라우저 정보)',
          ]}
        />
      </Section>

      <Section title="2. 처리 목적">
        <List
          items={[
            '식단과 체중 기록, 하루 목표 칼로리 계산 등 서비스 제공',
            '식사 사진과 설명을 AI로 분석해 음식과 영양 정보를 추정',
            '기록을 바탕으로 한 AI 코칭과 대화, 대화의 안전 검사',
            '의견과 문의에 대한 확인, 오류 확인과 서비스 보안',
          ]}
        />
      </Section>

      <Section title="3. 보관 기간과 파기">
        <List
          items={[
            '회원 탈퇴 시 계정과 모든 기록, 저장된 사진을 바로 삭제해요.',
            '분석만 하고 식사로 저장하지 않은 사진은 24시간 안에 삭제해요.',
            '장애 복구용 데이터베이스 백업에는 삭제 후 최대 14일까지 남아 있다가 자동으로 지워져요.',
            '서버 이용 기록은 30일 동안 보관한 뒤 삭제해요.',
            '파기할 때는 데이터베이스와 저장소에서 복구할 수 없는 방법으로 삭제해요.',
          ]}
        />
      </Section>

      <Section title="4. 처리 위탁과 국외 이전">
        <p className="text-sm leading-relaxed">
          서비스 운영을 위해 아래 업체에 개인정보 처리를 맡기고, 일부는 국외에서 처리돼요. 서비스를 이용하는 동안
          네트워크로 전송되고, 보관 기간은 위 3번이나 각 업체의 정책을 따라요. 국외 이전을 원하지 않으면 회원 탈퇴로
          처리를 멈출 수 있어요. 이 경우 서비스는 더 이상 이용할 수 없어요.
        </p>
        <div className="mt-3 space-y-3">
          {PROCESSORS.map((p) => (
            <div key={p.name} className="rounded-tile bg-surface p-3 text-sm">
              <p className="font-semibold">
                {p.name} <span className="font-normal text-muted">({p.country})</span>
              </p>
              <p className="mt-1 text-muted">맡기는 일: {p.task}</p>
              <p className="mt-0.5 text-muted">전송 항목: {p.items}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          OpenAI는 API로 받은 데이터를 AI 학습에 쓰지 않고, 남용 감시를 위해 최대 30일 보관한 뒤 삭제해요.
        </p>
      </Section>

      <Section title="5. 이용자의 권리">
        <List
          items={[
            '프로필 화면에서 내 정보를 확인하고 고칠 수 있어요.',
            '프로필 화면의 회원 탈퇴로 언제든 모든 정보를 삭제할 수 있어요.',
            '열람, 정정, 삭제, 처리 정지는 아래 연락처로도 요청할 수 있고, 바로 처리해요.',
          ]}
        />
      </Section>

      <Section title="6. 만 14세 미만 아동">
        <p className="text-sm leading-relaxed">서비스는 만 14세 이상을 대상으로 하고, 만 14세 미만 아동의 개인정보를 알면서 수집하지 않아요.</p>
      </Section>

      <Section title="7. 안전성 확보 조치">
        <List
          items={[
            '모든 통신은 HTTPS로 암호화해요.',
            '비밀번호는 받지 않고, 로그인은 카카오와 토스의 인증을 사용해요.',
            '운영 서버와 저장소 접근 권한은 운영자로 제한해요.',
          ]}
        />
      </Section>

      <Section title="8. 개인정보 보호책임자">
        <p className="text-sm leading-relaxed">
          칼로그 운영자
          <br />
          이메일:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            onClick={openMailInToss}
            className="font-semibold text-brand-ink underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          개인정보 침해 신고나 상담은 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972)에도 할 수
          있어요.
        </p>
      </Section>

      <Section title="9. 변경 안내">
        <p className="text-sm leading-relaxed">처리방침이 바뀌면 시행 전에 이 페이지에 알려요.</p>
      </Section>
    </main>
  )
}

const CONTACT_EMAIL = 'ymkim2353@gmail.com'

/** 토스 WebView에서 mailto 링크가 열리는지 문서에 없다. 토스 빌드에서는 SDK의 openURL로 연다 (add-apps-in-toss D15) */
function openMailInToss(event: MouseEvent<HTMLAnchorElement>) {
  if (!IS_TOSS) return
  event.preventDefault()
  const href = event.currentTarget.href
  void loadToss().then((toss) => toss.openExternal(href))
}

const PROCESSORS = [
  {
    name: 'OpenAI, L.L.C.',
    country: '미국',
    task: '식사 사진 분석, AI 코칭과 대화, 대화의 안전 검사',
    items: '식사 사진, 사진 설명, 프로필과 기록 요약, 코치 대화 내용',
  },
  {
    name: 'Amazon Web Services, Inc.',
    country: '대한민국, 서울 리전',
    task: '서비스 서버와 데이터베이스 운영',
    items: '위 1번의 모든 정보',
  },
  {
    name: 'Cloudflare, Inc.',
    country: '미국',
    task: '식사 사진 저장, 데이터베이스 백업 보관',
    items: '식사 사진, 데이터베이스 백업(위 1번의 정보)',
  },
  {
    name: 'Vercel Inc.',
    country: '미국',
    task: '웹 화면 전송',
    items: '접속 기록(IP 주소, 브라우저 정보)',
  },
  {
    name: 'Google LLC',
    country: '미국',
    task: '의견 도착 알림 메일 발송',
    items: '의견 내용, 앱 버전, 기기 정보',
  },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
