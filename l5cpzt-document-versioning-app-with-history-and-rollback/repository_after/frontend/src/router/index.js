import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import DocumentListView from '../views/DocumentListView.vue'
import DocumentEditorView from '../views/DocumentEditorView.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Documents',
    component: DocumentListView,
    meta: { requiresAuth: true }
  },
  {
    path: '/documents/:id',
    name: 'DocumentEditor',
    component: DocumentEditorView,
    meta: { requiresAuth: true }
  },
  {
    path: '/documents/new',
    name: 'NewDocument',
    component: DocumentEditorView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth()
  
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && isAuthenticated.value) {
    next({ name: 'Documents' })
  } else {
    next()
  }
})

export default router
