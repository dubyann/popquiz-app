<template>
  <div>
    <div class="login-container">
      <h2>登录</h2>
      
      <!-- 错误提示区域 -->
      <div v-if="errorMessage" class="error-message">
        <div class="message-header">
          <i class="error-icon">❌</i>
          <strong>登录失败</strong>
        </div>
        <p class="message-text">{{ errorMessage }}</p>
        <button class="message-close" @click="clearMessages">×</button>
      </div>
      
      <!-- 成功提示区域 -->
      <div v-if="successMessage" class="success-message">
        <div class="message-header">
          <i class="success-icon">✅</i>
          <strong>登录成功</strong>
        </div>
        <p class="message-text">{{ successMessage }}</p>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <input 
            v-model="loginUsername" 
            placeholder="用户名/邮箱/手机号" 
            required 
            class="input"
            :class="{ 'input-error': errors.username }"
            @input="clearFieldError('username')"
          />
          <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
        </div>
        
        <div class="input-group">
          <input 
            v-model="password" 
            type="password" 
            placeholder="密码" 
            required 
            class="input"
            :class="{ 'input-error': errors.password }"
            @input="clearFieldError('password')"
          />
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>
        
        <div class="input-group">
          <select 
            v-model="logRole" 
            required 
            class="input"
            :class="{ 'input-error': errors.role }"
            @change="clearFieldError('role')"
          >
            <option value="" disabled>选择角色</option>
            <option value="listener">听众</option>
            <option value="speaker">演讲者</option>
            <option value="organizer">组织者</option>
          </select>
          <span v-if="errors.role" class="field-error">{{ errors.role }}</span>
        </div>
        
        <button 
          type="submit" 
          class="btn" 
          :disabled="isLoading || !isFormValid"
          :class="{ 'btn-loading': isLoading }"
        >
          <span v-if="isLoading" class="loading-spinner">🔄</span>
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
        
        <p class="register-tip">
          没有账号？<router-link to="/register">注册</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">

import api from '../../../utils/api'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useFormStore } from '../../../stores/form'
import { formatErrorMessage } from '../../../utils/errorHandler'

const router = useRouter()
function getAuth() {
  try { return useAuthStore() } catch (err) { console.debug('useAuthStore not ready', err); return null }
}
const authStore = getAuth()
// 从 Pinia 中解构表单/错误/消息相关状态，包含登录专属字段 logRole 和 isLoading
const fs = useFormStore()

// 防御性包装：有时组件在 Pinia 未就绪时会得到 null，避免 storeToRefs 抛错
const loginUsername = computed({
  get: () => authStore?.loginUsername ?? '',
  set: (v: string) => { if (authStore) authStore.loginUsername = v }
})

const logRole = computed({
  get: () => authStore?.logRole ?? '',
  set: (v: any) => { if (authStore) authStore.logRole = v }
})

const isLoading = computed({
  get: () => (authStore && authStore.isLoading) ?? false,
  set: (v: any) => { if (authStore) authStore.isLoading = v }
})

// 表单校验
const isFormValid = computed(() => {
  return loginUsername.value.trim() &&
         password.value.trim() &&
         logRole.value &&
         !Object.values(errors.value).some(error => error)
})
// fs 通常可用，但也用防御性读取以免抛错
const errors = computed(() => (fs && (fs as any).errors) ? (fs as any).errors : {})
const errorMessage = computed({ 
  get: () => (fs && (fs as any).errorMessage) ?? '', 
  set: (v: any) => { if (fs) (fs as any).errorMessage = v } 
})
const successMessage = computed({ 
  get: () => (fs && (fs as any).successMessage) ?? '', 
  set: (v: any) => { if (fs) (fs as any).successMessage = v } 
})

const password = ref('')

// 从 store 获取清理函数与校验函数
const { clearFieldError, clearMessages } = fs

// 清理敏感字段函数（供路由离开及页面失焦/隐藏时调用）
function clearSensitive() {
  password.value = ''
  if (typeof clearFieldError === 'function') clearFieldError('password')
}

// 错误处理（复用通用格式化，同时对登录场景做特定提示覆盖）
const handleError = (error: any) => {
  console.error('登录错误:', error)
  const baseMsg = formatErrorMessage(error)
  const status = error?.response?.status

  if (status === 401) { errorMessage.value = '用户名或密码错误，请重新输入'; return }
  if (status === 403) { errorMessage.value = '账号已被禁用或权限不足，请联系管理员'; return }
  if (status === 404) { errorMessage.value = '用户不存在，请检查用户名或先注册账号'; return }
  if (status === 502) { errorMessage.value = '服务器网关错误，请稍后重试'; return }
  if (status === 503) { errorMessage.value = '服务暂时不可用，请稍后重试'; return }

  errorMessage.value = baseMsg
}

