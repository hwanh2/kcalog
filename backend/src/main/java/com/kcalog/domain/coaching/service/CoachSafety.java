package com.kcalog.domain.coaching.service;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 코치 대화의 안전 판정 (add-apps-in-toss D11). 앱인토스 AI 채팅 기준은 위험 키워드와 문맥을 함께 보라고 한다.
 * 문맥은 OpenAI Moderation이, 키워드는 여기서 본다. Moderation이 한국어 은어(먹토, 씹뱉)나
 * 짧은 표현을 놓치는 경우가 있어서 둘 중 하나만 걸려도 안전 응답을 낸다.
 *
 * <p>키워드는 띄어쓰기를 지운 뒤 맞춘다. "죽고 싶어"와 "죽고싶어"를 같게 보기 위해서다.
 * 목록을 넓히면 평범한 질문이 안전 응답으로 막힌다. "굶"은 "아침 굶었어"처럼 식단 대화에 흔해서 넣지 않았다.
 */
final class CoachSafety {

    private static final Set<String> SELF_HARM_CATEGORIES =
            Set.of("self-harm", "self-harm/intent", "self-harm/instructions");

    private static final List<Pattern> SELF_HARM_KEYWORDS = patterns(
            "죽고싶", "자해", "자살", "목숨을끊", "사라지고싶");

    // "(?<!마)토하": "토마토하고"에 "토하"가 들어 있어 앞 글자가 '마'인 경우를 뺀다
    private static final List<Pattern> DISORDERED_EATING_KEYWORDS = patterns(
            "먹토", "씹뱉", "(?<!마)토하", "토해서", "구토유도", "억지로토", "일부러토",
            "설사약", "변비약", "이뇨제");

    private static final String SELF_HARM_REPLY = """
            많이 힘든 마음을 꺼내 주셨네요. 이 대화로는 충분히 도와드리기 어려워요. \
            혼자 견디지 말고 자살예방상담전화 109(24시간)나 정신건강위기상담전화 1577-0199에 이야기해 주세요. \
            위급하다면 112나 119로 바로 연락해 주세요.""";

    private static final String DISORDERED_EATING_REPLY = """
            구토나 약으로 체중을 줄이는 방법은 몸에 큰 무리를 줘서 도와드릴 수 없어요. \
            식사나 몸무게 때문에 마음이 힘들다면 정신건강위기상담전화 1577-0199(24시간)에서 이야기를 나눠 보세요. \
            꾸준히 먹으면서 줄이는 방법은 언제든 함께 찾아볼게요.""";

    private static final String REFUSE_REPLY =
            "그 이야기는 도와드리기 어려워요. 식단이나 체중 관리에 관한 질문이라면 언제든 물어봐 주세요.";

    private CoachSafety() {
    }

    static SafetyVerdict judge(String text, ModerationResult moderation) {
        String compact = text == null ? "" : text.replaceAll("\\s+", "");
        boolean selfHarmFlagged = moderation.categories().stream().anyMatch(SELF_HARM_CATEGORIES::contains);
        if (selfHarmFlagged || matches(compact, SELF_HARM_KEYWORDS)) {
            return SafetyVerdict.SELF_HARM;
        }
        if (matches(compact, DISORDERED_EATING_KEYWORDS)) {
            return SafetyVerdict.DISORDERED_EATING;
        }
        if (moderation.flagged()) {
            return SafetyVerdict.REFUSE;
        }
        return SafetyVerdict.ALLOW;
    }

    /**
     * 코치가 만든 답의 판정. 키워드는 보지 않는다. "설사약보다 식이섬유를 늘려 보세요"처럼
     * 위험한 방법을 말리는 정상 답에도 같은 단어가 들어가기 때문이다.
     */
    static SafetyVerdict judgeAnswer(ModerationResult moderation) {
        if (moderation.categories().stream().anyMatch(SELF_HARM_CATEGORIES::contains)) {
            return SafetyVerdict.SELF_HARM;
        }
        return moderation.flagged() ? SafetyVerdict.REFUSE : SafetyVerdict.ALLOW;
    }

    static String reply(SafetyVerdict verdict) {
        return switch (verdict) {
            case SELF_HARM -> SELF_HARM_REPLY;
            case DISORDERED_EATING -> DISORDERED_EATING_REPLY;
            case REFUSE -> REFUSE_REPLY;
            case ALLOW -> throw new IllegalArgumentException("통과한 대화에는 안전 응답이 없다");
        };
    }

    private static boolean matches(String compact, List<Pattern> patterns) {
        return patterns.stream().anyMatch(p -> p.matcher(compact).find());
    }

    private static List<Pattern> patterns(String... regexes) {
        return Arrays.stream(regexes).map(Pattern::compile).toList();
    }
}
