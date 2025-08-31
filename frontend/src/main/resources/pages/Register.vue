<template>
  <div>
    <div class="register-container">
      <h2>注册</h2>
      
      <!-- 错误提示区域 -->
      <div v-if="errorMessage" class="error-message">
        <div class="message-header">
          <i class="error-icon">❌</i>
          <strong>注册失败</strong>
        </div>
        <p class="message-text">{{ errorMessage }}</p>
        <button class="message-close" @click="clearMessages">×</button>
      </div>
      
      <!-- 成功提示区域 -->
      <div v-if="successMessage" class="success-message">
        <div class="message-header">
          <i class="success-icon">✅</i>
          <strong>注册成功</strong>
        </div>
        <p class="message-text">{{ successMessage }}</p>
      </div>
      
  <form @submit.prevent="handleRegister">
        <div class="input-group">
          <input 
            v-model="registerUsername" 
            placeholder="用户名" 
            required 
            class="input"
            :class="{ 'input-error': errors.username }"
            @input="clearFieldError('username')"
          />
          <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
        </div>

        <!-- 联系方式：邮箱或手机号（单一输入） -->
        <div class="input-group">
          <input
            v-model="contact"
            placeholder="邮箱/手机号"
            required
            class="input"
            :class="{ 'input-error': errors.contact }"
            @input="clearFieldError('contact')"
          />
          <span v-if="errors.contact" class="field-error">{{ errors.contact }}</span>
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
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="确认密码" 
            required 
            class="input"
            :class="{ 'input-error': errors.confirmPassword }"
            @input="clearFieldError('confirmPassword')"
          />
          <span v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</span>
        </div>
        
        <div class="input-group">
          <select 
            v-model="regRole" 
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
          :disabled="isRegistering || !isFormValid"
          :class="{ 'btn-loading': isRegistering }"
        >
          <span v-if="isRegistering" class="loading-spinner">🔄</span>
          {{ isRegistering ? '注册中...' : '注册' }}
        </button>

        <!-- 数字验证码区域 -->
        <div class="captcha-area" v-if="captchaToken">
          <div class="captcha-instructions">请输入图片中的四位数字验证码</div>
          <div class="captcha-image">
            <!-- 当 lastCaptchaSvgText 包含 <svg> 标记时，使用 v-html 内联；否则尝试使用图片 src -->
            <div class="captcha-inline" v-if="captchaHtmlPresent" v-html="lastCaptchaSvgText"></div>
            <img v-else-if="captchaImage" :src="captchaImage" alt="captcha" />
            <div v-else class="captcha-inline">验证码加载中</div>
            <button type="button" class="btn" @click="refreshCaptcha">刷新</button>
          </div>
          <div class="input-group">
            <input v-model="captchaInput" placeholder="输入验证码" class="input" maxlength="4" />
          </div>
        </div>
        
        <p class="login-tip">
          已有账号？<router-link to="/login">登录</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatErrorMessage } from '../../../utils/errorHandler'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useFormStore } from '../../../stores/form'
import { useCaptchaStore } from '../../../stores/captcha'
// 使用延迟 getter，不在模块顶层直接调用 useXStore()，以避免初始化时的循环依赖或 null 引用

// 将密码放在组件本地，减小泄露风险
const password = ref('')
const confirmPassword = ref('')

const router = useRouter()

function getAuth() {
  try { return useAuthStore() } catch (e) { console.debug('getAuth not ready', e); return null }
}
function getFormStore() {
  try { return useFormStore() } catch (e) { console.debug('getFormStore not ready', e); return null }
}
function getCaptchaStore() {
  try { return useCaptchaStore() } catch (e) { console.debug('getCaptchaStore not ready', e); return null }
}

// Defensive computed wrappers that call stores at access time
const registerUsername = computed({ get: () => getAuth()?.registerUsername ?? '', set: (v: any) => { const a = getAuth(); if (a) a.registerUsername = v } })
const regRole = computed({ get: () => getAuth()?.regRole ?? '', set: (v: any) => { const a = getAuth(); if (a) a.regRole = v } })
const contact = computed({ get: () => getAuth()?.contact ?? '', set: (v: any) => { const a = getAuth(); if (a) a.contact = v } })
const captchaInput = computed({ get: () => getAuth()?.captchaInput ?? '', set: (v: any) => { const a = getAuth(); if (a) a.captchaInput = v } })
const isRegistering = computed({ get: () => getAuth()?.isRegistering ?? false, set: (v: any) => { const a = getAuth(); if (a) a.isRegistering = v } })

const errors = computed(() => getFormStore()?.errors ?? {})
const errorMessage = computed({ get: () => getFormStore()?.errorMessage ?? '', set: (v: any) => { const f = getFormStore(); if (f) f.errorMessage = v } })
const successMessage = computed({ get: () => getFormStore()?.successMessage ?? '', set: (v: any) => { const f = getFormStore(); if (f) f.successMessage = v } })

