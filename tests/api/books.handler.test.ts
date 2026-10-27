import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { addBook, deleteBook, getBooks, updateBook } from '@/api/books'
import { seedBooks } from '@/mock/data'

// 种子数据：24 条，前 10 条为第一页；stock 为 0 的 5 条不可借
const SEED_TOTAL = seedBooks.length
const UNAVAILABLE = seedBooks.filter((book) => book.stock === 0).length

describe('图书接口（MSW handlers）', () => {
  beforeEach(() => {
    // request 拦截器内部会 useUserStore()，每个用例都需要新的 pinia 实例
    setActivePinia(createPinia())
  })

  describe('GET /api/books', () => {
    it('默认分页返回第一页，stats.available 统计筛选后的全量可借数', async () => {
      const result = await getBooks({ page: 1, pageSize: 10 })

      expect(result.list).toHaveLength(10)
      expect(result.total).toBe(SEED_TOTAL)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
      expect(result.stats.available).toBe(SEED_TOTAL - UNAVAILABLE)
      expect(result.list[0]).toMatchObject({ id: 1, title: '百年孤独' })
    })

    it('翻到第二页返回接下来的 10 条', async () => {
      const result = await getBooks({ page: 2, pageSize: 10 })

      expect(result.list).toHaveLength(10)
      expect(result.list[0]).toMatchObject({ id: 11, title: '白夜行' })
    })

    it('页码越界时返回空列表，但保留总数', async () => {
      const result = await getBooks({ page: 9, pageSize: 10 })

      expect(result.list).toEqual([])
      expect(result.total).toBe(SEED_TOTAL)
      expect(result.page).toBe(9)
    })

    it('keyword 同时匹配书名与作者，统计只计算命中项', async () => {
      const result = await getBooks({ page: 1, pageSize: 10, keyword: '东野圭吾' })

      expect(result.total).toBe(2)
      expect(result.list.map((book) => book.title)).toEqual(['白夜行', '解忧杂货店'])
      expect(result.stats.available).toBe(2)
    })

    it('keyword 无匹配时返回空列表与 0 可借', async () => {
      const result = await getBooks({ page: 1, pageSize: 10, keyword: '不存在的书名' })

      expect(result.total).toBe(0)
      expect(result.list).toEqual([])
      expect(result.stats.available).toBe(0)
    })

    it('pageSize 越界时收敛到 1~50', async () => {
      const tooLarge = await getBooks({ page: 1, pageSize: 100 })
      expect(tooLarge.pageSize).toBe(50)
      expect(tooLarge.list).toHaveLength(SEED_TOTAL)

      const tooSmall = await getBooks({ page: 1, pageSize: 0 })
      expect(tooSmall.pageSize).toBe(1)
      expect(tooSmall.list).toHaveLength(1)
    })
  })

  describe('POST /api/books', () => {
    it('新增成功，stock 初始值等于 total', async () => {
      const book = await addBook({
        title: '测试图书',
        author: '测试作者',
        category: '测试',
        total: 3,
      })

      expect(book).toMatchObject({
        title: '测试图书',
        author: '测试作者',
        category: '测试',
        total: 3,
        stock: 3,
      })
      expect(book.id).toBeGreaterThan(SEED_TOTAL)
    })

    it('同名同作者重复新增返回 400', async () => {
      const input = { title: '重复图书', author: '重复作者', total: 1 }

      await addBook(input)

      await expect(addBook(input)).rejects.toMatchObject({
        code: 400,
        message: '同名同作者的图书已存在',
      })
    })

    it('非法入参返回 400', async () => {
      await expect(
        addBook({ title: '   ', author: '作者', total: 1 }),
      ).rejects.toMatchObject({ code: 400, message: '书名不能为空' })

      await expect(
        addBook({ title: '书名', author: '  ', total: 1 }),
      ).rejects.toMatchObject({ code: 400, message: '作者不能为空' })

      await expect(
        addBook({ title: '书名', author: '作者', total: -1 }),
      ).rejects.toMatchObject({ code: 400, message: '馆藏总量必须是不小于 0 的整数' })
    })
  })

  describe('PUT /api/books/:id', () => {
    it('更新成功；未传 stock 时保留原值', async () => {
      const created = await addBook({ title: '待更新图书', author: '更新作者', total: 3 })

      const updated = await updateBook(created.id, {
        title: '更新后的图书',
        author: '更新作者',
        total: 5,
      })

      expect(updated).toMatchObject({
        id: created.id,
        title: '更新后的图书',
        total: 5,
        stock: 3,
      })
    })

    it('stock 大于 total 返回 400', async () => {
      const created = await addBook({ title: '库存校验图书', author: '校验作者', total: 2 })

      await expect(
        updateBook(created.id, {
          title: '库存校验图书',
          author: '校验作者',
          total: 2,
          stock: 3,
        }),
      ).rejects.toMatchObject({ code: 400, message: '馆藏总量不能小于当前可借数量' })
    })

    it('图书不存在返回 404', async () => {
      await expect(
        updateBook(99999, { title: '不存在的书', author: '无', total: 1 }),
      ).rejects.toMatchObject({ code: 404, message: '图书不存在' })
    })
  })

  describe('DELETE /api/books/:id', () => {
    it('删除成功，重复删除返回 404', async () => {
      const created = await addBook({ title: '待删除图书', author: '删除作者', total: 1 })

      await expect(deleteBook(created.id)).resolves.toEqual({ id: created.id })
      await expect(deleteBook(created.id)).rejects.toMatchObject({
        code: 404,
        message: '图书不存在',
      })
    })
  })
})
