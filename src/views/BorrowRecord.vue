<script setup lang="ts">
interface BorrowRecord {
  id: number
  book: string
  borrower: string
  borrowDate: string
  dueDate: string
  returned: boolean
}

const records: BorrowRecord[] = [
  { id: 1, book: '三体', borrower: '陈晨', borrowDate: '2026-10-02', dueDate: '2026-11-02', returned: false },
  { id: 2, book: '人类简史', borrower: '林晓', borrowDate: '2026-10-08', dueDate: '2026-11-08', returned: false },
  { id: 3, book: '代码整洁之道', borrower: '赵敏', borrowDate: '2026-10-15', dueDate: '2026-11-15', returned: false },
  { id: 4, book: '设计中的设计', borrower: '孙悦', borrowDate: '2026-10-18', dueDate: '2026-11-18', returned: false },
  { id: 5, book: '百年孤独', borrower: '王磊', borrowDate: '2026-08-20', dueDate: '2026-09-20', returned: true },
  { id: 6, book: '活着', borrower: '周涛', borrowDate: '2026-07-11', dueDate: '2026-08-11', returned: true },
]
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h2 class="card-title">借阅记录</h2>
      <p class="card-meta">共 {{ records.length }} 条</p>
    </header>

    <div class="table-wrap">
      <table class="record-table">
        <caption class="sr-only">
          借阅记录列表，包含图书、借阅人、借阅日期、应还日期与状态
        </caption>
        <thead>
          <tr>
            <th scope="col">图书</th>
            <th scope="col">借阅人</th>
            <th scope="col">借阅日期</th>
            <th scope="col">应还日期</th>
            <th scope="col">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id">
            <th scope="row" class="book-name">{{ record.book }}</th>
            <td class="cell-text">{{ record.borrower }}</td>
            <td class="cell-date">{{ record.borrowDate }}</td>
            <td class="cell-date">{{ record.dueDate }}</td>
            <td>
              <span
                class="status"
                :class="record.returned ? 'status--returned' : 'status--borrowing'"
              >
                {{ record.returned ? '已归还' : '借阅中' }}
              </span>
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
  align-items: baseline;
  gap: 4px 12px;
  padding: 18px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.card-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.card-meta {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

/* 移动端可横向滚动，避免列被压缩导致文字重叠 */
.table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.record-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 14px;
}

.record-table th,
.record-table td {
  padding: 12px 20px;
  text-align: left;
  white-space: nowrap;
  vertical-align: middle;
  border-bottom: 1px solid #f1f5f9;
}

.record-table thead th {
  background: #f8fafc;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.record-table tbody th {
  font-weight: 600;
  text-align: left;
}

.record-table tbody tr:last-child th,
.record-table tbody tr:last-child td {
  border-bottom: none;
}

.record-table tbody tr:hover {
  background: #f8fafc;
}

.book-name {
  color: #111827;
}

.cell-text,
.cell-date {
  color: #475569;
}

.cell-date {
  font-variant-numeric: tabular-nums;
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

.status--borrowing {
  background: #eff6ff;
  color: #1d4ed8;
}

.status--returned {
  background: #ecfdf5;
  color: #047857;
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
  .card-header {
    padding: 16px;
  }

  .record-table th,
  .record-table td {
    padding: 12px 16px;
  }
}
</style>
