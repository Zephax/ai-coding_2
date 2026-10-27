import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router/index.js'

const app = createApp(App)
const pinia = createPinia()

// 注册持久化插件，使 user store 的登录状态在刷新后恢复
pinia.use(piniaPluginPersistedstate)

// 先挂载 Pinia，保证路由守卫中可以使用 store
app.use(pinia)
app.use(router)

app.mount('#app')
