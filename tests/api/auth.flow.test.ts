import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { http, HttpResponse } from 'msw'

import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { server } from '../setup'

const { replaceSpy, showToastSpy } = vi.hoisted(() => ({
  replaceSpy: vi.fn(),
  showToastSpy: vi.fn(),
}))

// 隔离路由与全局提示：401 时拦截器会跳转登录页并弹提示，这里只验证副作用被触发
vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { path: '/books', fullPath: '/books' } },
    replace: replaceSpy,
  },
}))

vi.mock('@/utils/toast', () => ({
  showToast: showToastSpy,
  removeToast: vi.fn(),
  toasts: [],
}))

interface ProtectedResult {
  ok: boolean
  user: string
}

describe('登录 → 访问受保护接口 → token 失效', () => {
  beforeEach(() => {
    window.localStorage.clear()
    replaceSpy.mockClear()
    showToastSpy.mockClear()

    // 必须启用 persist 插件，登录 token 才会写入 localStorage。
    // Pinia 4 中插件在 pinia 尚未安装到 app 时会进入待安装队列，这里用空 app 触发安装。
    const pinia = createPinia()
    pinia.use(piniaPluginPersistedstate)
    createApp({}).use(pinia)
    setActivePinia(pinia)
  })

  it('完整流程：保存 token → 带 Authorization 访问成功 → 删除 token 后返回 401', async () => {
    const userStore = useUserStore()

    // 1. 登录：走 MSW 的 POST /api/login，把 token 写入 store
    await userStore.login('张三')
    expect(userStore.isLoggedIn).toBe(true)

    const token = userStore.token
    expect(token).not.toBe('')

    // 2. persist 插件把 token 写入 localStorage（key 为 store id "user"）。
    // $subscribe 默认 pre flush，持久化发生在下一个微任务，断言前等一次 nextTick。
    await nextTick()
    const persisted = JSON.parse(window.localStorage.getItem('user') ?? '{}') as {
      token?: string
    }
    expect(persisted.token).toBe(token)

    // 3. 受保护接口：只有 Authorization 与登录 token 一致才放行
    const seenAuthorization: (string | null)[] = []
    server.use(
      http.get('*/api/protected', ({ request: req }) => {
        const authorization = req.headers.get('Authorization')
        seenAuthorization.push(authorization)

        if (authorization !== `Bearer ${token}`) {
          return HttpResponse.json(
            { code: 401, message: '登录状态已失效，请重新登录', data: null },
            { status: 401 },
          )
        }

        return HttpResponse.json({
          code: 200,
          message: '请求成功',
          data: { ok: true, user: '张三' } satisfies ProtectedResult,
        })
      }),
    )

    // 请求拦截器从 store 读取 token 并拼成 Bearer 头
    const result = await request<ProtectedResult>({ url: '/protected', method: 'get' })
    expect(result).toEqual({ ok: true, user: '张三' })
    expect(seenAuthorization).toEqual([`Bearer ${token}`])

    // 4. 删除 token：logout 同时清空 store 与持久化的 localStorage
    userStore.logout()
    expect(userStore.token).toBe('')
    await nextTick()

    const cleared = JSON.parse(window.localStorage.getItem('user') ?? '{}') as {
      token?: string
      userInfo?: unknown
    }
    expect(cleared.token).toBe('')
    expect(cleared.userInfo).toBeNull()

    // 5. 无 token 再访问：MSW 返回 401，拦截器转成 ApiError(401) 并触发登出提示与跳转
    await expect(
      request({ url: '/protected', method: 'get' }),
    ).rejects.toMatchObject({
      code: 401,
      message: '登录状态已失效，请重新登录',
    })

    expect(seenAuthorization).toEqual([`Bearer ${token}`, null])
    expect(showToastSpy).toHaveBeenCalledWith('登录状态已失效，请重新登录')
    expect(replaceSpy).toHaveBeenCalledWith('/login?redirect=%2Fbooks')
  })
})
