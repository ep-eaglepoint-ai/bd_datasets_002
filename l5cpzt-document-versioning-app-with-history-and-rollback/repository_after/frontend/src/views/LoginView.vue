<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>📄 DocVersion</h1>
        <p>Sign in to your account</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            id="username"
            v-model="form.username"
            type="text"
            placeholder="Enter your username"
            required
            autocomplete="username"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Enter your password"
            required
            autocomplete="current-password"
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <button type="submit" class="btn btn-primary btn-block btn-lg" :disabled="loading">
          <LoadingSpinner v-if="loading" size="sm" />
          <span v-else>Sign In</span>
        </button>
      </form>
      
      <div class="auth-footer">
        <p>
          Don't have an account? 
          <router-link to="/register">Create one</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const router = useRouter()
const route = useRoute()
const { login, loading } = useAuth()
const toast = inject('toast')

const form = ref({
  username: '',
  password: ''
})
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  const result = await login(form.value.username, form.value.password)
  
  if (result.success) {
    toast.show('Welcome back!', 'success')
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } else {
    error.value = result.error
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%);
}

.auth-card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  animation: fadeIn 0.4s ease;
}

.auth-header {
  text-align: center;
  padding: 2.5rem 2rem 1.5rem;
  background: linear-gradient(135deg, var(--gray-50), white);
}

.auth-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-header p {
  color: var(--gray-500);
}

.auth-form {
  padding: 1.5rem 2rem 2rem;
}

.error-message {
  background: var(--error-500);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.auth-footer {
  text-align: center;
  padding: 1.5rem 2rem;
  background: var(--gray-50);
  border-top: 1px solid var(--gray-100);
}

.auth-footer p {
  color: var(--gray-600);
  margin: 0;
}

.auth-footer a {
  font-weight: 600;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
