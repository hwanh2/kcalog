/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'kcalog',
        short_name: 'kcalog',
        description: '사진 한 장으로 10초 안에 식사가 기록되는 AI 식단·체중 관리 앱',
        lang: 'ko',
        // 앱은 /app 아래에 있다 — 홈 화면 아이콘은 랜딩(/)을 거치지 않고 곧장 앱으로 들어간다.
        // 이 값을 바꾸면 이미 설치된 바로가기는 갱신되지 않으므로 재설치가 필요하다.
        start_url: '/app',
        display: 'standalone',
        // 앱 배경(canvas)과 맞춰 설치 후 실행 시 흰 화면이 번쩍이지 않게 한다
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          /*
            안드로이드 적응형 아이콘은 **따로 만든 파일**을 쓴다. 마스크는 중앙 80%만 남기고 잘라내는데,
            링이 캔버스의 89%까지 닿아 있어 같은 파일을 쓰면 원형 마스크에서 링 위아래가 잘린다.
            icon-512-maskable은 같은 그림을 80%로 줄여 흰 여백을 두른 것이다.
          */
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    // 백엔드와 동일 출처로 묶어 refresh 쿠키(SameSite)가 로컬에서 동작하게 한다
    proxy: {
      '/api': 'http://localhost:8080',
      '/oauth2': 'http://localhost:8080',
      '/login/oauth2': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      // 측정 전용 — 게이트(thresholds) 없음 (백엔드 JaCoCo와 동일 방침)
      include: ['src/**'],
      exclude: ['src/test/**', 'src/main.tsx'],
      reporter: ['text', 'json-summary', 'json'],
    },
  },
})
