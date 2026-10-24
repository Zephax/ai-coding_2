<script setup lang="ts">
/**
 * 借阅管理页：el-tabs 切换「借阅记录表格 / 借阅日历」两种视图；
 * 记录与库存都来自 library store 的本地演示数据，归还操作由 store 同步。
 */
import { computed, ref } from 'vue'
import BorrowCalendar from '@/components/BorrowCalendar.vue'
import { useLibraryStore } from '@/stores/library'

const library = useLibraryStore()

interface RecordRow {
  id: number
  bookTitle: string
  borrower: string
  borrowDate: string
  dueDate: string
  returned: boolean
  /** 未归还且已过应还日期 */
  overdue: boolean
}

// 本地日期 yyyy-MM-dd，与记录中的日期格式一致，可直接做字典序比较
function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const rows = computed<RecordRow[]>(() => {
  const today = todayString()
  return library.recordRows.map((record) => ({
    ...record,
    overdue: !record.returned && record.dueDate < today,
  }))
})

const overdueCount = computed(() => rows.value.filter((row) => row.overdue).length)

// 当前视图：记录表格 / 到期日历
const activeTab = ref<'records' | 'calendar'>('records')

// 归还后记录状态与图书库存由 store 同步更新
function handleReturn(recordId: number): void {
  library.returnBook(recordId)
}
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h2 class="card-title">借阅管理</h2>
      <p class="card-meta">
        <span>共 {{ rows.length }} 条 · 借阅中 {{ library.borrowingCount }} 条</span>
        <el-tag v-if="overdueCount > 0" type="danger" size="small">
          {{ overdueCount }} 条已逾期
        </el-tag>
      </p>
    </header>

    <el-tabs v-model="activeTab" class="body-tabs">
      <el-tab-pane label="借阅记录" name="records">
        <el-table :data="rows">
          <el-table-column prop="bookTitle" label="图书" min-width="180" show-overflow-tooltip />
          <el-table-column prop="borrower" label="借阅人" width="120" />
          <el-table-column prop="borrowDate" label="借阅日期" width="130" />
          <el-table-column prop="dueDate" label="应还日期" width="130" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }: { row: RecordRow }">
              <!-- 三态：借阅中 / 已逾期（未归还且超过应还日期）/ 已归还 -->
              <el-tag :type="row.returned ? 'success' : row.overdue ? 'danger' : 'primary'">
                {{ row.returned ? '已归还' : row.overdue ? '已逾期' : '借阅中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }: { row: RecordRow }">
              <el-button v-if="!row.returned" size="small" @click="handleReturn(row.id)">
                归还
              </el-button>
              <span v-else class="cell-empty">—</span>
            </template>
          </el-table-column>
          <!-- 空数据走表格内置 empty 插槽 -->
          <template #empty>
            <el-empty description="暂无借阅记录" :image-size="80" />
          </template>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="借阅日历" name="calendar">
        <BorrowCalendar :records="rows" />
      </el-tab-pane>
    </el-tabs>
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
  align-items: baseline;
  gap: 4px 12px;
  padding: 18px 20px 0;
  border-bottom: none;
}

.card-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.card-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

/* tab 栏与卡片内容左右对齐，底部无边距让表格贴住 tab 下划线 */
.body-tabs :deep(.el-tabs__header) {
  padding: 0 20px;
  margin-bottom: 0;
}

/* 已归还行的操作列占位符 */
.cell-empty {
  color: #9ca3af;
}

@media (max-width: 768px) {
  .card-header,
  .body-tabs :deep(.el-tabs__header) {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
