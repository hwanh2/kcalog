package com.kcalog.domain.coaching.service;

import com.kcalog.domain.coaching.entity.PraiseKind;

/**
 * 감지된 칭찬거리 하나.
 *
 * @param kind      종류(표시 우선순위를 들고 있다)
 * @param dedupeKey 같은 일을 두 번 칭찬하지 않기 위한 키
 * @param fact      LLM에 넘길 사실 한 줄. 여기 없는 수치를 지어내지 말라고 프롬프트가 못 박는다
 * @param fallback  문구 생성이 실패했을 때 쓸 문구. 규칙이 판정하면서 함께 만든다(design D3)
 */
public record PraiseCandidate(PraiseKind kind, String dedupeKey, String fact, String fallback) {
}
