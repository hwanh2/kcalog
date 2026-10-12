import {
  Device,
  PermissionError,
  Screen,
  User,
  graniteEvent,
  tdsEvent,
} from '@apps-in-toss/web-framework'

// 앱인토스 SDK는 이 파일에서만 import한다. 화면 코드가 SDK를 직접 부르면 jsdom 테스트와 웹 번들이 함께 깨진다 (D2)

export type AuthCodeResult = { status: 'ok'; code: string } | { status: 'update-required' }

const UNSUPPORTED_CODES = ['UNSUPPORTED_APP_VERSION', 'UNSUPPORTED_OS_VERSION']

/** 익명 키 인가 코드. 토스 앱이 이 기능을 모르는 옛 버전이면 다시 시도해도 소용없으니 따로 알린다 */
export async function createAuthCode(): Promise<AuthCodeResult> {
  try {
    const { code } = await User.createAnonymousKeyAuthCode()
    return { status: 'ok', code }
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code
    if (typeof code === 'string' && UNSUPPORTED_CODES.includes(code)) return { status: 'update-required' }
    throw error
  }
}

export type PhotoResult = { status: 'picked'; image: Blob } | { status: 'cancelled' } | { status: 'denied' }

export async function pickPhoto(source: 'camera' | 'album'): Promise<PhotoResult> {
  try {
    if (source === 'camera') {
      const photo = await Device.openCamera({ base64: true, maxWidth: 1280 })
      return photo?.dataUri ? { status: 'picked', image: jpegFromBase64(photo.dataUri) } : { status: 'cancelled' }
    }
    const [photo] = await Device.getPhotos({ base64: true, maxCount: 1, maxWidth: 1280 })
    return photo?.dataUri ? { status: 'picked', image: jpegFromBase64(photo.dataUri) } : { status: 'cancelled' }
  } catch (error) {
    if (error instanceof PermissionError) return { status: 'denied' }
    throw error
  }
}

/** 권한을 거부했던 사용자에게 설정 다이얼로그를 다시 띄운다. 허용되면 true */
export async function requestPhotoPermission(source: 'camera' | 'album'): Promise<boolean> {
  const fn = source === 'camera' ? Device.openCamera : Device.getPhotos
  return (await fn.openPermissionDialog()) === 'allowed'
}

export function subscribeBack(onBack: () => void): () => void {
  return graniteEvent.addEventListener('backEvent', { onEvent: onBack })
}

/** 내비바 기능 버튼(apps-in-toss.config.ts의 initialAccessoryButton)이 눌렸을 때. 버튼 id를 넘긴다 */
export function subscribeAccessory(onPress: (id: string) => void): () => void {
  return tdsEvent.addEventListener('navigationAccessoryEvent', { onEvent: ({ id }) => onPress(id) })
}

/** 메일, 외부 주소. WebView 안의 `<a href="mailto:">`가 열리는지 문서에 없어 SDK가 안내하는 방법을 쓴다 */
export function openExternal(url: string): Promise<void> {
  return Device.openURL(url)
}

export function closeApp(): Promise<void> {
  return Screen.close()
}

// base64:false(기본값)일 때 dataUri가 어떤 형식인지 문서에 없다. 형식이 확실한 base64로 받아 직접 바꾼다
function jpegFromBase64(base64: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}
