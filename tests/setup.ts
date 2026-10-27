import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { setupServer } from 'msw/node'
import { handlers } from '../src/mock/handlers'

/**
 * Vitest 全局测试设置：由 vitest 配置的 setupFiles 引入，在每个测试文件执行前运行。
 * 1. 给所有 mount() 出来的组件注册 Element Plus（组件、指令、ElMessage 等）；
 * 2. 每个用例前清空 localStorage，避免持久化 store 的状态串用例；
 * 3. 用 MSW 在 Node 侧拦截网络请求，handlers 与浏览器端 mock 共用同一份。
 */

// 统一挂载 Element Plus：等价于在测试里给每个 mount() 传入 global.plugins
config.global.plugins = [ElementPlus]

// 复用 src/mock/handlers：浏览器里由 worker 拦截，测试里由 Node 拦截
export const server = setupServer(...handlers)

beforeAll(() => {
  // 未匹配到 handler 的请求直接报错，尽早暴露漏配的接口
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  // pinia-plugin-persistedstate 会把 user store 写进 localStorage，用例之间必须隔离
  window.localStorage.clear()
})

afterEach(() => {
  // 撤销用例内通过 server.use() 添加的临时 handler，避免影响后续用例
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
