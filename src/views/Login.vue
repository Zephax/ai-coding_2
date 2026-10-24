<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const errorMessage = ref('')
const submitting = ref(false)

const canSubmit = computed(() => username.value.trim().length > 0)

// 仅接受站内绝对路径（以 / 开头且不以 // 开头），防止开放重定向
function resolveRedirect(): string {
  const raw = route.query.redirect
  const target = Array.isArray(raw) ? raw[0] : raw

  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/books'
}

async function handleLogin(): Promise<void> {
  if (submitting.value) return

  const name = username.value.trim()
  errorMessage.value = ''

  if (!name) {
    errorMessage.value = '请输入用户名'
    return
  }

  submitting.value = true
  try {
    await userStore.login(name)
    await router.replace(resolveRedirect())
  } catch (error: unknown) {
    // 失败就地展示服务端返回的 message
    errorMessage.value =
      error instanceof Error && error.message ? error.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

// 输入法组词时的回车用于确认候选词，不触发登录
function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  void handleLogin()
}
</script>

<template>
  <div class="login-page">
    <section class="brand-panel">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">书</span>
        <span class="brand-name">图书管理系统</span>
      </div>

      <div class="brand-copy">
        <h1>让馆藏管理更简单</h1>
        <p>集中管理图书信息与借阅记录，快速掌握馆藏流转情况。</p>
      </div>

      <ul class="brand-points">
        <li>图书信息一目了然</li>
        <li>借阅记录随时追溯</li>
        <li>操作轻量，专注核心事务</li>
      </ul>
    </section>

    <main class="form-panel">
      <form class="login-card" novalidate @submit.prevent="handleLogin">
        <h2 class="title">图书系统登录</h2>
        <p class="subtitle">请输入用户名，登录后即可查看图书与借阅记录。</p>

        <div class="field">
          <label class="label" for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            class="input"
            :class="{ 'input--invalid': errorMessage }"
            type="text"
            placeholder="请输入用户名"
            autocomplete="username"
            :aria-invalid="Boolean(errorMessage)"
            :aria-describedby="errorMessage ? 'login-error' : undefined"
            @input="errorMessage = ''"
            @keydown.enter="handleEnter"
          />
          <p v-if="errorMessage" id="login-error" class="error" role="alert">{{ errorMessage }}</p>
        </div>

        <button type="submit" class="login-button" :disabled="!canSubmit || submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>
        <p class="hint">演示环境：输入任意用户名即可登录。</p>
      </form>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: #f4f6f9;
}

/* 桌面端：左侧品牌区 + 右侧登录表单 */
.brand-panel {
  display: flex;
  flex: 1 1 52%;
  flex-direction: column;
  justify-content: space-between;
  gap: 32px;
  min-width: 0;
  padding: 48px;
  background: linear-gradient(150deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
  color: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #fff;
  color: #1d4ed8;
  font-size: 17px;
  font-weight: 700;
}

.brand-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-copy h1 {
  margin-bottom: 14px;
  font-size: clamp(28px, 3.4vw, 44px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.brand-copy p {
  max-width: 420px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
  line-height: 1.7;
}

.brand-points {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.brand-points li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-points li::before {
  content: '';
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #93c5fd;
}

.form-panel {
  display: grid;
  flex: 1 1 48%;
  place-items: center;
  min-width: 0;
  padding: 48px 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
}

.title {
  color: #111827;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
}

.subtitle {
  margin-top: 10px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.7;
}

.field {
  margin-top: 24px;
}

.label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-size: 13.5px;
  font-weight: 500;
}

.input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  color: #111827;
  font-size: 15px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input::placeholder {
  color: #9ca3af;
}

.input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.input--invalid {
  border-color: #dc2626;
}

.input--invalid:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.error {
  margin-top: 8px;
  color: #dc2626;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 46px;
  margin-top: 22px;
  border: 0;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.05s ease;
}

.login-button:not(:disabled):hover {
  background: #1d4ed8;
}

.login-button:not(:disabled):active {
  transform: translateY(1px);
}

.login-button:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.35);
  outline-offset: 2px;
}

.login-button:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.hint {
  margin-top: 14px;
  color: #9ca3af;
  font-size: 12.5px;
  line-height: 1.6;
  text-align: center;
}

/* 移动端：改为上下堆叠，表单占满宽度 */
@media (max-width: 900px) {
  .login-page {
    flex-direction: column;
  }

  .brand-panel {
    flex: none;
    justify-content: flex-start;
    gap: 20px;
    padding: 28px 20px;
  }

  .brand-copy h1 {
    margin-bottom: 8px;
    font-size: 24px;
  }

  .brand-copy p {
    font-size: 14px;
  }

  /* 卖点列表在小屏上省略，避免挤压登录区 */
  .brand-points {
    display: none;
  }

  .form-panel {
    padding: 24px 16px 40px;
  }

  .login-card {
    padding: 28px 22px;
    border-radius: 14px;
  }

  .title {
    font-size: 22px;
  }
}
</style>
