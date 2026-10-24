import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// 模块顶层创建单例：Service Worker 全局唯一，不能在组件或函数里重复创建
export const worker = setupWorker(...handlers)
