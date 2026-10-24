<script setup lang="ts">
import { RouterView } from 'vue-router'
import { removeToast, toasts } from '@/utils/toast'
</script>

<template>
  <RouterView />

  <!-- 全局兜底提示：拦截器等非组件模块通过 showToast 入队 -->
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        role="alert"
      >
        <span class="toast-message">{{ toast.message }}</span>
        <button
          type="button"
          class="toast-close"
          aria-label="关闭提示"
          @click="removeToast(toast.id)"
        >
          ×
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-left: 3px solid #dc2626;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  pointer-events: auto;
  animation: toast-in 0.18s ease-out;
}

.toast--error {
  border-left-color: #dc2626;
}

.toast--success {
  border-left-color: #047857;
}

.toast--info {
  border-left-color: #2563eb;
}

.toast-message {
  flex: 1;
  min-width: 0;
  color: #1f2937;
  font-size: 13.5px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.toast-close {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.toast-close:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.toast-close:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.35);
  outline-offset: 1px;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}
</style>
