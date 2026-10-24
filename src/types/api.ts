// 接口层通用类型：统一响应包、分页结果、登录结果、图书入参与用户信息

/** 后端统一响应包：request 拦截器负责解包 data */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

/** 分页统计：available 是筛选后全量可借数量，不是当前页数量 */
export interface PageStats {
  available: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  stats: PageStats
}

export interface UserInfo {
  name: string
  role: string
}

export interface LoginResult {
  token: string
  userInfo: UserInfo
}

/** 新增 / 更新图书的入参；新增时后端会把 stock 置为 total */
export interface BookInput {
  title: string
  author: string
  category?: string
  total: number
  stock?: number
}
