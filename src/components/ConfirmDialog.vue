<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmText: string
  loading: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const cancelButton = ref<HTMLButtonElement | null>(null)
let previousOverflow = ''
let lastActiveElement: HTMLElement | null = null

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  event.preventDefault()
  handleCancel()
}

function handleCancel(): void {
  // 删除进行中不允许关闭，避免请求回来时状态错乱
  if (props.loading) return
  emit('cancel')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (document.activeElement instanceof HTMLElement) {
        lastActiveElement = document.activeElement
      }
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeydown)
      // 确认弹窗默认聚焦“取消”，避免误触删除
      window.requestAnimationFrame(() => {
        cancelButton.value?.focus()
      })
      return
    }

    document.body.style.overflow = previousOverflow
    window.removeEventListener('keydown', handleKeydown)
    lastActiveElement?.focus()
    lastActiveElement = null
  },
)

// 卸载（如删除时 401 跳转登录页）时兜底清理，避免 body 滚动被永久锁定
onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog-overlay" @click.self="handleCancel">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
        >
          <h2 id="confirm-dialog-title" class="dialog-title">{{ title }}</h2>
          <p id="confirm-dialog-message" class="dialog-message">{{ message }}</p>

          <p v-if="errorMessage" class="dialog-error" role="alert">{{ errorMessage }}</p>

          <footer class="dialog-actions">
            <button
              ref="cancelButton"
              type="button"
              class="dialog-button dialog-button--ghost"
              :disabled="loading"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              type="button"
              class="dialog-button dialog-button--danger"
              :disabled="loading"
              @click="emit('confirm')"
            >
              {{ loading ? '删除中…' : confirmText }}
            </button>
          </footer>
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
  margin: 0 0 10px;
  color: #1f2937;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
}

.dialog-message {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.dialog-error {
  margin: 14px 0 0;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.dialog-button {
  min-height: 38px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.dialog-button--ghost {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #1f2937;
}

.dialog-button--ghost:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.dialog-button--danger {
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #fff;
}

.dialog-button--danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
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
