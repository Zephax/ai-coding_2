<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { addBook, deleteBook, getBooks, getMe, triggerServerError, updateBook } from '@/api/books'
import BookFormDialog from '@/components/BookFormDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import MyPagination from '@/components/MyPagination.vue'
import { useLibraryStore } from '@/stores/library'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/utils/toast'
import type { Book } from '@/types/book'
import type { BookInput, PageStats } from '@/types/api'

interface BookRow extends Book {
  available: boolean
  statusText: string
}

// 每页条数会被分页组件回写，因此用响应式变量而不是常量
const pageSize = ref(10)
const SEARCH_DEBOUNCE = 350
// 骨架行数取默认页容量的近似值；列数与表头一致，保证骨架与真实表格同构
const SKELETON_ROWS = 8
const COLUMN_COUNT = 5

const library = useLibraryStore()
const userStore = useUserStore()

const keyword = ref('')
const books = ref<Book[]>([])
const total = ref(0)
const page = ref(1)
const stats = ref<PageStats>({ available: 0 })
// 首屏直接进入加载态，避免先闪一下空态
const loading = ref(true)
const errorMessage = ref('')

// 模板只读派生数据，不在模板里调用会重新计算的方法
const rows = computed<BookRow[]>(() =>
  books.value.map((book) => ({
    ...book,
    available: book.stock > 0,
    statusText: book.stock > 0 ? `可借 · ${book.stock} 本` : '已借出',
  })),
)

const searching = computed(() => keyword.value.trim().length > 0)
const isEmpty = computed(() => !loading.value && !errorMessage.value && books.value.length === 0)

// 请求序号：只有最新请求允许写入状态，丢弃过期响应，防止快速输入时串页
let requestSeq = 0
let debounceTimer: number | undefined

async function loadBooks(targetPage: number): Promise<void> {
  requestSeq += 1
  const seq = requestSeq

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getBooks({
      page: targetPage,
      pageSize: pageSize.value,
      keyword: keyword.value.trim(),
    })
    if (seq !== requestSeq) return

    books.value = result.list
    total.value = result.total
    page.value = result.page
    stats.value = result.stats
  } catch (error: unknown) {
    if (seq !== requestSeq) return

    // 失败时清空列表与统计，避免头部「共 N 本」与错误态自相矛盾
    books.value = []
    total.value = 0
    stats.value = { available: 0 }
    errorMessage.value =
      error instanceof Error && error.message ? error.message : '加载失败，请稍后重试'
  } finally {
    // 失败也要复位 loading，否则页面会一直转圈
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

function retry(): void {
  void loadBooks(page.value)
}

function handleSearchInput(): void {
  // 关键字变更：页码归 1，并立即作废在途的旧请求，避免旧响应抢先写入
  requestSeq += 1
  page.value = 1
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    void loadBooks(1)
  }, SEARCH_DEBOUNCE)
}

function clearSearch(): void {
  window.clearTimeout(debounceTimer)
  keyword.value = ''
  page.value = 1
  void loadBooks(1)
}

