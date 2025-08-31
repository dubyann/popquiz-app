import axios from 'axios'

const api = axios.create()

// Attach token from auth store (lazy) or localStorage as fallback
api.interceptors.request.use(async (config) => {
  try {
    // dynamic import to avoid circular dependency during module initialization
    const piniaModule = await import('pinia')
    const pinia = piniaModule.getActivePinia && piniaModule.getActivePinia()
    if (pinia) {
      const authModule = await import('../stores/auth')
      const authStore = authModule.useAuthStore(pinia)
      const token = authStore.token
      if (token) {
        const headers = (config.headers || {}) as any
        if (!headers.Authorization) headers.Authorization = `Bearer ${token}`
        config.headers = headers
      }
      return config
    }
  } catch (e) {
    // ignore and fall back to localStorage
  }

  // fallback: try localStorage (works in browser)
  try {
    const token = localStorage.getItem('token')
    if (token) {
      const headers = (config.headers || {}) as any
      if (!headers.Authorization) headers.Authorization = `Bearer ${token}`
      config.headers = headers
    }
  } catch (e) {
    // ignore
  }

  return config
})

export default api