const captchaToken = computed(() => getCaptchaStore()?.captchaToken ?? '')
const lastCaptchaSvg = computed(() => getCaptchaStore()?.lastCaptchaSvg ?? '')
const lastCaptchaSvgText = computed(() => getCaptchaStore()?.lastCaptchaSvgText ?? '')

// 清理敏感字段函数（供路由离开及页面失焦/隐藏时调用）
function clearSensitive() {
  password.value = ''
  confirmPassword.value = ''
  try { getFormStore()?.clearFieldError?.('password') } catch (e) { console.debug('clearFieldError error', e) }
  try { getFormStore()?.clearFieldError?.('confirmPassword') } catch (e) { console.debug('clearFieldError error', e) }
}

// 将对 store 的方法调用延迟到运行时，避免在模块初始化时解构 store
const submitRegister = async (pwd: string, conf: string) => {
  const a = getAuth()
  if (!a || !a.submitRegister) throw new Error('Auth store not ready')
  return await a.submitRegister(pwd, conf)
}
const fetchCaptcha = async () => { return await getCaptchaStore()?.fetchCaptcha?.() }
const refreshCaptcha = async () => { return await getCaptchaStore()?.refreshCaptcha?.() }
const clearFieldError = (field: string) => { getFormStore()?.clearFieldError?.(field) }
const clearMessages = () => { getFormStore()?.clearMessages?.() }

// 表单验证
const isFormValid = computed(() => {
  return registerUsername.value.trim() && 
         password.value.trim() && 
         confirmPassword.value.trim() &&
         regRole.value && 
         contact.value.trim() &&
         !Object.values(errors.value).some((error: any) => error)
})

// 判断是否为可用的 HTML <svg> 文本（用于 v-html）
const captchaHtmlPresent = computed(() => {
  const txt = lastCaptchaSvgText.value || ''
  return /<svg[\s>]/i.test(txt)
})

// captchaImage 从 store 的 captchaToken 或 svg 字段来显示
const captchaImage = computed(() => {
  if (lastCaptchaSvg.value && /^data:image\/.+/.test(lastCaptchaSvg.value)) return lastCaptchaSvg.value
  if (lastCaptchaSvgText.value && !captchaHtmlPresent.value) {
    try {
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(lastCaptchaSvgText.value)
    } catch (e) {
      console.debug('captchaImage encode error', e)
      return ''
    }
  }
  return ''
})

// 错误处理函数
const handleError = (error: unknown) => {
  console.error('注册错误:', error)
  const f = getFormStore()
  if (f) f.errorMessage = formatErrorMessage(error)
}

const handleRegister = async () => {
  try {
    const result = await submitRegister(password.value, confirmPassword.value)
    if (result && result.ok) {
      // 注册成功，跳转到登录
      setTimeout(() => router.push('/login'), 2000)
      return
    }

    if (result && result.data) {
      handleError(result.data)
    } else {
      handleError(new Error('注册失败'))
    }
  } catch (err) {
    handleError(err)
  }
}

// 路由离开时清理
onBeforeRouteLeave((to, from, next) => {
  clearSensitive()
  next()
})

// 页面隐藏/失焦时清理
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

onMounted(() => {
  fetchCaptcha()
})
</script>

<style scoped>
.register-container {
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

.error-icon, .success-icon {
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

.login-tip {
  margin-top: 0.5rem;
  font-size: 0.95rem;
  color: #888;
}

.login-tip a {
  color: #3eaf7c;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.login-tip a:hover {
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

/* Captcha SVG styling (all styling lives in frontend) */
.captcha-image {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.captcha-inline {
  display: inline-block;
  width: 140px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  background: transparent;
  --captcha-fill: #0b5ed7;
  --captcha-stroke: rgba(0,0,0,0.08);
}

/* Use deep selector so scoped styles reach v-html-inserted SVG */
.captcha-inline ::v-deep svg {
  width: 100%;
  height: 100%;
  display: block;
}
.captcha-inline ::v-deep line {
  mix-blend-mode: multiply;
}

/* tweak fills/strokes via CSS variables for easy theming */
/* tweak fills/strokes via CSS variables for easy theming */
.captcha-inline ::v-deep text {
  font-family: 'Segoe UI', Roboto, system-ui, Arial, Helvetica, sans-serif;
  font-weight: 700;
  letter-spacing: 2px;
  dominant-baseline: middle;
  fill: var(--captcha-fill) !important;
  stroke: var(--captcha-stroke);
  stroke-width: 0.4px;
}

/* small screens */
@media (max-width: 480px) {
  .captcha-inline { width: 120px; height: 42px; }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-container {
    width: 90%;
    margin: 20px auto;
    padding: 2rem 1.5rem;
  }
}
</style>