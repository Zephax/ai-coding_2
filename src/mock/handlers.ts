import { delay, http, HttpResponse } from 'msw'
import { createBooks, createIdGenerator, seedBooks } from './data'
import type { Book } from './data'

/**
 * MSW 请求处理器：只依赖 msw 与纯数据模块，不 import axios / pinia / window / router，
 * 因此浏览器（browser.ts）与 Node 测试（msw/node）可以复用同一份 handlers。
 * 路径统一带通配符前缀（形如 星号 + /api/books）：浏览器同源请求能匹配，
 * Node 环境没有 location.origin，写相对路径会匹配不到。
 */

interface UserInfo {
  name: string
  role: string
}

interface BookListResult {
  list: Book[]
  total: number
  page: number
  pageSize: number
  stats: { available: number }
}

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

// 模块级可变数据源：所有请求读写同一份内存数组，进程内状态保持一致
const books: Book[] = createBooks()
const nextBookId = createIdGenerator(seedBooks)

// 登录签发的 token 白名单，供 /api/me 校验；value 为签发时的用户信息
const tokenWhitelist = new Map<string, UserInfo>()
const nextUserId = createIdGenerator([])

// 统一延迟 200~400ms：远小于 axios timeout(8000ms)，同时让 loading 态可见
function mockDelay() {
  return delay(200 + Math.floor(Math.random() * 200))
}

// 成功响应：code 固定 200，data 为业务数据
function ok<T>(data: T, message = '请求成功') {
  return HttpResponse.json({ code: 200, message, data })
}

// 失败响应：HTTP 状态码与业务 code 保持一致，data 固定 null
function fail(status: number, code: number, message: string) {
  return HttpResponse.json({ code, message, data: null }, { status })
}

// 解析 JSON 请求体：非法 JSON / 非对象 / 数组一律返回 null，由调用方返回结构化错误而不是抛异常
async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json()
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function hasField(source: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key)
}

// 读取字符串字段并去空格；缺失或类型不对时返回空串
function readTrimmedString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === 'string' ? value.trim() : ''
}

