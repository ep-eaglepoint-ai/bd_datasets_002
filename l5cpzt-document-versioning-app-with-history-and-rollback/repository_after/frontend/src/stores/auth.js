import { ref, computed, readonly } from 'vue'
import api from '../api/axios'

// Reactive state
const user = ref(null)
const loading = ref(false)

// Initialize from localStorage
const initAuth = () => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser)
    } catch (e) {
      localStorage.removeItem('user')
    }
  }
}

initAuth()

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value && !!localStorage.getItem('access_token'))

  const setAuth = (userData, tokens) => {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('access_token', tokens.access)
    localStorage.setItem('refresh_token', tokens.refresh)
  }

  const clearAuth = () => {
    user.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const login = async (username, password) => {
    loading.value = true
    try {
      const response = await api.post('/auth/login/', { username, password })
      const { user: userData, tokens } = response.data.data
      setAuth(userData, tokens)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Login failed'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  const register = async (userData) => {
    loading.value = true
    try {
      const response = await api.post('/auth/register/', userData)
      const { user: newUser, tokens } = response.data.data
      setAuth(newUser, tokens)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Registration failed'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await api.post('/auth/logout/', { refresh: refreshToken })
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      clearAuth()
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me/')
      user.value = response.data.data
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (error) {
      clearAuth()
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated,
    login,
    register,
    logout,
    clearAuth,
    fetchCurrentUser
  }
}
