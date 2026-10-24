<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Book } from '@/types/book'
import type { BookInput } from '@/types/api'

interface FieldErrors {
  title: string
  author: string
  total: string
}

// type="number" 的 v-model 会把值转成 number，空值又回 ''，因此这里两种类型都接受
interface FormState {
  title: string
  author: string
  category: string
  total: number | string
}

const props = defineProps<{
  open: boolean
  book: Book | null
  submitting: boolean
  serverError: string
}>()

const emit = defineEmits<{
  submit: [data: BookInput]
  cancel: []
}>()

const titleInput = ref<HTMLInputElement | null>(null)
const form = ref<FormState>({ title: '', author: '', category: '', total: '' })
const errors = ref<FieldErrors>({ title: '', author: '', total: '' })

// 已借出数量 = 总量 - 可借；编辑时总量不能低于它，保持 stock <= total
const borrowedCount = computed(() => {
  const book = props.book
  return book ? Math.max(book.total - book.stock, 0) : 0
})

// 关闭期间锁定 body 滚动，打开后把焦点交给首个输入框
let previousOverflow = ''
let lastActiveElement: HTMLElement | null = null

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  event.preventDefault()
  handleCancel()
}

function handleCancel(): void {
  // 提交中不允许关闭，避免请求回来时弹窗状态错乱
  if (props.submitting) return
  emit('cancel')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      // 先记下触发按钮，关闭后把焦点还回去
      if (document.activeElement instanceof HTMLElement) {
        lastActiveElement = document.activeElement
      }

      const source = props.book
      form.value = {
        title: source?.title ?? '',
        author: source?.author ?? '',
        category: source?.category ?? '',
        total: source ? source.total : '',
      }
      errors.value = { title: '', author: '', total: '' }

      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeydown)

      await nextTick()
      titleInput.value?.focus()
      return
    }

    document.body.style.overflow = previousOverflow
    window.removeEventListener('keydown', handleKeydown)
    lastActiveElement?.focus()
    lastActiveElement = null
  },
  { immediate: true, flush: 'pre' },
)

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', handleKeydown)
})

function validate(): BookInput | null {
  const title = form.value.title.trim()
  const author = form.value.author.trim()
  const category = form.value.category.trim()
  const totalRaw = String(form.value.total).trim()

  const nextErrors: FieldErrors = { title: '', author: '', total: '' }
  if (!title) nextErrors.title = '请输入书名'
  if (!author) nextErrors.author = '请输入作者'

  const total = Number(totalRaw)
  const minTotal = borrowedCount.value
  if (!totalRaw) {
    nextErrors.total = '请输入馆藏总量'
  } else if (!Number.isInteger(total) || total < 0) {
    nextErrors.total = '馆藏总量必须是不小于 0 的整数'
  } else if (total < minTotal) {
    nextErrors.total = `馆藏总量不能小于已借出数量（${minTotal} 本）`
  }

  errors.value = nextErrors
  if (nextErrors.title || nextErrors.author || nextErrors.total) return null

  // 分类留空时显式回填「未分类」，避免空串被后端当成「不修改」
  return { title, author, category: category || '未分类', total }
}

function handleSubmit(): void {
  if (props.submitting) return

  const payload = validate()
  if (!payload) return

  emit('submit', payload)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog-overlay" @click.self="handleCancel">
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="book-form-title">
          <h2 id="book-form-title" class="dialog-title">
            {{ book ? '编辑图书' : '新增图书' }}
          </h2>

          <form class="dialog-form" novalidate @submit.prevent="handleSubmit">
            <div class="field">
              <label class="field-label" for="book-form-name">书名</label>
              <input
                id="book-form-name"
                ref="titleInput"
                v-model="form.title"
                class="field-input"
                :class="{ 'field-input--invalid': errors.title }"
                type="text"
                autocomplete="off"
                :aria-invalid="Boolean(errors.title)"
                :aria-describedby="errors.title ? 'book-form-name-error' : undefined"
              />
              <p v-if="errors.title" id="book-form-name-error" class="field-error">
                {{ errors.title }}
              </p>
            </div>

            <div class="field">
              <label class="field-label" for="book-form-author">作者</label>
              <input
                id="book-form-author"
                v-model="form.author"
                class="field-input"
                :class="{ 'field-input--invalid': errors.author }"
                type="text"
                autocomplete="off"
                :aria-invalid="Boolean(errors.author)"
                :aria-describedby="errors.author ? 'book-form-author-error' : undefined"
              />
              <p v-if="errors.author" id="book-form-author-error" class="field-error">
                {{ errors.author }}
              </p>
            </div>

            <div class="field">
              <label class="field-label" for="book-form-category">分类</label>
              <input
                id="book-form-category"
                v-model="form.category"
                class="field-input"
                type="text"
                autocomplete="off"
                placeholder="选填，默认未分类"
              />
            </div>

            <div class="field">
              <label class="field-label" for="book-form-total">馆藏总量</label>
              <input
                id="book-form-total"
                v-model="form.total"
                class="field-input"
                :class="{ 'field-input--invalid': errors.total }"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                autocomplete="off"
                :aria-invalid="Boolean(errors.total)"
                :aria-describedby="
                  errors.total
                    ? 'book-form-total-error'
                    : borrowedCount > 0
                      ? 'book-form-total-hint'
                      : undefined
                "
              />
              <p v-if="errors.total" id="book-form-total-error" class="field-error">
                {{ errors.total }}
              </p>
              <p v-else-if="borrowedCount > 0" id="book-form-total-hint" class="field-hint">
                当前已借出 {{ borrowedCount }} 本，总量不能小于该值
              </p>
            </div>

            <p v-if="serverError" class="form-error" role="alert">{{ serverError }}</p>

            <footer class="dialog-actions">
              <button
                type="button"
                class="dialog-button"
                :disabled="submitting"
                @click="handleCancel"
              >
                取消
              </button>
              <button
                type="submit"
                class="dialog-button dialog-button--primary"
                :disabled="submitting"
              >
                {{ submitting ? '保存中…' : '保存' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
  overflow-y: auto;
}

.dialog {
  width: 480px;
  max-width: 100%;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
}

.dialog-title {
  margin: 0 0 18px;
  color: #1f2937;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: #374151;
  font-size: 13.5px;
  font-weight: 500;
}

.field-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field-input::placeholder {
  color: #9ca3af;
}

.field-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.field-input--invalid {
  border-color: #dc2626;
}

.field-input--invalid:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.field-error {
  color: #dc2626;
  font-size: 12.5px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.field-hint {
  color: #6b7280;
  font-size: 12.5px;
  line-height: 1.5;
}

.form-error {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.dialog-button {
  min-height: 38px;
  padding: 0 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

/* 取消按钮走默认白底样式，仅「保存」需要强调色 */
.dialog-button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.dialog-button--primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.dialog-button--primary:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.dialog-button:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.2);
  outline-offset: 2px;
}

.dialog-button:disabled {
  background: #e5e7eb;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@media (max-width: 768px) {
  .dialog-overlay {
    padding: 16px;
  }

  .dialog {
    width: calc(100vw - 32px);
    padding: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dialog-enter-active,
  .dialog-leave-active,
  .dialog-enter-active .dialog,
  .dialog-leave-active .dialog {
    transition: none;
  }
}
</style>