// 分页组件只抛变更，页码/条数已由 v-model 回写，这里按新值重新请求
function handlePageChange({ page: nextPage }: { page: number; pageSize: number }): void {
  // 先清掉待发的搜索防抖，否则 350ms 后会把页码拉回第 1 页
  window.clearTimeout(debounceTimer)
  void loadBooks(nextPage)
  // 切页后回到列表可视区顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 已知限制：借阅仍走 library store 的本地演示数据，图书簿（接口）与借阅记录是两套数据，本阶段不互通
function handleBorrow(bookId: number): void {
  library.borrow(bookId, userStore.username)
}

// ---------- 新增 / 编辑 ----------
const formOpen = ref(false)
const editingBook = ref<Book | null>(null)
const formSubmitting = ref(false)
const formError = ref('')

// ---------- 删除 ----------
const deleteOpen = ref(false)
const deleteTarget = ref<Book | null>(null)
const deleteSubmitting = ref(false)
const deleteError = ref('')

// ---------- 异常演示 ----------
const demoLoading = ref(false)

function openCreate(): void {
  editingBook.value = null
  formError.value = ''
  formOpen.value = true
}

function openEdit(book: Book): void {
  // 深拷贝副本：编辑时改的是副本，取消不会污染列表行数据
  editingBook.value = { ...book }
  formError.value = ''
  formOpen.value = true
}

function closeForm(): void {
  if (formSubmitting.value) return
  formOpen.value = false
  editingBook.value = null
  formError.value = ''
}

async function handleFormSubmit(input: BookInput): Promise<void> {
  if (formSubmitting.value) return

  formSubmitting.value = true
  formError.value = ''

  try {
    const editing = editingBook.value
    if (editing) {
      await updateBook(editing.id, input)
      showToast('图书已更新', 'success')
    } else {
      await addBook(input)
      showToast('图书已新增', 'success')
    }

    formOpen.value = false
    editingBook.value = null
    // 不本地拼装列表，统一按当前页重新拉取
    await loadBooks(page.value)
  } catch (error: unknown) {
    formError.value =
      error instanceof Error && error.message ? error.message : '保存失败，请稍后重试'
  } finally {
    formSubmitting.value = false
  }
}

function openDelete(book: Book): void {
  deleteTarget.value = book
  deleteError.value = ''
  deleteOpen.value = true
}

function closeDelete(): void {
  if (deleteSubmitting.value) return
  deleteOpen.value = false
  deleteTarget.value = null
  deleteError.value = ''
}

async function handleConfirmDelete(): Promise<void> {
  const target = deleteTarget.value
  if (!target || deleteSubmitting.value) return

  deleteSubmitting.value = true
  deleteError.value = ''

  try {
    await deleteBook(target.id)
    deleteOpen.value = false
    deleteTarget.value = null
    showToast('图书已删除', 'success')

    // 当前页删空且不在第一页时回退一页，避免停在空页；keyword 与页码沿用当前状态
    const nextPage = books.value.length === 1 && page.value > 1 ? page.value - 1 : page.value
    await loadBooks(nextPage)
  } catch (error: unknown) {
    deleteError.value =
      error instanceof Error && error.message ? error.message : '删除失败，请稍后重试'
  } finally {
    deleteSubmitting.value = false
  }
}

// 500 演示：拦截器统一 toast，这里吞掉异常避免未处理的 Promise rejection
async function handleDemoServerError(): Promise<void> {
  if (demoLoading.value) return
  demoLoading.value = true

  try {
    await triggerServerError()
  } catch {
    // 已由全局拦截器提示
  } finally {
    demoLoading.value = false
  }
}

// 401 演示：临时注入非法 token 让 /api/me 返回 401，演示掉线跳转
async function handleDemoUnauthorized(): Promise<void> {
  if (demoLoading.value) return
  demoLoading.value = true

  const store = useUserStore()
  const backupToken = store.token
  store.$patch({ token: 'invalid-demo-token' })

  try {
    await getMe()
  } catch {
    // 401 由拦截器统一清空登录态并跳转
  } finally {
    // 未触发掉线（token 仍在）时恢复原 token，避免误伤登录态
    if (store.token === 'invalid-demo-token') {
      store.$patch({ token: backupToken })
    }
    demoLoading.value = false
  }
}

onMounted(() => {
  void loadBooks(1)
})

onBeforeUnmount(() => {
  window.clearTimeout(debounceTimer)
  // 让在途响应失效，避免卸载后写状态
  requestSeq += 1
})
</script>

<template>
  <section class="card">
    <header class="card-header">
      <div class="heading">
        <h2 class="card-title">馆藏图书</h2>
        <!-- 统计来自接口全量数据，不用当前页数据计算 -->
        <p class="card-meta">共 {{ total }} 本 · 可借 {{ stats.available }} 本</p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="button button--ghost"
          :disabled="demoLoading"
          @click="handleDemoServerError"
        >
          模拟 500
        </button>
        <button
          type="button"
          class="button button--ghost"
          :disabled="demoLoading"
          @click="handleDemoUnauthorized"
        >
          模拟 401
        </button>
        <button type="button" class="button button--primary" @click="openCreate">新增图书</button>
      </div>
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
        @input="handleSearchInput"
      />
    </div>

    <div class="table-wrap">
      <table class="book-table" :aria-busy="loading">
        <caption class="sr-only">
          图书列表，包含书名、作者、分类、库存状态与借阅操作
        </caption>
        <thead>
          <tr>
            <th scope="col">书名</th>
            <th scope="col">作者</th>
            <th scope="col">分类</th>
            <th scope="col">库存状态</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 加载态：骨架行与真实行共用 --row-height，数据到达时不产生布局抖动 -->
          <template v-if="loading">
            <tr v-for="index in SKELETON_ROWS" :key="`skeleton-${index}`" class="skeleton-row">
              <td v-for="column in COLUMN_COUNT" :key="column">
                <span class="skeleton" />
              </td>
            </tr>
          </template>

          <!-- 错误态：展示接口返回的原因并允许重试 -->
          <tr v-else-if="errorMessage">
            <td colspan="5" class="state">
              <p class="state-title">加载失败</p>
              <p class="state-desc">{{ errorMessage }}</p>
              <button type="button" class="button button--primary" @click="retry">重试</button>
            </td>
          </tr>

          <!-- 空态：区分「暂无数据」与「搜索无结果」 -->
          <tr v-else-if="isEmpty">
            <td colspan="5" class="state">
              <template v-if="searching">
                <p class="state-title">未找到匹配的图书</p>
                <p class="state-desc">试试更换书名或作者关键词。</p>
                <button type="button" class="button button--ghost" @click="clearSearch">
                  清空搜索
                </button>
              </template>
              <template v-else>
                <p class="state-title">暂无图书数据</p>
                <p class="state-desc">馆藏还未录入，稍后再来看看。</p>
              </template>
            </td>
          </tr>

          <template v-else>
            <tr v-for="book in rows" :key="book.id">
              <th scope="row" class="book-title">{{ book.title }}</th>
              <td class="book-author">{{ book.author }}</td>
              <td class="book-category">{{ book.category }}</td>
              <td>
                <span
                  class="status"
                  :class="book.available ? 'status--available' : 'status--borrowed'"
                >
                  {{ book.statusText }}
                </span>
              </td>
              <td>
                <div class="row-actions" title="借阅为演示数据，与图书编辑互不影响">
                  <button
                    type="button"
                    class="action action--borrow"
                    :disabled="!book.available"
                    @click="handleBorrow(book.id)"
                  >
                    借阅
                  </button>
                  <button type="button" class="action" @click="openEdit(book)">
                    编辑
                  </button>
                  <button type="button" class="action action--delete" @click="openDelete(book)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 分页：只抛变更事件，页码边界与条数切换由组件内部处理 -->
    <MyPagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="total"
      :disabled="loading"
      @change="handlePageChange"
    />
  </section>

  <BookFormDialog
    :open="formOpen"
    :book="editingBook"
    :submitting="formSubmitting"
    :server-error="formError"
    @submit="handleFormSubmit"
    @cancel="closeForm"
  />

  <ConfirmDialog
    :open="deleteOpen"
    title="删除图书"
    :message="deleteTarget ? `确定删除《${deleteTarget.title}》吗？删除后不可恢复。` : ''"
    confirm-text="删除"
    :loading="deleteSubmitting"
    :error-message="deleteError"
    @confirm="handleConfirmDelete"
    @cancel="closeDelete"
  />
</template>

<style scoped>
/* 行高基准：骨架行与真实行共用同一变量，数据到达时不发生布局抖动 */
.card {
  --row-height: 56px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #1f2937;
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

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* 通用按钮：表头、分页、空态复用同一套外观，只按用途改配色 */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #6b7280;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #1f2937;
}

/* 次要按钮：白底灰字（默认即次要样式，保留修饰类便于后续扩展） */
.button--ghost {
  color: #6b7280;
}

.button--primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.button--primary:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #fff;
}

