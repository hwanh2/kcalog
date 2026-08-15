# add-landing-install-guide

## Why

`kcalog.site`에 처음 들어오면 보이는 것이 로그인 화면 하나다. 서비스가 뭘 해주는지 한 줄도 없이 카카오 로그인부터 요구한다. 검색이나 링크로 흘러들어온 사람은 여기서 대부분 이탈한다.

더 큰 문제는 **홈 화면에 추가할 수 있다는 사실을 아무도 모른다**는 것이다. PWA 설정(manifest, 아이콘, standalone 메타)은 `add-deployment`에서 이미 끝냈지만, 그걸 알려주는 화면이 없어서 실제로는 아무도 설치하지 않는다. 브라우저 탭으로 쓰다 잊히면 사진 촬영·매일 기록 같은 이 앱의 핵심 습관이 성립하지 않는다.

설치 안내는 **기기마다 방법이 다르다**는 점에서 단순한 안내 문구로 끝나지 않는다. 안드로이드·데스크톱 크롬은 `beforeinstallprompt`로 실제 설치를 띄울 수 있지만, **iOS는 설치를 트리거하는 API가 아예 없어** 공유 → 홈 화면에 추가를 사람이 직접 하도록 가리키는 것 말고는 방법이 없다. 이미 설치해서 앱으로 실행 중인 사람에게는 안내 자체가 보이면 안 된다.

## What Changes

- **랜딩 페이지 신설(`/`)** — 서비스 설명과 설치 안내를 담당한다. 검색·링크·QR로 들어온 사람이 처음 만나는 화면이다.
- **앱을 `/app` 아래로 이동** — `/app`, `/app/records`, `/app/weight`, `/app/report`, `/app/ai-pt`, `/app/profile`, `/app/onboarding`. manifest `start_url`을 `/app`으로 바꾸면 **홈 화면 아이콘은 앱으로, 링크는 랜딩으로** 자바스크립트 감지 없이 갈린다.
- **`/login`·`/auth/callback`은 루트에 유지** — 백엔드가 이 경로로 리다이렉트하므로 옮기면 백엔드 배포가 따라온다.
- **설치 상태 판정을 한 곳으로** — `설치됨 / 설치가능 / iOS / 데스크톱` 네 상태를 훅 하나가 판정하고, 설치 UI는 그 결과만 소비한다.
- **기기별 설치 안내** — 설치가능이면 실제 설치 프롬프트, iOS면 공유 → 홈 화면에 추가 안내, 데스크톱이면 QR로 폰에 넘긴다. 이미 설치된 상태면 설치 UI를 노출하지 않는다.
- **앱 스크린샷** — 데이터를 채운 실제 화면을 캡처해 랜딩에 싣는다.
- **공유·검색 메타** — 제목·설명·OG 태그. 카카오톡으로 링크를 던졌을 때 미리보기가 뜨게 한다.

## Impact

- Affected specs: `landing-install` (신규 capability)
- Affected code (frontend): `src/App.tsx`(라우트 재편), `src/auth/landingPath.ts`·`RequireAuth.tsx`·`CallbackPage.tsx`·`LoginPage.tsx`(착지 경로), `src/shell/AppShell.tsx`·`HomePage.tsx`·`WeightMiniCard.tsx`(내부 링크), `vite.config.ts`(manifest `start_url`), `index.html`(공유 메타), 랜딩 페이지·설치 훅·설치 안내 컴포넌트 신규
- Affected code (backend): **없음**
- Affected assets: `frontend/public/`에 스크린샷·QR 이미지 추가
- 마이그레이션: 없음
- **기존 설치본은 재설치가 필요하다** — 홈 화면에 이미 추가한 바로가기는 `start_url`이 `/`로 굳어 있어 랜딩이 열린다. 현재 사용자는 개발자 본인뿐이라 수용한다.
- 스코프 밖: 백엔드 변경, 랜딩에서의 비로그인 체험(설치 유도 하나만 둔다), 블로그·공지 같은 부가 페이지, 다국어, 설치율 측정·A/B
