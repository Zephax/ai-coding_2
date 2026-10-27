import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { login as loginApi } from '@/api/auth'

// 纯逻辑测试：mock 掉接口层，只验证 store 自身的状态流转、getter 与异常行为
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
}))

const mockedLogin = vi.mocked(loginApi)

describe('user store', () => {
  beforeEach(() => {
    // 每个用例独立 pinia 实例，避免状态串用例
    setActivePinia(createPinia())
    mockedLogin.mockReset()
  })

  describe('初始状态', () => {
    it('未登录时 token 为空、userInfo 为 null', () => {
      const store = useUserStore()

      expect(store.token).toBe('')
      expect(store.userInfo).toBeNull()
    })

    it('getter 基于空状态返回默认值', () => {
      const store = useUserStore()

      expect(store.isLoggedIn).toBe(false)
      expect(store.username).toBe('')
    })
  })

  describe('login', () => {
    it('成功后写入 token 与 userInfo，getter 同步更新', async () => {
      const store = useUserStore()
      mockedLogin.mockResolvedValue({
        token: 'token-123',
        userInfo: { name: '张三', role: 'admin' },
      })

      await store.login('张三')

      expect(mockedLogin).toHaveBeenCalledTimes(1)
      expect(mockedLogin).toHaveBeenCalledWith('张三')
      expect(store.token).toBe('token-123')
      expect(store.userInfo).toEqual({ name: '张三', role: 'admin' })
      expect(store.isLoggedIn).toBe(true)
      expect(store.username).toBe('张三')
    })

    it('失败时向上抛错且不写入任何状态', async () => {
      const store = useUserStore()
      mockedLogin.mockRejectedValue(new Error('账号不存在'))

      await expect(store.login('张三')).rejects.toThrow('账号不存在')

      expect(store.token).toBe('')
      expect(store.userInfo).toBeNull()
      expect(store.isLoggedIn).toBe(false)
    })

    it('已有登录态时重新登录失败，保留原有状态', async () => {
      const store = useUserStore()
      mockedLogin.mockResolvedValueOnce({
        token: 'old-token',
        userInfo: { name: '旧用户', role: 'user' },
      })
      await store.login('旧用户')

      mockedLogin.mockRejectedValueOnce(new Error('网络错误'))

      await expect(store.login('新用户')).rejects.toThrow('网络错误')
      expect(store.token).toBe('old-token')
      expect(store.userInfo).toEqual({ name: '旧用户', role: 'user' })
    })
  })

  describe('logout', () => {
    it('登录后调用会清空 token 与 userInfo', async () => {
      const store = useUserStore()
      mockedLogin.mockResolvedValue({
        token: 'token-123',
        userInfo: { name: '张三', role: 'admin' },
      })
      await store.login('张三')

      store.logout()

      expect(store.token).toBe('')
      expect(store.userInfo).toBeNull()
      expect(store.isLoggedIn).toBe(false)
      expect(store.username).toBe('')
    })

    it('未登录时调用仍是空状态', () => {
      const store = useUserStore()

      store.logout()

      expect(store.token).toBe('')
      expect(store.userInfo).toBeNull()
    })
  })
})
