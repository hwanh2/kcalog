# 백엔드 운영 이미지. 빌드 컨텍스트는 backend/ 디렉터리다.
#   docker build -t kcalog-backend backend/

# --- 빌드 ---
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# 의존성만 먼저 받아 레이어로 굳힌다 — src만 바뀐 재빌드에서 이 단계를 건너뛴다
COPY gradle gradle
COPY gradlew settings.gradle.kts build.gradle.kts ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies

COPY src src
# 테스트는 CI가 이미 돌렸다. 이미지 빌드에서 또 돌리면 Docker 데몬(Testcontainers)이 필요해진다.
RUN ./gradlew --no-daemon bootJar -x test

# --- 실행 ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# root로 돌지 않는다 — 컨테이너가 뚫려도 호스트 마운트를 건드리기 어렵게
RUN useradd --system --uid 10001 --create-home app
COPY --from=build /build/build/libs/*.jar app.jar
RUN chown app:app app.jar
USER app

EXPOSE 8080

# 컨테이너 메모리 한도에 맞춰 힙을 잡는다(t3.small 2GB에 JVM·Postgres·Traefik이 함께 산다)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
