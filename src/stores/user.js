import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    username: (state) => state.userInfo?.name ?? '',
  },

  actions: {
    // 模拟登录：校验用户名并生成临时凭证
    login(username) {
      const name = String(username ?? '').trim()
      if (!name) return false

      this.token = `mock-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      this.userInfo = { name, role: '图书管理员' }
      return true
    },

    logout() {
      this.token = ''
      this.userInfo = null
    },
  },

  // 持久化到 localStorage（key 默认为 store id "user"）
  persist: true,
})
