import axios from 'axios'

const api = axios.create()

// 请求拦截器：自动附加 Token
api.interceptors.request.use(
  async (config) => {
    let token: string | null = null

    try {
      // 尝试动态导入 Pinia，避免循环依赖
      const piniaModule = await import('pinia')

      // 确保 getActivePinia 存在且是函数
      if (typeof piniaModule.getActivePinia === 'function') {
        const pinia = piniaModule.getActivePinia()
        if (pinia) {
          // 动态导入 auth store
          const authModule = await import('../stores/auth')
          const authStore = authModule.useAuthStore(pinia)

          if (authStore?.token) {
            token = authStore.token
          }
        }
      }
    } catch (e) {
      console.warn('[Axios] Pinia token 获取失败:', e)
    }

    // fallback: sessionStorage
    if (!token) {
      try {
        token = sessionStorage.getItem('token')
      } catch (e) {
        console.warn('[Axios] sessionStorage token 获取失败:', e)
      }
    }

    // 如果拿到 token，就加到请求头
    if (token) {
      const headers = (config.headers || {}) as any
      if (!headers.Authorization) headers.Authorization = `Bearer ${token}`
      config.headers = headers
    }
    return config
  },
  (error) => {
    // 请求配置异常
    console.error('[Axios] 请求拦截器异常:', error)
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

// 响应拦截器（可选）：统一处理 401 / 403 或全局错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[Axios] 响应错误:', error)
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
)

export default api