.button:disabled {
  background: #f8fafc;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* 操作列按钮：尺寸略小于通用按钮，贴合表格行高 */
.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.action:hover:not(:disabled) {
  background: #f9fafb;
}

.action--borrow {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.action--borrow:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #93c5fd;
}

.action--delete {
  border-color: #dc2626;
  color: #dc2626;
}

.action--delete:hover:not(:disabled) {
  background: #fee2e2;
}

/* 借阅不可用时置灰，视觉上明确不可点击 */
.action:disabled {
  border-color: #e5e7eb;
  background: #f8fafc;
  color: #9ca3af;
  cursor: not-allowed;
}

.button:focus-visible,
.action:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.2);
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

/* 移动端横向滚动，避免列被压缩导致文字重叠 */
.table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.book-table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  font-size: 14px;
}

/* 行高统一交给 --row-height，骨架行与真实行因此完全等高 */
.book-table th,
.book-table td {
  height: var(--row-height);
  padding: 0 20px;
  text-align: left;
  white-space: nowrap;
  vertical-align: middle;
  border-bottom: 1px solid #f1f5f9;
}

.book-table thead th {
  height: 42px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.book-table tbody th {
  font-weight: 600;
}

.book-table tbody tr:last-child th,
.book-table tbody tr:last-child td {
  border-bottom: none;
}

/* 骨架行不可点击，不参与 hover 高亮 */
.book-table tbody tr:not(.skeleton-row):hover {
  background: #f8fafc;
}

.book-title {
  color: #111827;
}

.book-author,
.book-category {
  color: #475569;
}

/* 库存状态标签：颜色由是否可借决定 */
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

/* 空态 / 错误态：整行单元格脱离固定行高，内容居中 */
.book-table td.state {
  height: auto;
  padding: 48px 20px;
  text-align: center;
  white-space: normal;
}

.state-title {
  color: #374151;
  font-size: 15px;
  font-weight: 600;
}

.state-desc {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13.5px;
}

.state .button {
  margin-top: 16px;
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

/* 骨架条：宽度按列区分，视觉上贴近真实内容分布 */
.skeleton {
  display: block;
  width: 90px;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

.skeleton-row td:nth-child(1) .skeleton {
  width: 150px;
}

.skeleton-row td:nth-child(3) .skeleton,
.skeleton-row td:nth-child(4) .skeleton {
  width: 60px;
}

.skeleton-row td:nth-child(5) .skeleton {
  width: 120px;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 50%;
  }
  to {
    background-position: 0 50%;
  }
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
    padding: 0 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>
