// 为 JS 版 Pinia store 提供类型声明，供 TS 组件使用
export interface UserInfo {
  name: string
  role: string
}

export interface UserStore {
  token: string
  userInfo: UserInfo | null
  isLoggedIn: boolean
  username: string
  login(username: string): boolean
  logout(): void
}

export const useUserStore: () => UserStore
