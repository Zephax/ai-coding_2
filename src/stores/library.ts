/**
 * 借阅记录与借还操作的本地演示 store。
 * 图书簿已迁到 src/mock/data.ts（MSW 接口作为唯一来源），此处只复用其类型与种子副本；
 * 已知限制：两套数据本阶段不做互通，借还操作只改 store 内的书籍副本，不会写回 mock 数据源。
 */
import { defineStore } from 'pinia'
import { createBooks } from '@/mock/data'

export type { Book } from '@/types/book'

export interface BorrowRecord {
  id: number
  bookId: number
  borrower: string
  borrowDate: string
  dueDate: string
  returned: boolean
}

/** 借阅期限（天） */
const LOAN_DAYS = 30

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 每次借书生成一条记录，起始 id 接在演示数据之后
const INITIAL_RECORD_ID = 9

// 演示数据：stock 与「未归还」记录数严格对应，保证库存和借阅记录对得上
const seedRecords: BorrowRecord[] = [
  { id: 1, bookId: 7, borrower: '陈晨', borrowDate: '2026-10-02', dueDate: '2026-11-01', returned: false },
  // 应还日期已过今天：用于演示「已逾期」状态
  { id: 2, bookId: 3, borrower: '林晓', borrowDate: '2026-09-20', dueDate: '2026-10-20', returned: false },
  // 三条同日到期：演示日历里「3 本到期」的聚合效果
  { id: 3, bookId: 8, borrower: '赵敏', borrowDate: '2026-10-15', dueDate: '2026-11-05', returned: false },
  { id: 4, bookId: 4, borrower: '孙悦', borrowDate: '2026-10-18', dueDate: '2026-11-05', returned: false },
  { id: 5, bookId: 2, borrower: '吴迪', borrowDate: '2026-10-06', dueDate: '2026-11-05', returned: false },
  { id: 6, bookId: 6, borrower: '郑楠', borrowDate: '2026-10-20', dueDate: '2026-11-19', returned: false },
  { id: 7, bookId: 1, borrower: '王磊', borrowDate: '2026-08-20', dueDate: '2026-09-19', returned: true },
  { id: 8, bookId: 5, borrower: '周涛', borrowDate: '2026-07-11', dueDate: '2026-08-10', returned: true },
]

export const useLibraryStore = defineStore('library', {
  state: () => ({
    books: createBooks(),
    records: seedRecords.map((record) => ({ ...record })),
    nextRecordId: INITIAL_RECORD_ID,
  }),

  getters: {
    // 借阅记录带上书名，表格可直接渲染
    recordRows(state) {
      return state.records.map((record) => ({
        ...record,
        bookTitle: state.books.find((book) => book.id === record.bookId)?.title ?? '未知图书',
      }))
    },

    borrowingCount(state) {
      return state.records.filter((record) => !record.returned).length
    },
  },

  actions: {
    // 借书：库存 -1 并生成一条借阅记录，库存不足时返回 false
    borrow(bookId: number, borrower: string): boolean {
      const book = this.books.find((item) => item.id === bookId)
      if (!book || book.stock <= 0) return false

      book.stock -= 1
      this.records.unshift({
        id: this.nextRecordId,
        bookId,
        borrower,
        borrowDate: formatDate(new Date()),
        dueDate: formatDate(new Date(Date.now() + LOAN_DAYS * 24 * 60 * 60 * 1000)),
        returned: false,
      })
      this.nextRecordId += 1
      return true
    },

    // 还书：记录置为已归还并回补库存，重复归还时返回 false
    returnBook(recordId: number): boolean {
      const record = this.records.find((item) => item.id === recordId)
      if (!record || record.returned) return false

      record.returned = true
      const book = this.books.find((item) => item.id === record.bookId)
      if (book && book.stock < book.total) book.stock += 1
      return true
    },
  },
})
