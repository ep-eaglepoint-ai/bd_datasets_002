<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>📄 DocVersion</h1>
        <p>Create your account</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input 
              id="firstName"
              v-model="form.first_name"
              type="text"
              placeholder="First name"
            />
          </div>
          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input 
              id="lastName"
              v-model="form.last_name"
              type="text"
              placeholder="Last name"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="username">Username *</label>
          <input 
            id="username"
            v-model="form.username"
            type="text"
            placeholder="Choose a username"
            required
            autocomplete="username"
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email *</label>
          <input 
            id="email"
            v-model="form.email"
            type="email"
            placeholder="your@email.com"
            required
            autocomplete="email"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password *</label>
          <input 
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Create a password"
            required
            autocomplete="new-password"
          />
        </div>
        
        <div class="form-group">
          <label for="passwordConfirm">Confirm Password *</label>
          <input 
            id="passwordConfirm"
            v-model="form.password_confirm"
            type="password"
            placeholder="Confirm your password"
            required
            autocomplete="new-password"
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <button type="submit" class="btn btn-primary btn-block btn-lg" :disabled="loading">
          <LoadingSpinner v-if="loading" size="sm" />
          <span v-else>Create Account</span>
        </button>
      </form>
      
      <div class="auth-footer">
        <p>
          Already have an account? 
          <router-link to="/login">Sign in</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const router = useRouter()
const { register, loading } = useAuth()
const toast = inject('toast')

const form = ref({
  username: '',
  email: '',
  password: '',
  password_confirm: '',
  first_name: '',
  last_name: ''
})
const error = ref('')

const handleRegister = async () => {
  error.value = ''
  
  if (form.value.password !== form.value.password_confirm) {
    error.value = 'Passwords do not match'
    return
  }
  
  const result = await register(form.value)
  
  if (result.success) {
    toast.show('Account created successfully!', 'success')
    router.push('/')
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
  max-width: 480px;
  overflow: hidden;
  animation: fadeIn 0.4s ease;
}

.auth-header {
  text-align: center;
  padding: 2rem 2rem 1rem;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
