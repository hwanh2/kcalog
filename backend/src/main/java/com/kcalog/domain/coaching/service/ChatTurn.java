package com.kcalog.domain.coaching.service;

/** 프롬프트에 주입할 대화 한 턴 — role은 OpenAI 규격("user"/"assistant") */
record ChatTurn(String role, String content) {
}
