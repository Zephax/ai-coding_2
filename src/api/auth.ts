// 认证接口：只做参数组装与类型声明，不 try/catch、不提示、不跳转
import request from '@/utils/request'
import type { LoginResult } from '@/types/api'

export function login(username: string): Promise<LoginResult> {
  return request<LoginResult>({
    url: '/login',
    method: 'post',
    data: { username },
  })
}
