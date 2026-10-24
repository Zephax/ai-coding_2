// 图书接口：只做参数组装与类型声明，错误统一交给 request 拦截器与页面处理
import request from '@/utils/request'
import type { Book } from '@/types/book'
import type { BookInput, PageResult, UserInfo } from '@/types/api'

export interface GetBooksParams {
  page: number
  pageSize: number
  keyword?: string
}

export function getBooks(params: GetBooksParams): Promise<PageResult<Book>> {
  const query: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
  }

  // keyword 为空串时不拼进 query，避免出现 ?keyword= 造成语义差异
  const keyword = params.keyword?.trim()
  if (keyword) {
    query['keyword'] = keyword
  }

  return request<PageResult<Book>>({
    url: '/books',
    method: 'get',
    params: query,
  })
}

export function addBook(data: BookInput): Promise<Book> {
  return request<Book>({
    url: '/books',
    method: 'post',
    data,
  })
}

export function updateBook(id: number, data: BookInput): Promise<Book> {
  return request<Book>({
    url: `/books/${id}`,
    method: 'put',
    data,
  })
}

export function deleteBook(id: number): Promise<{ id: number }> {
  return request<{ id: number }>({
    url: `/books/${id}`,
    method: 'delete',
  })
}

// 当前登录用户（用于 401 演示：token 失效时拦截器会跳转登录页）
export function getMe(): Promise<UserInfo> {
  return request<UserInfo>({
    url: '/me',
    method: 'get',
  })
}

// 500 演示：拦截器统一提示「服务器错误，请稍后重试」并 reject
export function triggerServerError(): Promise<never> {
  return request<never>({
    url: '/demo/error-500',
    method: 'get',
  })
}