// 读取整数数字段；非数字、小数、NaN 一律返回 null
function readInteger(source: Record<string, unknown>, key: string): number | null {
  const value = source[key]
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

// page：缺失、空串、非数字、小于 1 一律回落 1
function parsePage(raw: string | null): number {
  if (raw === null || raw.trim() === '') return 1
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.trunc(value)
}

// pageSize：缺失默认 10，其余夹在 1~50 之间
function parsePageSize(raw: string | null): number {
  if (raw === null || raw.trim() === '') return DEFAULT_PAGE_SIZE
  const value = Number(raw)
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE
  return Math.min(Math.max(Math.trunc(value), 1), MAX_PAGE_SIZE)
}

// 将 :id 路径参数收窄为正整数，非法值返回 null
function readBookId(raw: string | readonly string[] | undefined): number | null {
  const text = typeof raw === 'string' ? raw : ''
  const value = Number(text)
  return Number.isInteger(value) && value > 0 ? value : null
}

// 兼容 "Bearer <token>" 与裸 token 两种 Authorization 写法
function readToken(request: Request): string {
  const header = request.headers.get('Authorization')
  if (!header) return ''
  const value = header.trim()
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : value
}

export const handlers = [
  // POST /api/login — 参数 { username }；空用户名返回 400，成功返回 { token, userInfo } 并把 token 记入白名单
  http.post('*/api/login', async ({ request }) => {
    await mockDelay()

    const body = await readJsonBody(request)
    if (!body) return fail(400, 400, '请求体必须是合法的 JSON 对象')

    const username = readTrimmedString(body, 'username')
    if (!username) return fail(400, 400, '用户名不能为空')

    const userId = nextUserId()
    const token = `mock-token-${userId}-${Math.random().toString(36).slice(2, 8)}`
    const userInfo: UserInfo = { name: username, role: '图书管理员' }
    tokenWhitelist.set(token, userInfo)

    return ok({ token, userInfo }, '登录成功')
  }),

  // GET /api/books?page&pageSize&keyword — 返回 { list, total, page, pageSize, stats.available }；page 越界返回空 list
  http.get('*/api/books', async ({ request }) => {
    await mockDelay()

    const url = new URL(request.url)
    const page = parsePage(url.searchParams.get('page'))
    const pageSize = parsePageSize(url.searchParams.get('pageSize'))
    const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase()

    const matched = keyword
      ? books.filter(
          (book) =>
            book.title.toLowerCase().includes(keyword) ||
            book.author.toLowerCase().includes(keyword),
        )
      : books

    // stats.available 统计的是筛选后的全量可借数量，而不是当前页数量
    const result: BookListResult = {
      list: matched.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
      total: matched.length,
      page,
      pageSize,
      stats: { available: matched.filter((book) => book.stock > 0).length },
    }

    return ok(result)
  }),

  // POST /api/books — 参数 { title, author, category?, total }；字段非法或同名同作者重复返回 400，成功返回新对象（stock 初值 = total）
  http.post('*/api/books', async ({ request }) => {
    await mockDelay()

    const body = await readJsonBody(request)
    if (!body) return fail(400, 400, '请求体必须是合法的 JSON 对象')

    const title = readTrimmedString(body, 'title')
    if (!title) return fail(400, 400, '书名不能为空')

    const author = readTrimmedString(body, 'author')
    if (!author) return fail(400, 400, '作者不能为空')

    const total = readInteger(body, 'total')
    if (total === null || total < 0) return fail(400, 400, '馆藏总量必须是不小于 0 的整数')

    const duplicated = books.some((book) => book.title === title && book.author === author)
    if (duplicated) return fail(400, 400, '同名同作者的图书已存在')

    const category = readTrimmedString(body, 'category') || '未分类'
    // 新建时 stock 与 total 相等，天然满足 stock <= total 不变量
    const book: Book = { id: nextBookId(), title, author, category, stock: total, total }
    books.unshift(book)

    return ok(book, '新增成功')
  }),

  // PUT /api/books/:id — 参数可含 title/author/category/total/stock；id 不存在返回 404，stock > total 返回 400，成功返回更新后对象
  http.put('*/api/books/:id', async ({ params, request }) => {
    await mockDelay()

    const id = readBookId(params['id'])
    const book = id === null ? undefined : books.find((item) => item.id === id)
    if (!book) return fail(404, 404, '图书不存在')

    const body = await readJsonBody(request)
    if (!body) return fail(400, 400, '请求体必须是合法的 JSON 对象')

    const nextTitle = hasField(body, 'title') ? readTrimmedString(body, 'title') : book.title
    if (!nextTitle) return fail(400, 400, '书名不能为空')

    const nextAuthor = hasField(body, 'author') ? readTrimmedString(body, 'author') : book.author
    if (!nextAuthor) return fail(400, 400, '作者不能为空')

    const nextCategory = hasField(body, 'category')
      ? readTrimmedString(body, 'category') || book.category
      : book.category

    const nextTotal = hasField(body, 'total') ? readInteger(body, 'total') : book.total
    if (nextTotal === null || nextTotal < 0) return fail(400, 400, '馆藏总量必须是不小于 0 的整数')

    const nextStock = hasField(body, 'stock') ? readInteger(body, 'stock') : book.stock
    if (nextStock === null || nextStock < 0) return fail(400, 400, '可借数量必须是不小于 0 的整数')

    if (nextStock > nextTotal) return fail(400, 400, '馆藏总量不能小于当前可借数量')

    book.title = nextTitle
    book.author = nextAuthor
    book.category = nextCategory
    book.stock = nextStock
    book.total = nextTotal

    return ok(book, '更新成功')
  }),

  // DELETE /api/books/:id — id 不存在返回 404，成功返回 { id }
  http.delete('*/api/books/:id', async ({ params }) => {
    await mockDelay()

    const id = readBookId(params['id'])
    const book = id === null ? undefined : books.find((item) => item.id === id)
    if (!book) return fail(404, 404, '图书不存在')

    const index = books.indexOf(book)
    if (index !== -1) books.splice(index, 1)

    return ok({ id: book.id }, '删除成功')
  }),

  // GET /api/me — 读取 Authorization 头；缺失或不在白名单返回 401，否则返回当前用户信息
  http.get('*/api/me', async ({ request }) => {
    await mockDelay()

    const token = readToken(request)
    const userInfo = token ? tokenWhitelist.get(token) : undefined
    if (!userInfo) return fail(401, 401, '登录状态已失效，请重新登录')

    return ok(userInfo)
  }),

  // GET /api/demo/error-500 — 固定返回 HTTP 500 + code 500，用于验证全局错误提示
  http.get('*/api/demo/error-500', async () => {
    await mockDelay()

    return fail(500, 500, '服务器开小差了，请稍后重试')
  }),
]
