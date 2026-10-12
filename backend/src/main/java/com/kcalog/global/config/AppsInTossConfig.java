package com.kcalog.global.config;

import com.kcalog.domain.auth.service.AppsInTossClient;
import com.kcalog.global.common.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.boot.ssl.pem.PemSslStoreBundle;
import org.springframework.boot.ssl.pem.PemSslStoreDetails;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;

/** 앱인토스 파트너 API용 mTLS RestClient. 인증서가 없으면 꺼진 클라이언트를 등록한다 (add-apps-in-toss D5). */
@Slf4j
@Configuration
public class AppsInTossConfig {

    @Bean
    public AppsInTossClient appsInTossClient(AppProperties props) {
        AppProperties.AppsInToss conf = props.appsInToss();
        if (conf == null || !conf.configured()) {
            log.info("앱인토스 인증서 미설정: 토스 로그인은 503으로 응답한다");
            return AppsInTossClient.disabled();
        }

        // 신뢰 저장소를 비워 두면 JVM 기본 CA를 쓴다. 앱인토스 서버 인증서는 공인 CA라 따로 둘 필요가 없다.
        PemSslStoreDetails keyStore = PemSslStoreDetails.forCertificate(conf.certificate())
                .withPrivateKey(conf.privateKey());
        SslBundle bundle = SslBundle.of(new PemSslStoreBundle(keyStore, null));

        HttpClient httpClient = HttpClient.newBuilder()
                .sslContext(bundle.createSslContext())
                .connectTimeout(conf.timeout())
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(conf.timeout());

        return new AppsInTossClient(RestClient.builder()
                .baseUrl(conf.baseUrl())
                .requestFactory(factory)
                .build());
    }
}
