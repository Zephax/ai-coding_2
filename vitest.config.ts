import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 组件测试需要 DOM；request 拦截器里也会用到 window.setTimeout / localStorage
    environment: 'jsdom',
    // 每个测试文件执行前加载：Element Plus、localStorage 清理、MSW server（node 模式）
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // MSW handlers 内置 200~400ms 模拟延迟，链接多请求的用例留足超时
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      // 入口与浏览器专用 worker 无法在 jsdom 中覆盖
      exclude: ['src/main.ts', 'src/mock/browser.ts'],
    },
  },
})
