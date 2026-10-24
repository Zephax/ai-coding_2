import axios from 'axios'
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/utils/toast'
import type { ApiResponse } from '@/types/api'

/** 业务层使用的结构化错误，页面可就地展示 message / code */
export class ApiError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

// 并发多个 401 只跳转、只提示一次；1s 后复位，真实再次掉线仍可重新跳转
let unauthorizedHandled = false

function handleUnauthorized(message: string): void {
  // 掉线即视为登录态失效，先清空本地 token
  const userStore = useUserStore()
  userStore.logout()

  if (unauthorizedHandled) return
  unauthorizedHandled = true

  showToast(message || '登录状态已失效，请重新登录')

  const current = router.currentRoute.value
  // 已经在登录页时不再跳转，避免重复导航
  if (current.path !== '/login') {
    void router.replace(`/login?redirect=${encodeURIComponent(current.fullPath)}`)
  }

  window.setTimeout(() => {
    unauthorizedHandled = false
  }, 1000)
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate['code'] === 'number'
}

const instance = axios.create({
  baseURL: '/api',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // 必须在拦截器内调用 useUserStore：模块顶层执行时 Pinia 还没挂载
  const userStore = useUserStore()
  // 空 token 不拼接裸 "Bearer "
  if (userStore.token) {
    config.headers.set('Authorization', `Bearer ${userStore.token}`)
  }
  return config
})

instance.interceptors.response.use(
  (response) => {
    // 拦截器内部做泛型断言解包，业务层拿到的直接就是 data
    const payload: unknown = response.data
    if (!isApiResponse(payload)) {
      return payload as AxiosResponse
    }

    const { code, message, data } = payload

    if (code === 200) {
      return data as AxiosResponse
    }

    if (code === 401) {
      const url = response.config.url ?? ''
      // 登录接口豁免：用户名/密码错误属于业务失败，不能当成掉线
      if (!url.includes('/login')) {
        handleUnauthorized(message)
      }
      return Promise.reject(new ApiError(401, message || '登录状态已失效，请重新登录'))
    }

    if (code === 500) {
      showToast('服务器错误，请稍后重试')
      return Promise.reject(new ApiError(500, '服务器错误，请稍后重试'))
    }

    // 其它业务码交给页面就地展示，避免和全局提示重复
    return Promise.reject(new ApiError(code, message || '请求失败'))
  },
  (error: AxiosError) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    // 超时
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      const message = '请求超时，请稍后重试'
      showToast(message)
      return Promise.reject(new ApiError(-1, message))
    }

    // 没有响应：网络中断 / DNS 失败
    if (!error.response) {
      const message = '网络异常，请检查网络连接'
      showToast(message)
      return Promise.reject(new ApiError(-1, message))
    }

    const { status, data: body } = error.response
    const businessMessage = isApiResponse(body) && body.message ? body.message : ''
    const url = error.config?.url ?? ''

    if (status === 401) {
      if (!url.includes('/login')) {
        handleUnauthorized(businessMessage)
      }
      return Promise.reject(new ApiError(401, businessMessage || '登录状态已失效，请重新登录'))
    }

    if (status >= 500) {
      const message = '服务器错误，请稍后重试'
      showToast(message)
      return Promise.reject(new ApiError(status, message))
    }

    // 其余 4xx：优先用后端中文提示；取不到统一响应包时带上状态码，
    // 避免接口没走到后端（如 404 路由不存在）被误读成「参数有误」
    return Promise.reject(
      new ApiError(status, businessMessage || `请求失败（HTTP ${status}），请稍后重试`),
    )
  },
)

// 对外只暴露 Promise<T>：拦截器已解包，调用方无需再写 response.data.data
export default instance as unknown as <T = unknown>(config: AxiosRequestConfig) => Promise<T>
