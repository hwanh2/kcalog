package com.kcalog.global.config;

import com.kcalog.domain.auth.exception.AppsInTossUnavailableException;
import com.kcalog.domain.auth.service.AppsInTossClient;
import com.kcalog.global.common.AppProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.time.Duration;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 인증서는 운영에서만 주입되므로, 읽는 경로가 깨져도 로컬과 CI에서는 드러나지 않는다. 여기서 대신 확인한다. */
class AppsInTossConfigTest {

    private static AppProperties props(String certificate, String privateKey) {
        return new AppProperties(null, null, null, null, null, null, null, null,
                new AppProperties.AppsInToss("https://apps-in-toss-api.toss.im", certificate, privateKey,
                        Duration.ofSeconds(5)));
    }

    @Test
    @DisplayName("PEM 인증서와 키가 주어지면 mTLS 클라이언트를 만든다")
    void buildsWithPem(@TempDir Path dir) throws Exception {
        String[] pem = selfSignedPem(dir);

        assertThatCode(() -> new AppsInTossConfig().appsInTossClient(props(pem[0], pem[1])))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("인증서가 비어 있으면 꺼진 클라이언트를 등록한다")
    void disabledWithoutCertificate() {
        AppsInTossClient client = new AppsInTossConfig().appsInTossClient(props("", ""));

        assertThatThrownBy(() -> client.exchangeAnonKey("code"))
                .isInstanceOf(AppsInTossUnavailableException.class);
    }

    /**
     * 테스트용 자체 서명 인증서를 실행할 때마다 만든다. 키 파일을 저장소에 두면 공개 저장소의 시크릿 검사에 걸린다.
     * JDK에는 인증서를 만드는 공개 API가 없어 같은 JDK의 keytool을 부른다. {인증서 PEM, 개인키 PEM}을 돌려준다.
     */
    private static String[] selfSignedPem(Path dir) throws Exception {
        Path keystore = dir.resolve("test.p12");
        String password = "test-only";
        String keytool = Path.of(System.getProperty("java.home"), "bin", "keytool").toString();
        Process process = new ProcessBuilder(keytool, "-genkeypair", "-alias", "test", "-keyalg", "RSA",
                "-keysize", "2048", "-dname", "CN=kcalog-test-only", "-validity", "1",
                "-storetype", "PKCS12", "-keystore", keystore.toString(),
                "-storepass", password, "-keypass", password)
                .redirectErrorStream(true).start();
        if (process.waitFor() != 0) {
            throw new IllegalStateException("keytool 실패: " + new String(process.getInputStream().readAllBytes()));
        }

        KeyStore store = KeyStore.getInstance("PKCS12");
        try (InputStream in = Files.newInputStream(keystore)) {
            store.load(in, password.toCharArray());
        }
        byte[] certificate = store.getCertificate("test").getEncoded();
        byte[] privateKey = store.getKey("test", password.toCharArray()).getEncoded();
        return new String[]{pem("CERTIFICATE", certificate), pem("PRIVATE KEY", privateKey)};
    }

    private static String pem(String type, byte[] der) {
        String body = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(der);
        return "-----BEGIN " + type + "-----\n" + body + "\n-----END " + type + "-----\n";
    }
}
