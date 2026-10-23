<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

interface NavItem {
  to: string
  label: string
}

const navItems: NavItem[] = [
  { to: '/books', label: '图书列表' },
  { to: '/borrows', label: '借阅记录' },
]

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 顶部标题取自路由 meta.title
const pageTitle = computed(() => (route.meta.title as string | undefined) ?? '图书管理')

const displayName = computed(() => userStore.username || '未登录')
const userInitial = computed(() => userStore.username.trim().charAt(0) || '?')

// 兼容子路径，例如 /books/123 时“图书列表”仍为选中态
function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function handleLogout() {
  userStore.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">书</span>
        <span class="brand-text">图书管理</span>
      </div>

      <!-- 当前登录用户 -->
      <div class="user-card">
        <span class="user-avatar" aria-hidden="true">{{ userInitial }}</span>
        <div class="user-meta">
          <p class="user-name" :title="displayName">{{ displayName }}</p>
          <p v-if="userStore.userInfo" class="user-role">{{ userStore.userInfo.role }}</p>
        </div>
      </div>

      <nav class="nav" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': isActive(item.to) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <button type="button" class="logout-button" aria-label="退出登录" @click="handleLogout">
        退出登录
      </button>
    </aside>

    <div class="content">
      <header class="topbar">
        <h1 class="page-title" :title="pageTitle">{{ pageTitle }}</h1>
      </header>

      <main class="main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f4f6f9;
  color: #1f2937;
}

/* 桌面端：固定左侧边栏 */
.sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: 220px;
  padding: 20px 12px;
  background: #1f2937;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.brand-text {
  min-width: 0;
  color: #f9fafb;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-top: 16px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.user-avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.user-meta {
  flex: 1 1 auto;
  min-width: 0;
}

.user-name {
  color: #f9fafb;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  margin-top: 1px;
  color: #94a3b8;
  font-size: 12.5px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
}

.nav-link {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.4;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.nav-link.is-active {
  background: #2563eb;
  color: #fff;
}

.nav-link:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.logout-button {
  flex: 0 0 auto;
  min-height: 38px;
  margin-top: auto;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: #fca5a5;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.logout-button:hover {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
}

.logout-button:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-left: 220px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.page-title {
  margin: 0;
  min-width: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

/* 移动端：侧边栏切换为顶部横向导航 */
@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    position: sticky;
    top: 0;
    bottom: auto;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    width: 100%;
    height: 60px;
    padding: 0 16px;
    overflow-x: hidden;
    overflow-y: hidden;
  }

  .brand {
    order: 0;
    gap: 0;
    padding: 0;
    border-bottom: none;
  }

  /* 小屏只保留品牌图标，为用户名和导航让出空间 */
  .brand-text {
    display: none;
  }

  .nav {
    order: 1;
    flex: 1 1 auto;
    flex-direction: row;
    gap: 4px;
    min-width: 0;
    margin-top: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .nav::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    flex: 0 0 auto;
    padding: 8px 12px;
  }

  .user-card {
    order: 2;
    flex: 0 1 auto;
    min-width: 0;
    margin-top: 0;
    padding: 0;
    background: transparent;
    border-radius: 0;
  }

  .user-avatar {
    display: none;
  }

  .user-name {
    max-width: 72px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 移动端空间有限，只显示用户名 */
  .user-role {
    display: none;
  }

  .logout-button {
    order: 3;
    min-height: 32px;
    margin-top: 0;
    padding: 0 10px;
    font-size: 13px;
  }

  .content {
    margin-left: 0;
  }

  .topbar {
    position: static;
    height: 52px;
    padding: 0 16px;
  }

  .main {
    padding: 16px;
  }
}
</style>
