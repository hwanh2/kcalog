import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom에는 scrollIntoView가 아예 없다(레이아웃을 계산하지 않으므로). 없는 채로 두면
// 앱 둘러보기가 대상을 화면 안으로 데려오는 자리에서 TypeError로 죽는다.
// 소스에서 `?.`로 피하지 않는 이유: 브라우저에는 항상 있는 API다.
// typeof 검사가 필요한 이유: 이 setup은 node 환경으로 도는 테스트(tokens.sync)에도 걸린다
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

afterEach(() => {
  cleanup()
})
