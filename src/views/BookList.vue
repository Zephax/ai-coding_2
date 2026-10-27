<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

interface Book {
  id: number
  title: string
  author: string
  category: string
  stock: number
}

const books: Book[] = [
  { id: 1, title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', stock: 3 },
  { id: 2, title: '深入理解计算机系统', author: 'Randal E. Bryant', category: '计算机', stock: 0 },
  { id: 3, title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', stock: 2 },
  { id: 4, title: '设计中的设计', author: '原研哉', category: '艺术', stock: 1 },
  { id: 5, title: '活着', author: '余华', category: '文学', stock: 4 },
  { id: 6, title: '经济学原理', author: 'N. 格里高利·曼昆', category: '经济', stock: 0 },
  { id: 7, title: '三体', author: '刘慈欣', category: '科幻', stock: 2 },
  { id: 8, title: '代码整洁之道', author: 'Robert C. Martin', category: '计算机', stock: 1 },
]

const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')

// 按书名或作者实时过滤
const filteredBooks = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return books
  return books.filter(
    (book) =>
      book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query),
  )
})

function isAvailable(book: Book) {
  return book.stock > 0
}

function handleLogout() {
  userStore.logout()
  router.replace('/login')
}
</script>

<template>
  <section class="card">
    <header class="card-header">
      <div class="heading">
        <h2 class="card-title">馆藏图书</h2>
        <p class="card-meta">共 {{ filteredBooks.length }} 本</p>
      </div>

      <button type="button" class="logout-button" @click="handleLogout">退出登录</button>
    </header>

    <div class="toolbar">
      <label class="sr-only" for="book-search">搜索书名或作者</label>
      <input
        id="book-search"
        v-model="keyword"
        class="search-input"
        type="search"
        placeholder="搜索书名或作者"
        autocomplete="off"
      />
    </div>

    <div class="table-wrap">
      <table class="book-table">
        <caption class="sr-only">
          图书列表，包含书名、作者、分类与库存状态
        </caption>
        <thead>
          <tr>
            <th scope="col">书名</th>
            <th scope="col">作者</th>
            <th scope="col">分类</th>
            <th scope="col">库存状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="book in filteredBooks" :key="book.id">
            <th scope="row" class="book-title">{{ book.title }}</th>
            <td class="book-author">{{ book.author }}</td>
            <td class="book-category">{{ book.category }}</td>
            <td>
              <span
                class="status"
                :class="isAvailable(book) ? 'status--available' : 'status--borrowed'"
              >
                {{ isAvailable(book) ? `可借 · ${book.stock} 本` : '已借出' }}
              </span>
            </td>
          </tr>

          <!-- 空结果状态 -->
          <tr v-if="filteredBooks.length === 0">
            <td colspan="4" class="empty">
              <p class="empty-title">未找到匹配的图书</p>
              <p class="empty-desc">试试更换书名或作者关键词。</p>
              <button type="button" class="clear-button" @click="keyword = ''">清空搜索</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 18px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.heading {
  min-width: 0;
}

.card-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.card-meta {
  margin-top: 2px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.logout-button {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff;
  color: #b91c1c;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.logout-button:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.logout-button:focus-visible {
  outline: 3px solid rgba(220, 38, 38, 0.2);
  outline-offset: 2px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.search-input {
  width: 100%;
  max-width: 320px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

/* 移动端可横向滚动，避免列被压缩导致文字重叠 */
.table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.book-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 14px;
}

.book-table th,
.book-table td {
  padding: 12px 20px;
  text-align: left;
  white-space: nowrap;
  vertical-align: middle;
  border-bottom: 1px solid #f1f5f9;
}

.book-table thead th {
  background: #f8fafc;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.book-table tbody th {
  font-weight: 600;
  text-align: left;
}

.book-table tbody tr:last-child th,
.book-table tbody tr:last-child td {
  border-bottom: none;
}

.book-table tbody tr:hover {
  background: #f8fafc;
}

.book-title {
  color: #111827;
}

.book-author,
.book-category {
  color: #475569;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
}

.status::before {
  content: '';
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status--available {
  background: #ecfdf5;
  color: #047857;
}

.status--borrowed {
  background: #fff7ed;
  color: #b45309;
}

.empty {
  padding: 48px 20px;
  text-align: center;
  white-space: normal;
}

.empty-title {
  color: #374151;
  font-size: 15px;
  font-weight: 600;
}

.empty-desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13.5px;
}

.clear-button {
  min-height: 34px;
  margin-top: 16px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.clear-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.clear-button:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.2);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 768px) {
  .card-header,
  .toolbar {
    padding: 16px;
  }

  .search-input {
    max-width: none;
  }

  .book-table th,
  .book-table td {
    padding: 12px 16px;
  }
}
</style>
