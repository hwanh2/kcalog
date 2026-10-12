import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  // 콘솔에 등록한 뒤에는 바꿀 수 없다. 딥링크 intoss://oneulsikdan 와 CORS origin(oneulsikdan.apps.tossmini.com)이 여기서 정해진다.
  // 토스에 보이는 앱 이름("식단관리하기")은 콘솔에서 따로 정하고 나중에 바꿀 수 있다
  appName: 'oneulsikdan',
  brand: {
    primaryColor: '#FF6B00',
  },
  // 심사가 이 선언을 본다. 음식 사진을 찍거나 고르는 데만 쓴다 (D8)
  permissions: [
    { name: 'camera', access: 'access' },
    { name: 'photos', access: 'read' },
  ],
  navigationBar: {
    withBackButton: true,
    // 프로필 진입. 웹은 앱 헤더 오른쪽에 두지만, 토스 빌드는 내비바가 이미 위를 차지해 헤더를 한 줄 더 두지 않는다 (D7).
    // 아이콘 이름은 토스 아이콘 세트(static.toss.im/icons)에 있는 것만 쓸 수 있다
    initialAccessoryButton: {
      id: 'profile',
      title: '프로필',
      icon: { name: 'icon-user-mono' },
    },
  },
  webView: {
    // 앱에 자체 당겨서 새로고침(usePullToRefresh)이 있어 WebView 것과 겹치면 두 번 당겨진다 (D10)
    pullToRefreshEnabled: false,
    // iOS 스와이프 뒤로가기가 WebView 히스토리를 직접 넘기면 backEvent 처리(온보딩 단계 되돌리기)를 건너뛴다
    allowsBackForwardNavigationGestures: false,
  },
  webBundleDir: 'dist-toss',
})
