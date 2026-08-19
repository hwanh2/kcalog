package com.kcalog.domain.coaching.service;

import com.kcalog.domain.coaching.dto.PraiseResponse;
import com.kcalog.domain.coaching.entity.Praise;
import com.kcalog.domain.coaching.repository.PraiseRepository;
import com.kcalog.domain.meal.service.OpenAiClient;
import com.kcalog.global.common.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 코치의 칭찬. 사건 감지(규칙), 문구 생성(LLM), 읽음 처리.
 * <p>
 * 문구를 저장해 두는 이유는 말풍선이 기다림 없이 떠야 하기 때문이다. 생성이 실패해도 폴백 문구로
 * 저장한다. 저장하지 않으면 회원이 화면을 옮길 때마다 실패한 호출이 되살아난다(design D3).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PraiseService {

    /** message 컬럼 길이. LLM이 길게 답해도 저장은 성공해야 한다 */
    private static final int MESSAGE_MAX = 200;

    private final PraiseRepository praiseRepository;
    private final PraiseSignalsCollector signalsCollector;
    private final OpenAiClient openAiClient;
    private final AppProperties props;
    private final Clock clock;

    /**
     * 지금 건넬 칭찬 한 건.
     * <p>
     * 이 메서드에 트랜잭션을 걸지 않는다. 수 초짜리 LLM 호출이 트랜잭션 안에 들어가면 그동안
     * 커넥션을 점유한다(브리핑과 같은 이유). 조회와 저장은 각자의 트랜잭션에 맡긴다.
     */
    public PraiseResponse current(Long memberId) {
        Praise pending = pending(memberId);
        if (pending != null) {
            return PraiseResponse.of(pending);  // 감지도 LLM도 돌지 않는다 (design D7)
        }
        Praise created = detectAndSave(memberId);
        return created == null ? PraiseResponse.none() : PraiseResponse.of(created);
    }

    /** 안 읽은 칭찬 중 우선순위가 가장 높은 것. 같은 순위면 먼저 생긴 것 */
    private Praise pending(Long memberId) {
        return praiseRepository.findByMemberIdAndDismissedAtIsNullOrderByCreatedAtAsc(memberId).stream()
                .min(Comparator.comparingInt(praise -> praise.getKind().getPriority()))
                .orElse(null);
    }

    private Praise detectAndSave(Long memberId) {
        List<PraiseCandidate> candidates = PraiseRules.detect(signalsCollector.collect(memberId));
        if (candidates.isEmpty()) {
            return null;
        }
        PraiseCandidate fresh = firstUnpraised(memberId, candidates);
        if (fresh == null) {
            return null;
        }
        return save(memberId, fresh);
    }

    /**
     * 이미 칭찬한 것을 걸러내고 우선순위가 가장 높은 하나만 남긴다.
     * 한 번에 여럿을 만들지 않는 이유는 어차피 하나씩 보여주기 때문이다. 남은 것은 다음 조회에서 잡힌다.
     */
    private PraiseCandidate firstUnpraised(Long memberId, List<PraiseCandidate> candidates) {
        List<String> keys = candidates.stream().map(PraiseCandidate::dedupeKey).toList();
        Set<String> praised = praiseRepository.findByMemberIdAndDedupeKeyIn(memberId, keys).stream()
                .map(Praise::getDedupeKey)
                .collect(Collectors.toSet());
        return candidates.stream()
                .filter(candidate -> !praised.contains(candidate.dedupeKey()))
                .findFirst()
                .orElse(null);
    }

    private Praise save(Long memberId, PraiseCandidate candidate) {
        String message;
        String source;
        try {
            message = generate(candidate.fact());
            source = "LLM";
        } catch (Exception e) {
            log.warn("칭찬 문구 생성 실패, 규칙 문구 사용: {}", e.getMessage());
            message = candidate.fallback();
            source = "RULE";
        }
        try {
            return praiseRepository.save(
                    Praise.of(memberId, candidate.kind(), candidate.dedupeKey(), message, source));
        } catch (DataIntegrityViolationException dup) {
            // 같은 칭찬을 만들려는 요청이 동시에 들어와 경쟁에서 졌다. 이긴 쪽이 저장한 것을 쓴다 (design D4)
            log.debug("칭찬 동시 생성 경쟁, 저장된 것 사용: memberId={} key={}", memberId, candidate.dedupeKey());
            return praiseRepository.findByMemberIdAndDedupeKey(memberId, candidate.dedupeKey()).orElse(null);
        }
    }

    /** 따옴표로 감싸 오거나 지나치게 길게 오는 경우가 있어 다듬는다 */
    private String generate(String fact) {
        String content = openAiClient.complete(PraisePrompt.body(props.openai().model(), fact));
        String trimmed = content == null ? "" : content.trim().replaceAll("^[\"']+|[\"']+$", "").trim();
        if (trimmed.isBlank()) {
            throw new IllegalStateException("빈 칭찬 문구");
        }
        return trimmed.length() > MESSAGE_MAX ? trimmed.substring(0, MESSAGE_MAX) : trimmed;
    }

    /** 읽음 처리. 남의 칭찬은 없는 것으로 다룬다. 있고 없고를 알려줄 이유가 없다 */
    @Transactional
    public void dismiss(Long memberId, Long praiseId) {
        Praise praise = praiseRepository.findById(praiseId)
                .filter(found -> found.isOwnedBy(memberId))
                .orElseThrow(() -> new NoSuchElementException("칭찬을 찾을 수 없습니다"));
        praise.dismiss(Instant.now(clock));
    }
}
