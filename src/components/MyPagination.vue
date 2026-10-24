<script setup lang="ts">
/**
 * 纯展示分页条：只处理页码边界与「每页条数变化后页码归 1」，
 * 不发请求，由父组件监听 change 决定何时重新拉数据。
 */
import { computed, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    total: number
    page: number
    pageSize: number
    pageSizes?: number[]
    disabled?: boolean
  }>(),
  {
    pageSizes: () => [10, 20, 50],
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  change: [payload: { page: number; pageSize: number }]
}>()

// total 为 0 时按 1 页算，避免出现「第 1 / 0 页」
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

// 展示与判边都用收敛后的页码：数据变少导致越界时不会渲染出非法页码
const currentPage = computed(() => Math.min(Math.max(props.page, 1), totalPages.value))

// 越界时回写 v-model，让父组件状态与展示保持一致
watch(currentPage, (page) => {
  if (page !== props.page) emit('update:page', page)
})

// 当前每页条数不在预设列表里时补进去，避免下拉框显示空白
const sizeOptions = computed(() =>
  props.pageSizes.includes(props.pageSize)
    ? props.pageSizes
    : [...props.pageSizes, props.pageSize].sort((a, b) => a - b),
)

function goTo(target: number): void {
  if (props.disabled) return

  const next = Math.min(Math.max(target, 1), totalPages.value)
  if (next === currentPage.value) return

  emit('update:page', next)
  emit('change', { page: next, pageSize: props.pageSize })
}

function handlePageSizeChange(event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value)
  if (!Number.isFinite(value) || value <= 0 || value === props.pageSize) return

  // 条数变化后页码归 1，避免停在不存在的页码上
  emit('update:pageSize', value)
  emit('update:page', 1)
  emit('change', { page: 1, pageSize: value })
}
</script>

<template>
  <footer class="pagination">
    <label class="page-size">
      <span class="sr-only">每页条数</span>
      <select
        class="page-select"
        :value="pageSize"
        :disabled="disabled"
        @change="handlePageSizeChange"
      >
        <option v-for="size in sizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
      </select>
    </label>

    <button
      type="button"
      class="page-button"
      :disabled="disabled || currentPage <= 1"
      @click="goTo(currentPage - 1)"
    >
      上一页
    </button>
    <span class="page-indicator">第 {{ currentPage }} / {{ totalPages }} 页</span>
    <button
      type="button"
      class="page-button"
      :disabled="disabled || currentPage >= totalPages"
      @click="goTo(currentPage + 1)"
    >
      下一页
    </button>
  </footer>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
}

/* 下拉与翻页按钮共用同一套外观，保持与页面其它次要按钮一致 */
.page-select,
.page-button {
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #6b7280;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.page-select {
  padding: 0 8px;
}

.page-button {
  padding: 0 14px;
}

.page-select:hover:not(:disabled),
.page-button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #1f2937;
}

.page-select:focus-visible,
.page-button:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.2);
  outline-offset: 2px;
}

.page-select:disabled,
.page-button:disabled {
  background: #f8fafc;
  color: #9ca3af;
  cursor: not-allowed;
}

.page-indicator {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
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
  .pagination {
    justify-content: space-between;
    padding: 14px 16px;
  }
}
</style>
