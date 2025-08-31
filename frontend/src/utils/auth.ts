// 认证工具函数
// 统一管理token的存储和获取，支持会话级别的登录状态

export class AuthManager {
  private static readonly TOKEN_KEY = 'token'
  private static readonly USE_SESSION_STORAGE = true // 设置为true使用sessionStorage，false使用localStorage

  // 获取token - 支持双存储后备
  // 如果 USE_SESSION_STORAGE 为 true，则优先从 sessionStorage 读取，否则优先从 localStorage 读取
  static getToken(): string | null {
    try {
      if (this.USE_SESSION_STORAGE) {
        return sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY)
      }
      return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY)
    } catch (e) {
      // 在某些受限环境（例如私有模式或 SSR）访问 storage 可能抛错
      return null
    }
  }

  /**
   * 设置 token
   * @param token JWT 字符串，传 null 表示移除
   * @param persist 是否持久化到 storage（默认 true）
   * @param preferSession 可选 - 优先使用 sessionStorage（若提供则覆盖默认配置）
   */
  static setToken(token: string | null, persist = true, preferSession?: boolean): void {
    try {
      if (!token) {
        this.removeToken()
        return
      }

      const useSession = typeof preferSession === 'boolean' ? preferSession : this.USE_SESSION_STORAGE
      if (persist) {
        if (useSession) sessionStorage.setItem(this.TOKEN_KEY, token)
        else localStorage.setItem(this.TOKEN_KEY, token)
        // 同时写入另一处以提高容错（有时浏览器策略导致部分 storage 不可用）
        try {
          if (useSession) localStorage.setItem(this.TOKEN_KEY, token)
          else sessionStorage.setItem(this.TOKEN_KEY, token)
        } catch (e) {
          // ignore secondary write error
        }
      } else {
        // 非持久化：只写入 sessionStorage
        try { sessionStorage.setItem(this.TOKEN_KEY, token) } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  // 移除token - 从两个存储中都移除
  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    sessionStorage.removeItem(this.TOKEN_KEY)
  }

  // 清除所有认证相关数据 - 从两个存储中都清除
  static clearAuth(): void {
    // 清除token
    sessionStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    localStorage.removeItem('currentLectureId')
    localStorage.removeItem('currentLecture')
    
    // 也清除 sessionStorage 中对应的数据
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('userRole')
    sessionStorage.removeItem('currentLectureId')
    sessionStorage.removeItem('currentLecture')
  }

  // 检查是否已登录
  static isLoggedIn(): boolean {
    const token = this.getToken()
    if (!token) return false
    
    try {
      // 检查token是否有效（简单的格式检查）
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isExpired = payload.exp && payload.exp < Date.now() / 1000
      
      if (isExpired) {
        console.warn('Token已过期，自动清除')
        this.clearAuth()
        return false
      }
      
      return payload && payload.exp > Date.now() / 1000
    } catch (e) {
      // token无效，清除它
      console.warn('Token格式无效，自动清除')
      this.removeToken()
      return false
    }
  }

  // 获取用户角色
  static getUserRole(): string | null {
    const token = this.getToken()
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.role || null
    } catch (e) {
      console.error('Token解析失败:', e)
      this.removeToken()
      return null
    }
  }

  // 获取用户信息
  static getUserInfo(): any {
    const token = this.getToken()
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        id: payload.id || payload.userId || payload.sub,
        username: payload.username || payload.name,
        role: payload.role,
        exp: payload.exp,
        iat: payload.iat
      }
    } catch (e) {
      console.error('Token解析失败:', e)
      this.removeToken()
      return null
    }
  }

  /**
   * 解析并返回 JWT payload（不改变存储）
   */
  static getPayload(): any | null {
    const token = this.getToken()
    if (!token) return null
    try {
      return JSON.parse(atob(token.split('.')[1]))
    } catch (e) {
      return null
    }
  }
}

// 页面可见性变化监听
export class VisibilityManager {
  private static instance: VisibilityManager | null = null
  private isHidden = false

  static getInstance(): VisibilityManager {
    if (!this.instance) {
      this.instance = new VisibilityManager()
    }
    return this.instance
  }

  constructor() {
    this.setupVisibilityListener()
  }

  private setupVisibilityListener() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isHidden = true
        console.log('页面已隐藏')
      } else {
        if (this.isHidden) {
          // 页面从隐藏状态变为可见，可能是用户重新打开标签页
          console.log('页面重新可见')
          this.handlePageVisible()
        }
        this.isHidden = false
      }
    })

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload()
    })

    // 监听页面加载
    window.addEventListener('load', () => {
      this.handlePageLoad()
    })
  }

  private handlePageVisible() {
    // 页面重新可见时的处理逻辑
    // 可以在这里添加重新验证token的逻辑
  }

  private handlePageUnload() {
    // 页面卸载时的处理逻辑
    console.log('页面即将卸载')
  }

  private handlePageLoad() {
    // 页面加载时的处理逻辑
    console.log('页面已加载')
  }
}

// 自动初始化
VisibilityManager.getInstance()

export default AuthManager
