// 图书领域模型：全项目唯一的 Book 定义，其它模块只能引用或重新导出，禁止再复制一份
export interface Book {
  id: number
  title: string
  author: string
  category: string
  /** 当前可借数量 */
  stock: number
  /** 馆藏总量 */
  total: number
}
