/**
 * 图书簿 mock 数据源（唯一来源）。
 *
 * 页面 store、MSW handlers 都从这里取种子数据，禁止在其他模块再存一份图书数据，
 * 否则字段与数值会悄悄漂移。本文件不依赖 msw / vue / pinia，可被 Node 测试直接复用。
 */
import type { Book } from '@/types/book'

// 类型定义统一在 src/types/book.ts，这里只做重新导出，保持既有引用路径不变
export type { Book }

// 24 条种子图书：前 8 条由原 src/stores/library.ts 原样迁移，其余用于演示分页；
// 全部满足 stock <= total，默认 10 条/页时共 3 页。
export const seedBooks: readonly Book[] = [
  { id: 1, title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', stock: 3, total: 3 },
  { id: 2, title: '深入理解计算机系统', author: 'Randal E. Bryant', category: '计算机', stock: 0, total: 1 },
  { id: 3, title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', stock: 2, total: 3 },
  { id: 4, title: '设计中的设计', author: '原研哉', category: '艺术', stock: 1, total: 2 },
  { id: 5, title: '活着', author: '余华', category: '文学', stock: 4, total: 4 },
  { id: 6, title: '经济学原理', author: 'N. 格里高利·曼昆', category: '经济', stock: 0, total: 1 },
  { id: 7, title: '三体', author: '刘慈欣', category: '科幻', stock: 2, total: 3 },
  { id: 8, title: '代码整洁之道', author: 'Robert C. Martin', category: '计算机', stock: 1, total: 2 },
  { id: 9, title: '围城', author: '钱钟书', category: '文学', stock: 2, total: 3 },
  { id: 10, title: '平凡的世界', author: '路遥', category: '文学', stock: 3, total: 4 },
  { id: 11, title: '白夜行', author: '东野圭吾', category: '推理', stock: 2, total: 2 },
  { id: 12, title: '解忧杂货店', author: '东野圭吾', category: '推理', stock: 1, total: 2 },
  { id: 13, title: '万历十五年', author: '黄仁宇', category: '历史', stock: 1, total: 2 },
  { id: 14, title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: '历史', stock: 0, total: 1 },
  { id: 15, title: '算法导论', author: 'Thomas H. Cormen', category: '计算机', stock: 2, total: 3 },
  { id: 16, title: '重构（第2版）', author: 'Martin Fowler', category: '计算机', stock: 1, total: 2 },
  { id: 17, title: 'JavaScript 高级程序设计', author: 'Matt Frisbie', category: '计算机', stock: 2, total: 2 },
  { id: 18, title: '人月神话', author: 'Frederick P. Brooks Jr.', category: '计算机', stock: 0, total: 1 },
  { id: 19, title: '国富论', author: '亚当·斯密', category: '经济', stock: 1, total: 1 },
  { id: 20, title: '沉默的大多数', author: '王小波', category: '文学', stock: 2, total: 2 },
  { id: 21, title: '时间简史', author: '史蒂芬·霍金', category: '科普', stock: 3, total: 3 },
  { id: 22, title: '自私的基因', author: '理查德·道金斯', category: '科普', stock: 1, total: 2 },
  { id: 23, title: '美的历程', author: '李泽厚', category: '艺术', stock: 1, total: 1 },
  { id: 24, title: '认识电影', author: '路易斯·贾内梯', category: '艺术', stock: 0, total: 1 },
]

// 每次调用返回一份可变副本，mock 数据源与 store 各自持有独立数组，互不污染
export function createBooks(): Book[] {
  return seedBooks.map((book) => ({ ...book }))
}

// 自增 id 生成器：从既有数据的最大 id 开始递增，不使用时间戳或随机数，避免 id 碰撞
export function createIdGenerator(existing: readonly { id: number }[]): () => number {
  let current = existing.reduce((maxId, item) => (item.id > maxId ? item.id : maxId), 0)

  return () => {
    current += 1
    return current
  }
}
