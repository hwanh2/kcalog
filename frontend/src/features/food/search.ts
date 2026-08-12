import type { Food } from '../../api/food'

/** 유사도 폴백을 후보로 인정할 최소값 — 한 글자 오타는 통과, 다른 음식은 걸러지는 선 */
const SIMILARITY_THRESHOLD = 0.3

/** 음식명 정규화 — 백엔드 FoodNames.normalize의 거울(공백 제거·소문자) */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase()
}

/**
 * 음절 2-gram 자카드 유사도 — 오타 교정용 폴백.
 * "닥가슴살"과 "닭가슴살"처럼 한 글자가 틀려도 나머지 조각이 겹쳐 살아난다.
 * 동의어(계란/달걀)는 원리상 잡을 수 없어 별칭으로 따로 다룬다.
 */
export function bigramJaccard(a: string, b: string): number {
  const left = bigrams(normalizeName(a))
  const right = bigrams(normalizeName(b))
  if (left.size === 0 || right.size === 0) {
    // 두 글자 미만이라 조각을 못 만드는 경우 — 완전 일치로만 판정한다
    return normalizeName(a) === normalizeName(b) ? 1 : 0
  }
  let shared = 0
  for (const gram of left) {
    if (right.has(gram)) shared++
  }
  return shared / (left.size + right.size - shared)
}

function bigrams(text: string): Set<string> {
  const grams = new Set<string>()
  for (let i = 0; i + 1 < text.length; i++) {
    grams.add(text.slice(i, i + 2))
  }
  return grams
}

/**
 * 카탈로그·즐겨찾기 통합 검색.
 * 정확 일치 → 앞부분 일치 → 부분 일치 → 별칭 일치 순으로 정렬하고,
 * 그렇게 걸린 게 하나도 없을 때만 유사도 폴백을 돌린다(오타 교정).
 * 같은 순위끼리는 원래 목록 순서를 유지한다 — 즐겨찾기가 카탈로그보다 앞에 온다.
 */
export function searchFoods(foods: Food[], query: string): Food[] {
  const q = normalizeName(query)
  if (q === '') {
    return foods
  }

  const ranked = foods
    .map((food, index) => ({ food, index, rank: rankOf(food, q) }))
    .filter((entry) => entry.rank !== null)
    .sort((a, b) => a.rank! - b.rank! || a.index - b.index)
    .map((entry) => entry.food)
  if (ranked.length > 0) {
    return ranked
  }

  return foods
    .map((food) => ({ food, score: bigramJaccard(food.name, query) }))
    .filter((entry) => entry.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.food)
}

/** 낮을수록 먼저. 어디에도 걸리지 않으면 null */
function rankOf(food: Food, q: string): number | null {
  const name = normalizeName(food.name)
  if (name === q) return 0
  if (name.startsWith(q)) return 1
  if (name.includes(q)) return 2
  const aliases = food.aliases.map(normalizeName)
  if (aliases.some((alias) => alias === q)) return 3
  if (aliases.some((alias) => alias.includes(q))) return 4
  return null
}
