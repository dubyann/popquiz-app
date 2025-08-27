import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

// token 存储键名
const TOKEN_KEY = 'token'

export const useAuthStore = defineStore('auth', () => {
  // ---------------------------
  // 状态定义（state）
  // ---------------------------
  // token 仅由 Pinia 管理，避免在模块加载时直接访问 storage
  const token = ref<string | null>(null)
  const user = ref<any>(null)
  const role = ref<string | null>(null)

  // 验证码 / 注册相关状态
  const captchaToken = ref<string>('')
  const captchaTarget = ref<number | null>(null)
  const lastCaptchaSvg = ref<string>('') // 规范化后用于 <img> 的 data URL
  const lastCaptchaSvgText = ref<string>('') // 原始或解码后的 SVG 文本，可用于 v-html
  const sliderPosition = ref<number>(50)
  const showTarget = ref<boolean>(false)
  const isRegistering = ref(false)

  // 注册表单状态（全部由 Pinia 管理）
  // 将登录与注册的用户名分离，避免页面间表单互相污染
  const loginUsername = ref('')
  const registerUsername = ref('')
  // 密码相关字段已移回组件局部变量，下面仅保留校验/提交接口，避免明文密码保存在全局 store 中。
  const regRole = ref('')
  const contact = ref('')
  const captchaInput = ref('')

  // 登录相关状态（用于 Login 页面）
  const logRole = ref('')
  const isLoading = ref(false)

  const errors = ref<{ [k: string]: string }>(
    { username: '', password: '', confirmPassword: '', role: '', contact: '' }
  )

  const errorMessage = ref('')
  const successMessage = ref('')

  // ---------------------------
  // 计算属性（getters）
  // ---------------------------
  const isLoggedIn = computed(() => {
    if (!token.value) return false
    try {
      const payload = JSON.parse(atob((token.value as string).split('.')[1]))
      return payload && payload.exp > Date.now() / 1000
    } catch (e) {
      return false
    }
  })

  // ---------------------------
  // 内部辅助函数（helpers）
  // ---------------------------
  /**
   * 解析 JWT 并更新 user/role
   */
  function parseToken(t: string | null) {
    if (!t) return null
    try {
      const payload = JSON.parse(atob(t.split('.')[1]))
      user.value = {
        id: payload.id || payload.userId || payload.sub,
        username: payload.username || payload.name,
        iat: payload.iat
      }
      role.value = payload.role || null
    } catch (e) {
      console.warn('解析 token 失败', e)
      user.value = null
      role.value = null
    }
  }

  /**
   * 清空所有消息与表单错误
   */
  function clearMessages() {
    errorMessage.value = ''
    successMessage.value = ''
    errors.value = { username: '', password: '', confirmPassword: '', role: '', contact: '' }
  }

  /**
   * 清除某个字段的错误
   */
  function clearFieldError(field: string) {
    // 有时会传入动态字段名，使用索引访问
    // @ts-ignore
    errors.value[field] = ''
    if (errorMessage.value) errorMessage.value = ''
  }

  // ---------------------------
  // 表单校验（本地）
  // ---------------------------
  /**
   * 登录表单本地校验（供 Login 页面调用）
   */
  function validateLogin(p?: string) {
    clearMessages()
    let isValid = true
    const uname = loginUsername.value.trim()
    const pwd = (p || '').toString()

    if (!uname) { errors.value.username = '请输入用户名'; isValid = false }
    else if (uname.length < 2) { errors.value.username = '用户名至少需要2个字符'; isValid = false }
    else if (uname.length > 20) { errors.value.username = '用户名不能超过20个字符'; isValid = false }
    else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(uname)) { errors.value.username = '用户名只能包含字母、数字、下划线和中文'; isValid = false }

    if (!pwd) { errors.value.password = '请输入密码'; isValid = false }
    else if (pwd.length < 4) { errors.value.password = '密码至少需要4个字符'; isValid = false }
    else if (pwd.length > 50) { errors.value.password = '密码不能超过50个字符'; isValid = false }

    if (!logRole.value) { errors.value.role = '请选择用户角色'; isValid = false }
    else if (!['listener', 'speaker', 'organizer'].includes(logRole.value)) { errors.value.role = '请选择有效的用户角色'; isValid = false }

    return isValid
  }

  function validateFormLocal(p?: string, cp?: string) {
    clearMessages()
    let isValid = true
    const uname = registerUsername.value.trim()
    const pwd = (p || '').toString()
    const cPwd = (cp || '').toString()

    if (!uname) { errors.value.username = '请输入用户名'; isValid = false }
    else if (uname.length < 2) { errors.value.username = '用户名至少需要2个字符'; isValid = false }
    else if (uname.length > 20) { errors.value.username = '用户名不能超过20个字符'; isValid = false }
    else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(uname)) { errors.value.username = '用户名只能包含字母、数字、下划线和中文'; isValid = false }

    if (!pwd) { errors.value.password = '请输入密码'; isValid = false }
    else if (pwd.length < 6) { errors.value.password = '密码至少需要6个字符'; isValid = false }
    else if (pwd.length > 50) { errors.value.password = '密码不能超过50个字符'; isValid = false }

    if (!cPwd) { errors.value.confirmPassword = '请确认密码'; isValid = false }
    else if (pwd !== cPwd) { errors.value.confirmPassword = '两次输入的密码不一致'; isValid = false }

    if (!regRole.value) { errors.value.role = '请选择用户角色'; isValid = false }
    else if (!['listener', 'speaker', 'organizer'].includes(regRole.value)) { errors.value.role = '请选择有效的用户角色'; isValid = false }

    const contactVal = contact.value.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\+?[0-9]{7,15}$/
    if (!contactVal) { errors.value.contact = '请输入邮箱或手机号'; isValid = false }
    else if (!emailRegex.test(contactVal) && !phoneRegex.test(contactVal)) { errors.value.contact = '请输入有效的邮箱或手机号'; isValid = false }

    return isValid
  }

  // ---------------------------
  // Captcha 获取/刷新 与 规范化逻辑
  // 后端可能返回：data URL / 百分号编码的 data URL / 原始 <svg> 标记
  // 我们将解码并同时提供用于 v-html 的原始 svgText 与用于 <img> 的 data URL 备用值 lastCaptchaSvg
  // ---------------------------
  async function fetchCaptcha() {
    try {
      const r = await axios.get('/api/auth/captcha')
      captchaToken.value = r.data.captchaToken

      const rawSvgText = r.data.svgText || ''
      let svgText = rawSvgText

      // 如果后端返回被 HTML 转义的 svg 字符串，先解码
      try {
        if (svgText && /&lt;|&gt;|&amp;/.test(svgText)) {
          const ta = document.createElement('textarea')
          ta.innerHTML = svgText
          svgText = ta.value || svgText
        }
      } catch (err) {
        // 忽略解码失败，保留原值
        console.debug('svgText 解码失败', err)
      }

      // 保存解码后的 svgText 以便组件使用 v-html
      lastCaptchaSvgText.value = svgText

      // 优先使用后端直接提供的 data URL（r.data.svg）
      if (r.data.svg) {
        lastCaptchaSvg.value = r.data.svg
      } else {
        const txt = (svgText || '').trim()
        if (!txt) {
          lastCaptchaSvg.value = ''
        } else if (/^data%3A/i.test(txt)) {
          // 完整的百分号编码 data URL
          try { lastCaptchaSvg.value = decodeURIComponent(txt) } catch (e) { lastCaptchaSvg.value = txt }
        } else if (/^data:/i.test(txt)) {
          // 已是 data URL
          lastCaptchaSvg.value = txt
        } else if (/^data:image\/svg\+xml;utf8,data%3A/i.test(txt)) {
          // 双重包装的 data URL：取逗号后的部分解码
          try {
            const idx = txt.indexOf(',')
            const tail = txt.slice(idx + 1)
            const decodedTail = decodeURIComponent(tail)
            if (/^data:/i.test(decodedTail)) {
              lastCaptchaSvg.value = decodedTail
            } else {
              lastCaptchaSvg.value = 'data:image/svg+xml;utf8,' + decodedTail
            }
          } catch (e) {
            lastCaptchaSvg.value = txt
          }
        } else if (/^<svg[\s>]/i.test(txt)) {
          // 原始 svg 标记 -> 作为 data URL 备用
          try { lastCaptchaSvg.value = 'data:image/svg+xml;utf8,' + encodeURIComponent(txt) } catch (e) { lastCaptchaSvg.value = '' }
        } else {
          // 其他文本，尝试通过 encodeURIComponent 转为 data URL
          try { lastCaptchaSvg.value = 'data:image/svg+xml;utf8,' + encodeURIComponent(txt) } catch (e) { lastCaptchaSvg.value = '' }
        }
      }

      captchaTarget.value = r.data.target
      sliderPosition.value = Math.floor(Math.random() * 101)
      return r.data
    } catch (e) {
      console.warn('fetchCaptcha 失败', e)
      captchaToken.value = ''
      captchaTarget.value = null
      return null
    }
  }

  function refreshCaptcha() {
    captchaToken.value = ''
    captchaTarget.value = null
    return fetchCaptcha()
  }

  // ---------------------------
  // 注册 / 请求封装
  // ---------------------------
  async function register(payload: { username: string; password: string; role: string; contact: string; captchaToken?: string; sliderPosition?: number }) {
    isRegistering.value = true
    try {
      const res = await axios.post('/api/auth/register', payload)
      isRegistering.value = false
      return res.data
    } catch (err) {
      isRegistering.value = false
      throw err
    }
  }

  async function submitRegister(pwd?: string, confirmPwd?: string) {
    if (!validateFormLocal(pwd, confirmPwd)) return { ok: false }
    isRegistering.value = true
    clearMessages()
    try {
      const payload: any = {
        username: registerUsername.value.trim(),
        password: (pwd || '').toString(),
        role: regRole.value,
        contact: contact.value.trim(),
        captchaToken: captchaToken.value,
        captchaCode: captchaInput.value
      }
      const res = await register(payload)
      if (res && res.message && String(res.message).includes('注册成功')) {
        successMessage.value = String(res.message)
        return { ok: true, data: res }
      } else {
        errorMessage.value = (res && res.error) || '注册失败'
        return { ok: false, data: res }
      }
    } catch (err: any) {
      errorMessage.value = err.response?.data?.error || err.message || '注册异常'
      throw err
    } finally {
      isRegistering.value = false
    }
  }

  // ---------------------------
  // Token 管理接口（外部通过 setToken 显式设置）
  // ---------------------------
  /**
   * 设置 token 并选择是否持久化到 localStorage（默认持久化）
   * @param t JWT token 字符串或 null
   * @param persist 是否写入 localStorage（默认 true）
   */
  function setToken(t: string | null, persist = true) {
    token.value = t
    parseToken(t)
    // 尝试持久化到 localStorage（若环境不支持则静默失败）
    try {
      if (persist) {
        if (t) localStorage.setItem(TOKEN_KEY, t)
        else localStorage.removeItem(TOKEN_KEY)
      }
    } catch (e) {
      // ignore storage errors (e.g., SSR or 私有模式)
    }
  }

  function removeToken() {
    token.value = null
    user.value = null
    role.value = null
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch (e) {
      // ignore
    }
  }

  function clearAuth() {
    // 移除内存中的认证信息
    removeToken()
  }

  // 初始化：尝试从 localStorage 恢复 token（若存在）
  try {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) setToken(saved, true)
  } catch (e) {
    // ignore
  }

  // ---------------------------
  // 导出接口
  // ---------------------------
  return {
    // 基础状态
    token,
    user,
    role,
    isLoggedIn,

    // token 管理
    setToken,
    removeToken,
    clearAuth,

    // captcha
    captchaToken,
    captchaTarget,
    sliderPosition,
    showTarget,
    isRegistering,
    fetchCaptcha,
    refreshCaptcha,
    lastCaptchaSvg,
    lastCaptchaSvgText,

    // 注册表单（Pinia 管理）
    loginUsername,
    registerUsername,
    regRole,
    contact,
    captchaInput,
    errors,
    errorMessage,
    successMessage,
    // login
    logRole,
    isLoading,
    validateLogin,
    clearFieldError,
    clearMessages,
    validateFormLocal,
    submitRegister,

    // 请求封装
    register
  }
})

