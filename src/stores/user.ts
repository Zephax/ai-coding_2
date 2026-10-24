import { defineStore } from 'pinia'
import { login as loginApi } from '@/api/auth'
import type { UserInfo } from '@/types/api'

// 类型统一收敛到 src/types/api.ts，这里保留对外导出以兼容既有引用
export type { UserInfo }

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null as UserInfo | null,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    username: (state) => state.userInfo?.name ?? '',
  },

  actions: {
    // 调用真实登录接口；失败时把异常向上抛，由页面就地展示
    async login(username: string): Promise<void> {
      const result = await loginApi(username)
      this.token = result.token
      this.userInfo = result.userInfo
    },

    // 只清本地态，不发请求
    logout(): void {
      this.token = ''
      this.userInfo = null
    },
  },

  // 持久化到 localStorage（key 默认为 store id "user"）
  persist: true,
})
