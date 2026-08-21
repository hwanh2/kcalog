/**
 * 안내가 비추는 요소의 id. 스텝 배열과 화면이 **같은 상수를 쓴다**.
 * 문자열을 양쪽에 손으로 적으면 오타가 조용히 스팟라이트만 지운다(design D2).
 */
export const TUTORIAL_IDS = {
  calorie: 'tutorial-calorie',
  calorieInfo: 'tutorial-calorie-info',
  macro: 'tutorial-macro',
  macroInfo: 'tutorial-macro-info',
  weight: 'tutorial-weight',
  coach: 'tutorial-coach',
  photo: 'tutorial-photo',
  note: 'tutorial-note',
} as const

/** 홈 스텝과 음식기록 스텝이 사는 경로. `?camera=1`은 붙이지 않는다 (design D7) */
export const HOME_PATH = '/app'
export const RECORDS_PATH = '/app/records'

export interface TutorialStep {
  /** 비출 요소. 없으면 화면 가운데 카드로 뜬다 */
  targetId?: string
  title: string
  body: string
  /**
   * 이 스텝이 사는 화면. 오버레이가 지금 경로와 다르면 옮긴다.
   * 다음 버튼이 아니라 **스텝이 경로를 들고 있어야** 이전으로 돌아갈 때도 같이 돌아간다.
   */
  path: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    path: HOME_PATH,
    targetId: TUTORIAL_IDS.calorie,
    title: '오늘 얼마나 남았는지',
    body: '기록할 때마다 줄어듭니다. 다 채우는 게 목표가 아니라, 남은 만큼이 오늘의 여유예요.',
  },
  {
    path: HOME_PATH,
    targetId: TUTORIAL_IDS.calorieInfo,
    title: '이 숫자가 어디서 나왔는지',
    body: '유지칼로리가 기준선이고 목표는 거기서 빼거나 더한 값이에요. 여기를 누르면 얼마나 조정했는지 볼 수 있어요.',
  },
  {
    path: HOME_PATH,
    targetId: TUTORIAL_IDS.macro,
    title: '탄단지는 기준선이에요',
    body: '세 숫자를 정확히 맞출 필요는 없습니다. 단백질만 챙기면 나머지 둘은 취향껏 나눠도 결과가 크게 다르지 않아요.',
  },
  {
    path: HOME_PATH,
    targetId: TUTORIAL_IDS.macroInfo,
    title: '탄수가 많게 느껴지면',
    body: '지방으로 옮겨도 됩니다. 단백질도 고기만 세는 게 아니라 밥과 채소에 든 것까지 합한 값이에요. 여기에 적어뒀어요.',
  },
  {
    path: HOME_PATH,
    targetId: TUTORIAL_IDS.weight,
    title: '매일 재면 목표가 정확해져요',
    body: '지금 목표는 공식으로 낸 값이라 사람마다 10~15% 어긋납니다. 2주치가 쌓이면 실제로 먹은 양과 체중 변화로 다시 계산해드려요.',
  },
  {
    path: HOME_PATH,
    targetId: TUTORIAL_IDS.coach,
    title: '코치가 지켜보고 있어요',
    body: '잘하고 있을 때 먼저 말을 겁니다. 눌러서 지금 상태에 맞는 조언을 물어볼 수도 있어요.',
  },
  {
    path: RECORDS_PATH,
    targetId: TUTORIAL_IDS.photo,
    title: '사진 한 장이면 끝나요',
    body: '식사 사진을 찍으면 무엇을 얼마나 먹었는지 알아서 계산합니다. 기록은 이 화면에서 해요.',
  },
  {
    path: RECORDS_PATH,
    targetId: TUTORIAL_IDS.note,
    title: '사진이 없어도 괜찮아요',
    body: '이미 먹었거나 찍기 곤란하면 "김치찌개랑 밥 한 공기"처럼 적기만 해도 됩니다. 오늘 먹은 것부터 담아보세요.',
  },
]
