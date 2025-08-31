// ...existing code retained below
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useCaptchaStore } from './captcha'
import { useFormStore } from './form'

// 延迟导入其他 stores，避免模块初始化顺序或循环依赖导致 useXStore() 在顶层返回 null
// 在需要时通过 getFormStore()/getCaptchaStore() 懒获取

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

  // 延迟获取其他 store 的 helper（可能在模块初始化期间尚未就绪）
  function getFormStore() {
    try { return useFormStore() } catch (err) { console.debug('getFormStore not ready', err); return null }
  }

  function getCaptchaStore() {
    try { return useCaptchaStore() } catch (err) { console.debug('getCaptchaStore not ready', err); return null }
  }

  // 本地 fallback（当 form/captcha store 尚不可用时使用）
  const _localErrors = ref<{ [k: string]: string }>({ username: '', password: '', confirmPassword: '', role: '', contact: '' })
  const _localErrorMessage = ref('')
  const _localSuccessMessage = ref('')
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

  // error messages normally delegated to form store；这里用代理以防止循环依赖

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
    const fs = getFormStore()
    if (fs && typeof fs.clearMessages === 'function') return fs.clearMessages()
    _localErrorMessage.value = ''
    _localSuccessMessage.value = ''
    _localErrors.value = { username: '', password: '', confirmPassword: '', role: '', contact: '' }
  }

  /**
   * 清除某个字段的错误
   */
  function clearFieldError(field: string) {
    const fs = getFormStore()
    try {
      if (fs && typeof fs.clearFieldError === 'function') {
        // @ts-ignore
        return fs.clearFieldError(field)
      }
      // fallback
      // @ts-ignore
      _localErrors.value[field] = ''
    } catch (e) {
      // ignore
    }
    if (_localErrorMessage.value) _localErrorMessage.value = ''
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
    const fs = getFormStore()

  if (!uname) { (fs ? (fs.errors as any) : _localErrors).username = '请输入用户名'; isValid = false }
  else if (uname.length < 2) { (fs ? (fs.errors as any) : _localErrors).username = '用户名至少需要2个字符'; isValid = false }
  else if (uname.length > 20) { (fs ? (fs.errors as any) : _localErrors).username = '用户名不能超过20个字符'; isValid = false }
  else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(uname)) { (fs ? (fs.errors as any) : _localErrors).username = '用户名只能包含字母、数字、下划线和中文'; isValid = false }

  if (!pwd) { (fs ? (fs.errors as any) : _localErrors).password = '请输入密码'; isValid = false }
  else if (pwd.length < 4) { (fs ? (fs.errors as any) : _localErrors).password = '密码至少需要4个字符'; isValid = false }
  else if (pwd.length > 50) { (fs ? (fs.errors as any) : _localErrors).password = '密码不能超过50个字符'; isValid = false }

  if (!logRole.value) { (fs ? (fs.errors as any) : _localErrors).role = '请选择用户角色'; isValid = false }
  else if (!['listener', 'speaker', 'organizer'].includes(logRole.value)) { (fs ? (fs.errors as any) : _localErrors).role = '请选择有效的用户角色'; isValid = false }

    return isValid
  }

  function validateFormLocal(p?: string, cp?: string) {
    clearMessages()
    let isValid = true
    const uname = registerUsername.value.trim()
    const pwd = (p || '').toString()
    const cPwd = (cp || '').toString()
    const fs = getFormStore()

  if (!uname) { (fs ? (fs.errors as any) : _localErrors).username = '请输入用户名'; isValid = false }
  else if (uname.length < 2) { (fs ? (fs.errors as any) : _localErrors).username = '用户名至少需要2个字符'; isValid = false }
  else if (uname.length > 20) { (fs ? (fs.errors as any) : _localErrors).username = '用户名不能超过20个字符'; isValid = false }
  else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(uname)) { (fs ? (fs.errors as any) : _localErrors).username = '用户名只能包含字母、数字、下划线和中文'; isValid = false }

  if (!pwd) { (fs ? (fs.errors as any) : _localErrors).password = '请输入密码'; isValid = false }
  else if (pwd.length < 6) { (fs ? (fs.errors as any) : _localErrors).password = '密码至少需要6个字符'; isValid = false }
  else if (pwd.length > 50) { (fs ? (fs.errors as any) : _localErrors).password = '密码不能超过50个字符'; isValid = false }

  if (!cPwd) { (fs ? (fs.errors as any) : _localErrors).confirmPassword = '请确认密码'; isValid = false }
  else if (pwd !== cPwd) { (fs ? (fs.errors as any) : _localErrors).confirmPassword = '两次输入的密码不一致'; isValid = false }

  if (!regRole.value) { (fs ? (fs.errors as any) : _localErrors).role = '请选择用户角色'; isValid = false }
  else if (!['listener', 'speaker', 'organizer'].includes(regRole.value)) { (fs ? (fs.errors as any) : _localErrors).role = '请选择有效的用户角色'; isValid = false }

  const contactVal = contact.value.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^\+?\d{7,15}$/
  if (!contactVal) { (fs ? (fs.errors as any) : _localErrors).contact = '请输入邮箱或手机号'; isValid = false }
  else if (!emailRegex.test(contactVal) && !phoneRegex.test(contactVal)) { (fs ? (fs.errors as any) : _localErrors).contact = '请输入有效的邮箱或手机号'; isValid = false }

    return isValid
  }

  // ---------------------------
  // Captcha 获取/刷新 与 规范化逻辑
  // 后端可能返回：data URL / 百分号编码的 data URL / 原始 <svg> 标记
  // 我们将解码并同时提供用于 v-html 的原始 svgText 与用于 <img> 的 data URL 备用值 lastCaptchaSvg
  // ---------------------------
  async function fetchCaptcha() {
  // delegate to captcha store when available
  const cs = getCaptchaStore()
  if (cs && typeof cs.fetchCaptcha === 'function') return cs.fetchCaptcha()
  return null
  }

  function refreshCaptcha() {
  const cs = getCaptchaStore()
  if (cs && typeof cs.refreshCaptcha === 'function') return cs.refreshCaptcha()
  return null
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
      const cs = getCaptchaStore()
      const payload: any = {
        username: registerUsername.value.trim(),
        password: (pwd || '').toString(),
        role: regRole.value,
        contact: contact.value.trim(),
        captchaToken: cs ? cs.captchaToken : undefined,
        captchaCode: captchaInput.value
      }
      const res = await register(payload)
      if (res && res.message && String(res.message).includes('注册成功')) {
        const fs = getFormStore()
        if (fs) fs.successMessage = String(res.message)
        else _localSuccessMessage.value = String(res.message)
        return { ok: true, data: res }
      } else {
        const fs = getFormStore()
        if (fs) fs.errorMessage = (res && res.error) || '注册失败'
        else _localErrorMessage.value = (res && res.error) || '注册失败'
        return { ok: false, data: res }
      }
    } catch (err: any) {
  const fs = getFormStore()
  if (fs) fs.errorMessage = err.response?.data?.error || err.message || '注册异常'
  else _localErrorMessage.value = err.response?.data?.error || err.message || '注册异常'
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

  // captcha (delegated to captchaStore when available, fallback to safe values)
  captchaToken: computed(() => getCaptchaStore()?.captchaToken ?? ''),
  captchaTarget: computed(() => getCaptchaStore()?.captchaTarget ?? null),
  isRegistering,
  fetchCaptcha,
  refreshCaptcha,
  lastCaptchaSvg: computed(() => getCaptchaStore()?.lastCaptchaSvg ?? ''),
  lastCaptchaSvgText: computed(() => getCaptchaStore()?.lastCaptchaSvgText ?? ''),

    // 注册表单（Pinia 管理）
    loginUsername,
    registerUsername,
    regRole,
    contact,
  captchaInput,
  errors: computed(() => getFormStore()?.errors ?? _localErrors.value),
  errorMessage: computed({ get: () => getFormStore()?.errorMessage ?? _localErrorMessage.value, set: (v: any) => { const fs = getFormStore(); if (fs) fs.errorMessage = v; else _localErrorMessage.value = v } }),
  successMessage: computed({ get: () => getFormStore()?.successMessage ?? _localSuccessMessage.value, set: (v: any) => { const fs = getFormStore(); if (fs) fs.successMessage = v; else _localSuccessMessage.value = v } }),
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

