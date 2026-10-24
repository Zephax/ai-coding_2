import { reactive } from 'vue'

export type ToastType = 'error' | 'info' | 'success'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const TOAST_DURATION = 3000

// 全局唯一的提示队列：拦截器等非组件模块直接 push，App.vue 负责渲染
export const toasts = reactive<ToastItem[]>([])

let nextToastId = 1

export function showToast(message: string, type: ToastType = 'error'): void {
  if (!message) return

  const id = nextToastId
  nextToastId += 1
  toasts.push({ id, message, type })

  window.setTimeout(() => {
    removeToast(id)
  }, TOAST_DURATION)
}

export function removeToast(id: number): void {
  const index = toasts.findIndex((item) => item.id === id)
  if (index !== -1) {
    toasts.splice(index, 1)
  }
}