// 登录表单校验
function validateLogin() {
  fs.clearMessages()

  let isValid = true
  const uname = loginUsername.value.trim()
  const pwd = password.value.trim()
  const role = logRole.value

  // 用户名校验
  if (!uname) {
    fs.errors.username = '请输入用户名'
    isValid = false
  } else if (uname.length < 2) {
    fs.errors.username = '用户名至少需要2个字符'
    isValid = false
  } else if (uname.length > 20) {
    fs.errors.username = '用户名不能超过20个字符'
    isValid = false
  } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(uname)) {
    fs.errors.username = '用户名只能包含字母、数字、下划线和中文'
    isValid = false
  }

  // 密码校验
  if (!pwd) {
    fs.errors.password = '请输入密码'
    isValid = false
  } else if (pwd.length < 4) {
    fs.errors.password = '密码至少需要4个字符'
    isValid = false
  } else if (pwd.length > 50) {
    fs.errors.password = '密码不能超过50个字符'
    isValid = false
  }

  // 角色校验
  if (!role) {
    fs.errors.role = '请选择用户角色'
    isValid = false
  } else if (!['listener', 'speaker', 'organizer'].includes(role)) {
    fs.errors.role = '请选择有效的用户角色'
    isValid = false
  }

  return isValid
}


// 根据角色值获取中文描述
function getRoleText(role: string) {
  if (role === 'listener') return '听众'
  if (role === 'speaker') return '演讲者'
  return '组织者'
}

// 获取并存储当前用户信息到 Pinia 和 localStorage
async function storeUser() {
  try {
    const userRes = await api.get('/api/users/me')
    if (userRes?.data && userRes.data.id) {
      try { 
        localStorage.setItem('user', JSON.stringify(userRes.data)) 
      } catch (e) { 
        console.warn('用户信息存储到本地失败', e) 
      }
      const a = getAuth()
      if (a) a.user = userRes.data
    }
  } catch (e) {
    console.error('获取当前用户信息失败', e)
  }
}

//路由
function doRedirect(resData: any) {
  const finalRole = resData.role || logRole.value
  if (finalRole === 'listener') router.replace('/listener/home')
  else if (finalRole === 'speaker') router.replace('/speaker/home')
  else router.replace('/organizer/home')
}

//登录
const handleLogin = async () => {

  fs.clearMessages()

  const isValid = validateLogin()
  
  

  if (!isValid) {
    errorMessage.value = '密码格式错误，请重新输入'
    return { ok: false, message: '表单校验失败' }
  }
  isLoading.value = true
  

  try {
    console.log('正在登录...', { 用户名: loginUsername.value, 角色: logRole.value })
    const res = await api.post('/api/auth/login', {
      username: loginUsername.value.trim(),
      password: password.value,
      role: logRole.value
    })

    if (res.data?.message === '登录成功' && res.data.token) {
      const auth = getAuth()
      if (auth && typeof auth.setToken === 'function') auth.setToken(res.data.token)
      await storeUser()
      const roleText = getRoleText(logRole.value)
      successMessage.value = `欢迎回来，${loginUsername.value}！正在跳转到${roleText}页面...`
      setTimeout(() => doRedirect(res.data), 1500)
    } else {
      errorMessage.value = res.data?.error || '登录失败，请检查用户名和密码是否正确'
    }
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

// 在路由离开时清理
onBeforeRouteLeave((to, from, next) => {
  clearSensitive()
  next()
})

// 页面可见性与焦点监听
onMounted(() => {
  const onVisibility = () => { if (document.hidden) clearSensitive() }
  const onBlur = () => clearSensitive()
  window.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', onBlur)

  onUnmounted(() => {
    window.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
  })
})

</script>

<style scoped>
.login-container {
  background: #fff;
  padding: 2.5rem 2rem 2rem 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(60, 120, 200, 0.12);
  width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 40px auto;
}

h2 {
  margin-bottom: 1.5rem;
  color: #3eaf7c;
  font-weight: 600;
  letter-spacing: 1px;
}

/* 错误和成功提示样式 */
.error-message {
  width: 100%;
  padding: 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1px solid #fecaca;
  border-left: 4px solid #dc2626;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.9rem;
  animation: slideIn 0.3s ease-out;
  position: relative;
}

.success-message {
  width: 100%;
  padding: 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #bbf7d0;
  border-left: 4px solid #16a34a;
  border-radius: 8px;
  color: #16a34a;
  font-size: 0.9rem;
  animation: slideIn 0.3s ease-out;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.message-text {
  margin: 0;
  line-height: 1.5;
  white-space: pre-line;
}

.message-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.message-close:hover {
  opacity: 1;
}

.error-icon, .success-icon, .info-icon {
  font-size: 1.1rem;
}

/* 输入框组样式 */
.input-group {
  width: 100%;
  margin-bottom: 1rem;
}

.input {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  outline: none;
  box-sizing: border-box;
}

.input:focus {
  border-color: #3eaf7c;
  box-shadow: 0 0 0 3px rgba(62, 175, 124, 0.1);
}

.input-error {
  border-color: #dc2626 !important;
  background-color: #fef2f2;
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.field-error {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #dc2626;
  animation: slideIn 0.2s ease-out;
}

/* 按钮样式 */
.btn {
  width: 100%;
  padding: 0.7rem 0;
  background: #3eaf7c;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
}

.btn:hover:not(:disabled) {
  background: #329c6b;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.btn-loading {
  background: #9ca3af;
}

.loading-spinner {
  animation: spin 1s linear infinite;
  font-size: 1rem;
}

.register-tip {
  margin-top: 0.5rem;
  font-size: 0.95rem;
  color: #888;
}

.register-tip a {
  color: #3eaf7c;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.register-tip a:hover {
  text-decoration: underline;
  color: #329c6b;
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-container {
    width: 90%;
    margin: 20px auto;
    padding: 2rem 1.5rem;
  }
}
</style>