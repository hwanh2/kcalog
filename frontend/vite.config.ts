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
        // 서비스명 확정 시 함께 변경
        name: 'kcalog',
        short_name: 'kcalog',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
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
