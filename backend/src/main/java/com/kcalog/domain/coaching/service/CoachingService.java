package com.kcalog.domain.coaching.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kcalog.domain.coaching.dto.CoachingBriefingResponse;
import com.kcalog.domain.coaching.dto.CoachingBriefingResponse.Recommendation;
import com.kcalog.domain.coaching.dto.CoachingBriefingResponse.Stats;
import com.kcalog.domain.coaching.dto.CoachingChatMessageResponse;
import com.kcalog.domain.coaching.entity.ChatRole;
import com.kcalog.domain.coaching.entity.CoachingChatMessage;
import com.kcalog.domain.coaching.entity.CoachingMessage;
import com.kcalog.domain.coaching.exception.DailyCoachChatLimitException;
import com.kcalog.domain.coaching.repository.CoachingChatMessageRepository;
import com.kcalog.domain.coaching.repository.CoachingChatUsageRepository;
import com.kcalog.domain.coaching.repository.CoachingMessageRepository;
import com.kcalog.domain.meal.service.OpenAiClient;
import com.kcalog.global.common.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskExecutor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AI PT 코칭 (차별점 #3) — 규칙이 계산한 구조화 신호를 LLM에 주입해 자연어 코칭·대화를 만든다(하이브리드).
 * 브리핑은 하루 1회 캐시, 대화는 히스토리 영속 + 일일 상한. LLM 실패는 규칙 폴백으로 항상 화면을 채운다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoachingService {

    private static final int HISTORY_TURNS = 10;  // 프롬프트에 주입할 최근 대화 턴 수
    private static final long STREAM_TIMEOUT_MS = 60_000L;
    private static final String CHAT_FALLBACK = "지금은 답변을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.";

    private final CoachingMessageRepository briefingRepository;
    private final CoachingChatMessageRepository chatRepository;
    private final CoachingChatUsageRepository chatUsageRepository;
    private final CoachingSignalsCollector signalsCollector;
    private final OpenAiClient openAiClient;
    private final AppProperties props;
    private final Clock clock;
    // SSE 스트림을 요청 스레드에서 분리(프로덕션은 비동기). 필드명이 빈 이름과 일치해 by-name으로 주입된다.
    // 테스트는 동기 실행기로 대체해 스트림 완료를 결정적으로 대기한다.
    private final TaskExecutor coachStreamExecutor;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ---- 오늘의 브리핑 ---------------------------------------------------

    @Transactional
    public CoachingBriefingResponse briefing(Long memberId) {
        LocalDate today = LocalDate.now(clock);

        CoachingMessage cached = briefingRepository.findByMemberIdAndCoachDate(memberId, today).orElse(null);
        if (cached != null) {
            return fromCached(cached);
        }

        CoachingSignals signals = signalsCollector.collect(memberId);
        Stats stats = statsOf(signals);
        if (!signals.enoughData()) {
            return CoachingBriefingResponse.insufficient(stats);
        }

        String signalsJson = toJson(signals);
        try {
            String content = openAiClient.complete(CoachingPrompt.briefingBody(props.openai().model(), signalsJson));
            JsonNode node = objectMapper.readTree(content);
            String headline = node.path("headline").asText("");
            String message = node.path("message").asText("");
            List<Recommendation> recommendations = readRecommendations(node.path("recommendations"));
            if (headline.isBlank() || message.isBlank()) {
                throw new IllegalStateException("빈 코칭 응답");
            }
            briefingRepository.save(CoachingMessage.of(memberId, today, headline, message,
                    objectMapper.writeValueAsString(recommendations), signalsJson, "LLM"));
            return new CoachingBriefingResponse(true, headline, message, recommendations, stats, "LLM");
        } catch (Exception e) {
            log.warn("코칭 브리핑 생성 실패, 규칙 폴백: {}", e.getMessage());
            return fallbackBriefing(signals, stats);  // 실패는 영속하지 않음 — 다음 조회에 재시도
        }
    }

    private CoachingBriefingResponse fromCached(CoachingMessage m) {
        CoachingSignals snapshot = fromJson(m.getSignalsJson());
        Stats stats = snapshot == null ? new Stats(null, null, null) : statsOf(snapshot);
        return new CoachingBriefingResponse(true, m.getHeadline(), m.getMessage(),
                readRecommendations(safeTree(m.getRecommendationsJson())), stats, m.getSource());
    }

    /** LLM 실패 시 규칙 인사이트로 브리핑을 채운다(비영속) */
    private CoachingBriefingResponse fallbackBriefing(CoachingSignals s, Stats stats) {
        String headline;
        if (stats.adherencePct() != null && stats.adherencePct() >= 70) {
            headline = "이번 주 잘 지키고 있어요";
        } else if (s.weightLossKg7d() != null && s.weightLossKg7d() < 0) {
            headline = "감량 흐름을 이어가요";
        } else {
            headline = "오늘도 기록부터 시작해요";
        }
        String message = s.ruleInsights().isEmpty()
                ? "며칠 더 기록하면 데이터에 맞는 코칭을 만들어 드릴게요."
                : String.join(" ", s.ruleInsights().stream().limit(2).toList());
        return new CoachingBriefingResponse(true, headline, message, List.of(), stats, "FALLBACK");
    }

    private Stats statsOf(CoachingSignals s) {
        return new Stats(s.weightLossKg7d(), s.adherencePct(), s.weightStreakDays());
    }

    // ---- 대화형 코칭 -----------------------------------------------------

    @Transactional(readOnly = true)
    public List<CoachingChatMessageResponse> history(Long memberId) {
        return chatRepository.findByMemberIdOrderByCreatedAtAsc(memberId).stream()
                .map(CoachingChatMessageResponse::from)
                .toList();
    }

    @Transactional
    public void clear(Long memberId) {
        chatRepository.deleteByMemberId(memberId);
    }

    /**
     * 대화 — 코치 응답을 SSE로 스트리밍한다. 상한 검사·사용자 메시지 저장·신호 수집은 동기(요청 스레드)로 끝내
     * 상한 초과를 429로 반환하고, 토큰 스트리밍만 별도 스레드로 분리한다.
     * 이벤트: token({t})* → done(저장된 assistant 메시지). LLM 실패 시 폴백 문구로 done.
     */
    @Transactional
    public SseEmitter chatStream(Long memberId, String question) {
        LocalDate today = LocalDate.now(clock);
        int limit = props.openai().dailyCoachChatLimit();
        if (chatUsageRepository.count(memberId, today) >= limit) {
            throw new DailyCoachChatLimitException("오늘 코치와 나눌 수 있는 대화를 다 사용했어요. 내일 다시 이어가요.");
        }

        List<ChatTurn> priorTurns = recentTurns(memberId);  // 현재 질문 저장 전 히스토리
        chatRepository.save(CoachingChatMessage.of(memberId, ChatRole.USER, question));
        String signalsJson = toJson(signalsCollector.collect(memberId));

        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        coachStreamExecutor.execute(() -> runStream(memberId, today, signalsJson, priorTurns, question, emitter));
        return emitter;
    }

    /** 스트림 실행(별도 스레드) — 토큰 방출 후 성공/폴백 메시지를 저장하고 done 이벤트로 마무리 */
    private void runStream(Long memberId, LocalDate day, String signalsJson,
                           List<ChatTurn> priorTurns, String question, SseEmitter emitter) {
        try {
            String answer = openAiClient.stream(
                    CoachingPrompt.chatBody(props.openai().model(), signalsJson, priorTurns, question),
                    token -> emitToken(emitter, token));
            if (answer == null || answer.isBlank()) {
                throw new IllegalStateException("빈 코치 응답");
            }
            CoachingChatMessage saved = persistAssistant(memberId, day, answer.trim(), true);
            emitter.send(SseEmitter.event().name("done").data(CoachingChatMessageResponse.from(saved)));
            emitter.complete();
        } catch (Exception e) {
            log.warn("코치 스트림 실패, 폴백 반환: {}", e.getMessage());
            try {
                CoachingChatMessage saved = persistAssistant(memberId, day, CHAT_FALLBACK, false);
                emitter.send(SseEmitter.event().name("done").data(CoachingChatMessageResponse.from(saved)));
                emitter.complete();
            } catch (IOException io) {
                emitter.completeWithError(io);
            }
        }
    }

    private void emitToken(SseEmitter emitter, String token) {
        try {
            emitter.send(SseEmitter.event().name("token").data(Map.of("t", token)));
        } catch (IOException e) {
            throw new IllegalStateException("SSE 전송 실패", e);  // 스트림 중단 → 폴백 경로로
        }
    }

    /**
     * assistant 메시지 저장 + (성공 시) 사용량 증가. 별도 트랜잭션 없이 repository.save(Spring Data 기본 tx) +
     * JdbcClient(autocommit)로 각각 원자적. 실패 호출은 과금하지 않는다.
     */
    private CoachingChatMessage persistAssistant(Long memberId, LocalDate day, String text, boolean success) {
        CoachingChatMessage saved = chatRepository.save(CoachingChatMessage.of(memberId, ChatRole.ASSISTANT, text));
        if (success) {
            chatUsageRepository.increment(memberId, day);
        }
        return saved;
    }

    /** 프롬프트용 최근 N턴 — 최신 먼저 조회해 시간순으로 뒤집는다 */
    private List<ChatTurn> recentTurns(Long memberId) {
        List<CoachingChatMessage> recent = chatRepository.findByMemberIdOrderByCreatedAtDesc(
                memberId, Limit.of(HISTORY_TURNS));
        List<ChatTurn> turns = new ArrayList<>(recent.size());
        for (int i = recent.size() - 1; i >= 0; i--) {
            CoachingChatMessage m = recent.get(i);
            turns.add(new ChatTurn(m.getRole() == ChatRole.USER ? "user" : "assistant", m.getContent()));
        }
        return turns;
    }

    // ---- JSON 헬퍼 -------------------------------------------------------

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }

    private CoachingSignals fromJson(String json) {
        try {
            return objectMapper.readValue(json, CoachingSignals.class);
        } catch (Exception e) {
            return null;
        }
    }

    private JsonNode safeTree(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return objectMapper.createArrayNode();
        }
    }

    private List<Recommendation> readRecommendations(JsonNode node) {
        List<Recommendation> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(r -> {
                String title = r.path("title").asText("");
                String detail = r.path("detail").asText("");
                if (!title.isBlank() || !detail.isBlank()) {
                    String category = r.path("category").asText("habit");
                    list.add(new Recommendation(category, title, detail));
                }
            });
        }
        return list;
    }
}
