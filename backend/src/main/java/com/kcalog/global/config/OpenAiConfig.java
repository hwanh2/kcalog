package com.kcalog.global.config;

import com.kcalog.global.common.AppProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** OpenAI 전용 RestClient — base-url·인증 헤더·타임아웃을 앱 설정에서 주입 (동기 호출) */
@Configuration
public class OpenAiConfig {

    @Bean
    public RestClient openAiRestClient(AppProperties props) {
        AppProperties.Openai openai = props.openai();
        int timeoutMs = (int) openai.timeout().toMillis();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);

        return RestClient.builder()
                .baseUrl(openai.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + openai.apiKey())
                .requestFactory(factory)
                .build();
    }
}
