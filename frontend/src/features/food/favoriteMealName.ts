/**
 * 세트 이름 기본값 — 항목에서 만든다("잡곡밥 외 4개").
 *
 * 이름을 필수 입력으로 두면 "빨리 담기"라는 목적과 어긋나고, 자동 생성만 두면 세트 3개가
 * 전부 같은 이름이 되어 구분이 안 된다. 그래서 **채워주되 고칠 수 있게** 한다(design D2).
 */
export function defaultSetName(itemNames: string[]): string {
  const named = itemNames.map((name) => name.trim()).filter((name) => name !== '')
  if (named.length === 0) return ''
  if (named.length === 1) return named[0]
  return `${named[0]} 외 ${named.length - 1}개`
}
