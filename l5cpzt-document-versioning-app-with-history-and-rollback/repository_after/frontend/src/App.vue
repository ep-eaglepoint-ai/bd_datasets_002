<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="navbar">
      <div class="nav-brand">
        <router-link to="/">📄 DocVersion</router-link>
      </div>
      <div class="nav-links">
        <span class="nav-user">{{ user?.username }}</span>
        <button @click="logout" class="btn btn-outline btn-sm">Logout</button>
      </div>
    </nav>
    
    <Toast ref="toastRef" />
    
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { computed, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './stores/auth'
import Toast from './components/Toast.vue'

const router = useRouter()
const { user, isAuthenticated, logout: authLogout } = useAuth()

const toastRef = ref(null)

// Provide toast globally
provide('toast', {
  show: (message, type = 'success') => {
    toastRef.value?.show(message, type)
  }
})

const logout = async () => {
  await authLogout()
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: var(--shadow-md);
}

.nav-brand a {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-user {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.main-content {
  min-height: calc(100vh - 72px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
