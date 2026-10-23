import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const APP_TITLE = '图书管理系统'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/components/Layout.vue'),
    redirect: '/books',
    children: [
      {
        path: 'books',
        name: 'BookList',
        component: () => import('@/views/BookList.vue'),
        meta: { title: '图书列表', requiresAuth: true },
      },
      {
        path: 'borrows',
        name: 'BorrowRecord',
        component: () => import('@/views/BorrowRecord.vue'),
        meta: { title: '借阅记录', requiresAuth: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !userStore.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.path === '/login' && userStore.isLoggedIn) {
    return { path: '/books' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE
})

export default router
