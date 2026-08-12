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
        start_url: '/',
        display: 'standalone',
        // 앱 배경(canvas)과 맞춰 설치 후 실행 시 흰 화면이 번쩍이지 않게 한다
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        icons: [
          // TODO 설치 배너·홈 화면 아이콘용 192/512 png 추가 (tasks 4.4)
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
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
