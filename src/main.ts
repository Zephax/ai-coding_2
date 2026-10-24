import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// 注册持久化插件，使 user store 的登录状态在刷新后恢复
pinia.use(piniaPluginPersistedstate)

// 先挂载 Pinia，保证路由守卫中可以使用 store
app.use(pinia)
app.use(router)

// 模块级守卫：HMR 或重复调用时直接跳过，避免 Service Worker 重复注册（already registered）
let mockStarted = false

// 开发环境启动 MSW：接口 mock 是图书数据的唯一来源；生产构建不加载 mock，直接走真实请求
async function enableMocking(): Promise<void> {
  if (mockStarted) return
  mockStarted = true

  // Vite 下不存在 process.env.NODE_ENV，环境判断只能用 import.meta.env.DEV
  if (!import.meta.env.DEV) return

  try {
    // 动态导入：生产构建时该分支不可达，msw 不会进入产物
    const { worker } = await import('@/mock/browser')
    // MSW 3 把 2.x 的 onUnhandledRequest 改名为 onUnhandledFrame，'bypass' 直接放行未匹配请求
    await worker.start({ onUnhandledFrame: 'bypass' })
  } catch (error: unknown) {
    // worker 启动失败只告警，页面照常挂载，避免白屏
    console.warn('[mock] MSW 启动失败，接口将回落到真实网络请求', error)
  }
}

// 先等 worker 就绪再挂载，保证首个业务请求不会在拦截生效前发出
async function bootstrap(): Promise<void> {
  await enableMocking()
  app.mount('#app')
}

void bootstrap()
