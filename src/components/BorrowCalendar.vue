<script setup lang="ts">
/**
 * 借阅日历：el-calendar 按应还日期聚合「当天到期且未归还」的记录；
 * 已逾期日 cell 浅红底，悬浮 el-tooltip 列出书名与借阅人。纯展示组件，不写 store。
 */
import { computed } from 'vue'

interface CalendarRecord {
  id: number
  bookTitle: string
  borrower: string
  /** yyyy-MM-dd */
  dueDate: string
  returned: boolean
}

interface DueInfo {
  count: number
  items: CalendarRecord[]
  /** 已逾期红 / 今天到期橙 / 未来到期蓝 */
  type: 'danger' | 'warning' | 'primary'
}

const props = defineProps<{ records: CalendarRecord[] }>()

// 本地日期 yyyy-MM-dd，与 el-calendar 的 data.day 格式一致；加载时计算一次
function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const today = formatLocalDate(new Date())

// 聚合：Map<yyyy-MM-dd, 当天到期且未归还的记录>
const dueByDate = computed(() => {
  const map = new Map<string, CalendarRecord[]>()
  for (const record of props.records) {
    if (record.returned) continue
    const list = map.get(record.dueDate)
    if (list) {
      list.push(record)
    } else {
      map.set(record.dueDate, [record])
    }
  }
  return map
})

function dueInfo(day: string): DueInfo | null {
  const items = dueByDate.value.get(day)
  if (!items) return null

  return {
    count: items.length,
    items,
    type: day < today ? 'danger' : day === today ? 'warning' : 'primary',
  }
}
</script>

<template>
  <div class="calendar-wrap">
    <el-calendar>
      <template #date-cell="{ data }">
        <div
          class="day-cell"
          :class="{ 'day-cell--overdue': dueInfo(data.day)?.type === 'danger' }"
        >
          <span class="day-number">{{ Number(data.day.slice(8)) }}</span>
          <template v-if="dueInfo(data.day)">
            <el-tooltip placement="top">
              <template #content>
                <p v-for="item in dueInfo(data.day)?.items" :key="item.id" class="tooltip-line">
                  《{{ item.bookTitle }}》· {{ item.borrower }}
                </p>
              </template>
              <el-tag size="small" :type="dueInfo(data.day)?.type">
                {{ dueInfo(data.day)?.count }} 本到期
              </el-tag>
            </el-tooltip>
          </template>
        </div>
      </template>
    </el-calendar>
  </div>
</template>

<style scoped>
.calendar-wrap {
  padding: 12px 16px 16px;
}

/* 收紧日历 cell 内边距，给日期与标签留空间 */
.calendar-wrap :deep(.el-calendar-day) {
  padding: 6px;
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  height: 100%;
  border-radius: 6px;
}

/* 已逾期日：浅红底，逾期分布一眼可见 */
.day-cell--overdue {
  background: #fef2f2;
}

.day-number {
  color: #374151;
  font-size: 13px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.tooltip-line {
  margin: 0;
  line-height: 1.6;
}
</style>
