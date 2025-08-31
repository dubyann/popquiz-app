<template>
  <div id="app">
    <!-- 现代化头部导航 -->
    <header class="app-header">
      <div class="header-container">
        <div class="brand-section">
          <div class="brand-icon">🎓</div>
          <h1 class="brand-title">PQ智能系统</h1>
          <span class="brand-subtitle">智能讲座互动平台</span>
        </div>
        <nav class="header-nav">
          <div class="nav-links">
            <a href="#" class="nav-link" :class="{ active: isHomeActive }" @click.prevent="handleHomeClick">
              <span class="link-icon">🏠</span>
              <span class="link-text">首页</span>
            </a>
            <!-- 当前讲座按钮（恢复并美化，显示真实数据） -->
            <div class="lecture-info-dropdown" v-if="getUserRole() && getCurrentLecture() && !isHomePage">
              <a href="#" class="nav-link" @click.prevent="toggleLectureInfo" :class="{ active: showLectureInfo }">
                <span class="link-icon">📚</span>
                <span class="link-text">当前讲座</span>
                <span class="dropdown-arrow" :class="{ rotated: showLectureInfo }">▼</span>
              </a>
              <div class="lecture-info-panel" v-show="showLectureInfo">
                <div class="lecture-header">
                  <h3 class="lecture-title">{{ getCurrentLecture().title || '无' }}</h3>
                  <span class="lecture-status" :class="getCurrentLecture().status">{{ getLectureStatusText() }}</span>
                </div>
                <div class="lecture-details">
                  <div class="lecture-item">
                    <span class="item-icon">🆔</span>
                    <span class="item-label">ID：</span>
                    <span class="item-value">{{ getCurrentLecture().id || '无' }}</span>
                  </div>
                  <div class="lecture-item">
                    <span class="item-icon">👤</span>
                    <span class="item-label">讲师：</span>
                    <span class="item-value">{{ getCurrentLecture().speaker || '无' }}</span>
                  </div>
                  <div class="lecture-item">
                    <span class="item-icon">🕒</span>
                    <span class="item-label">创建：</span>
                    <span class="item-value">{{ formatLectureTime() }}</span>
                  </div>
                  <div class="lecture-item">
                    <span class="item-icon">👥</span>
                    <span class="item-label">参与：</span>
                    <span class="item-value">
                      {{ getCurrentLecture().participants }} 人参与
                      <span v-if="getCurrentLecture().onlineParticipants !== undefined && getCurrentLecture().onlineParticipants !== null" class="online-indicator">
                        ({{ getCurrentLecture().onlineParticipants }} 在线)
                      </span>
                    </span>
                  </div>
                  <div class="lecture-item">
                    <span class="item-icon">📝</span>
                    <span class="item-label">描述：</span>
                    <span class="item-value">{{ getCurrentLecture().description || '无' }}</span>
                  </div>
                </div>
                <!-- 讲座操作按钮 -->
                <div class="lecture-actions">
                  <!-- 离开讲座按钮（仅听众可用） -->
                  <button v-if="getUserRole() === 'listener'" class="leave-lecture-btn" @click="handleLeaveLecture">
                    <span class="btn-icon">🚪</span>
                    <span class="btn-text">离开讲座</span>
                  </button>
                  <!-- 结束讲座按钮（仅讲者可用） -->
                  <button v-if="getUserRole() === 'speaker'" class="end-lecture-btn" @click="handleEndLecture" :disabled="isEndingLecture">
                    <span class="btn-icon">{{ isEndingLecture ? '⏳' : '🔚' }}</span>
                    <span class="btn-text">{{ isEndingLecture ? '正在结束...' : '结束讲座' }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="settings-dropdown" v-if="getUserRole()">
              <a href="#" class="nav-link" @click.prevent="toggleSettingsDropdown" :class="{ active: showSettingsDropdown }">
                <span class="link-icon">⚙️</span>
                <span class="link-text">设置</span>
                <span class="dropdown-arrow" :class="{ rotated: showSettingsDropdown }">▼</span>
              </a>
              <div class="dropdown-menu" v-show="showSettingsDropdown">
                <a href="#" class="dropdown-item" @click.prevent="handleEditProfile">
                  <span class="dropdown-icon">👤</span>
                  <span>修改信息</span>
                </a>
                <a href="#" class="dropdown-item" @click.prevent="handleChangePassword">
                  <span class="dropdown-icon">🔑</span>
                  <span>修改密码</span>
                </a>
                <a href="#" class="dropdown-item" @click.prevent="handleAccountSettings">
                  <span class="dropdown-icon">⚙️</span>
                  <span>账号设置</span>
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item danger" @click.prevent="handleLogout">
                  <span class="dropdown-icon">🚪</span>
                  <span>退出登录</span>
                </a>
              </div>
            </div>
          </div>
          <div class="user-info" v-if="getUserRole()">
            <span class="user-role-badge" :class="getUserRole()">
              {{ getUserRole() === 'speaker' ? '📢 讲师' : getUserRole() === 'listener' ? '👤 听众' : '🛠 组织者' }}
            </span>
          </div>
        </nav>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <div class="app-content">
      <component :is="isLectureLayout ? 'div' : 'main'" class="content-wrapper">
        <router-view v-slot="{ Component }">
          <component :is="Component" v-if="Component" />
          <div v-else class="no-component">
            <strong>未找到可渲染的组件</strong>
            <p>页面内容为空。请打开控制台（F12）查看错误或路由守卫日志。</p>
          </div>
        </router-view>
      </component>
    </div>

    <!-- 简洁页脚 -->
    <footer class="app-footer">
      <div class="footer-container">
        <small>© 2025 PopQuiz-app Web. 保留所有权利.</small>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()

// 设置下拉菜单状态
const showSettingsDropdown = ref(false)
const showLectureInfo = ref(false)
const currentLectureData = ref(null) // 新增：存储当前讲座数据
const participantCountTimer = ref(null) // 新增：参与者数量定时器
const heartbeatTimer = ref(null) // 新增：心跳定时器

// 结束讲座状态
const isEndingLecture = ref(false)

const isLectureLayout = computed(() => 
  route.path.startsWith('/speaker/lecture/') || route.path.startsWith('/listener/lecture/')
)

// 设置下拉菜单处理
const toggleSettingsDropdown = () => {
  showSettingsDropdown.value = !showSettingsDropdown.value
  showLectureInfo.value = false // 关闭讲座信息面板
}

// 讲座信息面板处理
const toggleLectureInfo = async () => {
  showLectureInfo.value = !showLectureInfo.value
  showSettingsDropdown.value = false // 关闭设置下拉菜单
  if (showLectureInfo.value) {
    // 每次点击都重新拉取讲座信息和参与人数和状态
    let lectureId = null
    if (route.path.includes('/lecture/')) {
      lectureId = route.params.id
    } else {
      lectureId = localStorage.getItem('currentLectureId') || sessionStorage.getItem('currentLectureId')
    }
    if (lectureId) {
      // 确保用户已加入讲座
      await ensureUserJoinedLecture(lectureId)
      
      // 拉取讲座详情（含最新status）
      const lecture = await getLectureById(lectureId)
      // 拉取参与人数
      let participantCount = 0
      let onlineParticipantCount = 0
      try {
        const res = await fetch(`/api/participants/count/${lectureId}`, {
          headers: { 'Content-Type': 'application/json' }
        })
        // 使用兼容 helper 解析
        const { isOk, parseResponseData } = await import('./utils/http')
        if (isOk(res)) {
          const data = await parseResponseData(res)
          participantCount = data?.total_participants ?? 0
          onlineParticipantCount = data?.online_participants ?? 0
        }
      } catch (e) {
        console.warn('获取参与者数量失败:', e)
      }

      currentLectureData.value = { ...lecture, participants: participantCount, onlineParticipants: onlineParticipantCount, status: lecture.status }
    }
  }
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  const dropdown = event.target.closest('.settings-dropdown')
  const lectureDropdown = event.target.closest('.lecture-info-dropdown')
  
  if (!dropdown) {
    showSettingsDropdown.value = false
  }
  if (!lectureDropdown) {
    showLectureInfo.value = false
  }
}

// 修改个人信息
const handleEditProfile = () => {
  showSettingsDropdown.value = false
  router.push('/profile/edit') // 跳转到修改个人信息页面
}

// 修改密码
const handleChangePassword = () => {
  showSettingsDropdown.value = false
  router.push('/profile/change-password') // 跳转到修改密码页面
}

// 账号设置
const handleAccountSettings = () => {
  showSettingsDropdown.value = false
  router.push('/profile/settings') // 跳转到账号设置页面
}

// 生命周期钩子
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  await updateCurrentLecture() // 初始化当前讲座信息
  setupHistoryGuard() // 立即设置历史记录守卫，无论用户是否登录
  startParticipantCountRefresh() // 开始定时刷新参与者数量
  startHeartbeat() // 开始心跳
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  removeHistoryGuard() // 移除历史记录守卫
  stopParticipantCountRefresh() // 停止定时刷新
  stopHeartbeat() // 停止心跳
})

// 监听路由变化，更新当前讲座信息
watch(route, async () => {
  await updateCurrentLecture()
  // 每次路由变化时重新添加历史记录条目以防止回退
  if (historyGuardEnabled) {
    setTimeout(() => {
      history.pushState(null, null, location.href)
    }, 0)
  }
  // 路由变化时重新启动定时器
  restartTimers()
})

// 历史记录守卫相关
let historyGuardEnabled = false

// 设置历史记录守卫
const setupHistoryGuard = () => {
  historyGuardEnabled = true
  
  // 监听浏览器的 popstate 事件（后退/前进按钮）
  window.addEventListener('popstate', handleBrowserNavigation)
  
  // 监听 beforeunload 事件作为额外保护
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // 添加历史记录条目以防止回退
  history.pushState(null, null, location.href)
  
  // 清除可能存在的导航标记
  sessionStorage.removeItem('homeButtonClicked')
}

// 移除历史记录守卫
const removeHistoryGuard = () => {
  historyGuardEnabled = false
  window.removeEventListener('popstate', handleBrowserNavigation)
  window.removeEventListener('beforeunload', handleBeforeUnload)
}

// 处理浏览器导航（后退/前进按钮）
const handleBrowserNavigation = (event) => {
  if (!historyGuardEnabled) return
  
  // 完全禁用浏览器回退按钮
  event.preventDefault()
  event.stopPropagation()
  
  // 强制保持在当前页面
  history.pushState(null, null, location.href)
  
  // 提示用户使用页面内的导航
  console.log('浏览器回退已被禁用，请使用页面内的导航按钮')
}

// 处理页面卸载前事件
const handleBeforeUnload = (event) => {
  if (!historyGuardEnabled) return
  
  // 对于某些浏览器，添加额外的确认
  event.preventDefault()
  event.returnValue = ''
  return ''
}

// 获取用户角色（防御性：避免在 Pinia 尚未安装时直接调用 useAuthStore 导致异常）
let _auth = null
function getAuth() {
  if (_auth) return _auth
  try {
    _auth = useAuthStore()
  } catch (err) {
    console.debug('useAuthStore not ready yet', err)
    _auth = null
  }
  return _auth
}

const getUserRole = () => {
  const a = getAuth()
  if (a && a.role) return a.role
  if (a && a.user && a.user.role) return a.user.role
  // 兜底：尝试从 storage 读取
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role
  } catch (e) {
    console.error('Token解析失败:', e)
    return null
  }
}

// 听众离开讲座处理
const handleLeaveLecture = async () => {
  const userRole = getUserRole()
  const currentLecture = getCurrentLecture()
  
  if (userRole !== 'listener' || !currentLecture) {
    return
  }
  
  if (confirm('确定要离开当前讲座吗？')) {
    try {
      // 关闭讲座信息面板
      showLectureInfo.value = false
      
      // 调用退出讲座API
      await exitCurrentLecture()
      
      // 清除当前讲座信息，隐藏当前讲座按钮
      currentLectureData.value = null
      localStorage.removeItem('currentLectureId')
      sessionStorage.removeItem('currentLectureId')
      
      // 停止相关定时器
      stopParticipantCountRefresh()
      stopHeartbeat()
      
      // 标记这是通过离开讲座按钮的合法导航
      sessionStorage.setItem('homeButtonClicked', 'true')
      
      // 导航到听众首页
      router.push('/listener/home')
      
      // 显示成功提示
      setTimeout(() => {
        alert(`您已成功离开讲座"${currentLecture.title}"`)
      }, 100)
      
    } catch (error) {
      console.error('离开讲座时发生错误:', error)
      alert('离开讲座失败，请稍后重试')
    }
  }
}

// 讲者结束讲座处理
const handleEndLecture = async () => {
  const userRole = getUserRole()
  const currentLecture = getCurrentLecture()
  
  if (userRole !== 'speaker' || !currentLecture) {
    return
  }
  
  if (confirm('确定要结束当前讲座吗？结束后听众将无法继续答题。')) {
    isEndingLecture.value = true
    
    try {
      const token = (auth && auth.token) || sessionStorage.getItem('token') || localStorage.getItem('token')
      if (!token) {
        throw new Error('未找到认证令牌')
      }

      // 调用结束讲座API
      const response = await fetch(`/api/lectures/${currentLecture.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      // 关闭讲座信息面板
      showLectureInfo.value = false
      
      // 清除当前讲座信息
      localStorage.removeItem('currentLectureId')
      currentLectureData.value = null
      
      // 导航到讲者首页
      router.push('/speaker/home')
      
      // 显示成功提示
      setTimeout(() => {
        alert(`讲座"${currentLecture.title}"已成功结束`)
      }, 100)
      
    } catch (error) {
      console.error('结束讲座时发生错误:', error)
      alert(`结束讲座失败：${error.message}`)
    } finally {
      isEndingLecture.value = false
    }
  }
}

// 首页按钮点击处理
const handleHomeClick = () => {
  router.push('/'); // 跳转到首页路径
}

// 退出登录处理
const handleLogout = () => {
  showSettingsDropdown.value = false
  if (confirm('确定要退出登录吗？')) {
    // 如果在讲座中，先退出讲座
    if (route.path.includes('/lecture/')) {
      exitCurrentLecture()
    }
    
    // 移除历史记录守卫
    removeHistoryGuard()
    // 清除 store 中的认证信息并同步清理 storage
    try {
      auth.clearAuth()
    } catch (e) {
      // 记录异常以便诊断，然后兜底清理 storage
      console.debug('auth.clearAuth failed, fallback to manual storage cleanup', e)
      sessionStorage.removeItem('token')
      localStorage.removeItem('token')
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
      localStorage.removeItem('currentLectureId')
      sessionStorage.removeItem('authToken')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('userRole')
      sessionStorage.removeItem('currentLectureId')
    }
    
    // 彻底清除历史记录，使用 location.replace 确保无法后退
    window.location.replace('/login')
  }
}

// 检查当前路由是否为首页
const isHomeActive = computed(() => {
  const userRole = getUserRole()
  if (userRole === 'speaker') {
    return route.path === '/speaker/home'
  } else if (userRole === 'listener') {
    return route.path === '/listener/home'
  }
  return route.path === '/' || route.path === '/login'
})


// 获取当前讲座信息
const getCurrentLecture = () => {
  // 直接返回缓存的讲座数据
  console.log('getCurrentLecture 被调用，currentLectureData.value:', currentLectureData.value)
  return currentLectureData.value
}

// 异步加载当前讲座信息
const loadCurrentLecture = async () => {
  const userRole = getUserRole()
  if (!userRole) {
    currentLectureData.value = null
    return
  }
  
  let lectureId = null
  
  // 优先从当前路由获取讲座信息
  const isInLecture = route.path.includes('/lecture/')
  if (isInLecture) {
    lectureId = route.params.id
  } else {
    // 如果不在讲座页面，检查用户是否有当前参与的讲座
    lectureId = localStorage.getItem('currentLectureId') || sessionStorage.getItem('currentLectureId')
  }
  
  if (lectureId) {
    try {
      const lectureData = await getLectureById(lectureId)
      currentLectureData.value = lectureData
    } catch (error) {
      console.error('加载讲座信息失败:', error)
      currentLectureData.value = null
    }
  } else {

    
    currentLectureData.value = null
  }
}

// 根据讲座ID获取讲座信息的辅助函数
const getLectureById = async (lectureId) => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      console.error('未找到认证令牌')
      return null
    }
    
    // 调用API获取真实的讲座数据 - 使用相对路径
    const response = await fetch(`/api/lectures/${lectureId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('获取讲座信息失败:', response.status)
      return null
    }
    
    const result = await response.json()
    const lectureData = result.lecture
    
    if (!lectureData) {
      console.error('讲座数据不存在')
      return null
    }
    
    // 计算参与者数量（先获取基本信息，再获取实时参与者数量）
    let participantCount = 0
    let onlineParticipantCount = 0
    try {
      const participantResponse = await fetch(`/api/participants/count/${lectureId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (participantResponse.ok) {
        const participantResult = await participantResponse.json()
        console.log('getLectureById 获取参与者数据:', participantResult)
        participantCount = participantResult.total_participants || 0
        onlineParticipantCount = participantResult.online_participants || 0
        console.log('getLectureById 处理后数量:', { participantCount, onlineParticipantCount })
      }
    } catch (error) {
      console.warn('获取参与者数量失败，使用默认值:', error)
    }
    
    return {
      id: lectureData.id,
      title: lectureData.title,
      speaker: lectureData.name || '未知讲者',
      createdTime: new Date(lectureData.created_at), // 讲座创建时间
      participants: participantCount,
      onlineParticipants: onlineParticipantCount,
      status: getStatusText(lectureData.status),
      description: lectureData.description || ''
    }
  } catch (error) {
    console.error('获取讲座信息时发生错误:', error)
    return null
  }
}

// 辅助函数：将数据库状态转换为状态文本
const getStatusText = (status) => {
  switch (status) {
    case 0: return 'upcoming'  // 未开始
    case 1: return 'active'    // 进行中
    case 2: return 'ended'     // 已结束
    default: return 'unknown'
  }
}

// 监听路由变化，自动设置当前讲座
const updateCurrentLecture = async () => {
  let lectureId = null
  
  console.log('updateCurrentLecture 被调用，当前路由:', route.path)
  
  if (route.path.includes('/lecture/')) {
    lectureId = route.params.id
    console.log('从路由获取讲座ID:', lectureId)
  } else {
    lectureId = localStorage.getItem('currentLectureId') || sessionStorage.getItem('currentLectureId')
    console.log('从localStorage/sessionStorage获取讲座ID:', lectureId)
  }
  
  if (lectureId) {

    try {
      console.log('正在获取讲座信息，ID:', lectureId)
      const lecture = await getLectureById(lectureId)
      console.log('获取到的讲座信息:', lecture)
      
      if (lecture) {
        // 确保用户已加入讲座
        const joined = await ensureUserJoinedLecture(lectureId)
        console.log('用户加入讲座状态:', joined)
        
        currentLectureData.value = lecture
        localStorage.setItem('currentLectureId', lectureId)
        sessionStorage.setItem('currentLectureId', lectureId)
        console.log('已保存 currentLectureId 到 localStorage 和 sessionStorage')
      } else {
        currentLectureData.value = null
      }
    } catch (error) {
      console.error('加载讲座信息失败:', error)
      currentLectureData.value = null
    }
  } else {
    console.log('没有找到讲座ID，清空当前讲座数据')
    currentLectureData.value = null
  }
}

// 退出当前讲座
// 辅助：解析 JWT payload（安全）
function parseTokenPayload(token) {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch (e) {
  console.debug('parseTokenPayload failed', e)
  return null
  }
}

// 辅助：把低层错误转为用户友好消息
function buildUserMessageFromError(err) {
  if (!err) return '退出讲座失败'
  try {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return '无法连接到服务器，请检查：\n1. 后端服务是否已启动\n2. 网络连接是否正常\n3. 服务器地址是否正确'
    }
    if (err.name === 'AbortError' || (err.message && err.message.includes('timeout'))) {
      return '请求超时，请检查网络连接或稍后重试'
    }
    if (err.message && err.message.includes('网络')) return err.message
  } catch (e) {
    console.debug('buildUserMessageFromError inner error', e)
  }
  return `退出讲座失败: ${err.message || String(err)}`
}

const exitCurrentLecture = async () => {
  const currentLecture = getCurrentLecture()
  const userRole = getUserRole()

  if (!currentLecture || !userRole) return

  const token = sessionStorage.getItem('token')
  if (!token) return

  const payload = parseTokenPayload(token)
  const userId = payload?.id || payload?.userId || payload?.sub
  const userName = payload?.name || payload?.username || `${userRole}_${userId}`

  if (!navigator.onLine) {
    const msg = '网络连接已断开，请检查网络连接后重试'
    const continueAnyway = confirm(`${msg}\n\n是否要继续退出讲座？（将清除本地状态）`)
    if (continueAnyway) {
      const roleText = userRole === 'speaker' ? '讲师' : '听众'
      alert(`${roleText}已在本地退出讲座，但服务器状态可能未同步`)
    }
    return
  }

  // 将 API 调用提取到独立函数，降低主流程复杂度
  async function leaveLectureApi(lectureId, token) {
    const response = await fetch(`/api/participants/leave/${lectureId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      let serverMsg = `服务器错误 (${response.status})`
      try {
        const errJson = await response.json()
        if (errJson && errJson.error) serverMsg = errJson.error
      } catch (e) {
        console.debug('leaveLectureApi: failed to parse error response', e)
      }
      throw new Error(serverMsg)
    }
  }

  function handleLeaveFailure(err, userRole) {
    console.error('退出讲座时发生错误:', err)
    const message = buildUserMessageFromError(err)
    const continueAnyway = confirm(`${message}\n\n是否要继续退出讲座？（将清除本地状态）`)
    if (continueAnyway) {
      const roleText = userRole === 'speaker' ? '讲师' : '听众'
      alert(`${roleText}已在本地退出讲座，但服务器状态可能未同步`)
    }
    return continueAnyway
  }

  try {
    await leaveLectureApi(currentLecture.id, token)
    console.log(`用户 ${userId} (${userName}) 已退出讲座 ${currentLecture.id}`)
    return
  } catch (err) {
    const cont = handleLeaveFailure(err, userRole)
    if (cont) return
    throw err
  }
}

// 获取讲座状态文本
const getLectureStatusText = () => {
  const lecture = getCurrentLecture()

  if (!lecture) return ''
  
  switch (lecture.status) {
    case 'upcoming': return '即将开始'
    case 'active': return '进行中'
    case 'ended': return '已结束'
    default: return '未知状态'
  }
}

// 判断讲座是否已结束
const isLectureEnded = (lecture) => {
  if (!lecture) return false
  return lecture.status === 'ended'
}

// 判断讲座是否正在进行中
const isLectureActive = (lecture) => {
  if (!lecture) return false
  return lecture.status === 'active'
}

// 判断讲座是否即将开始
const isLectureUpcoming = (lecture) => {
  if (!lecture) return false
  return lecture.status === 'upcoming'
}

// 格式化讲座时间
const formatLectureTime = () => {
  const lecture = getCurrentLecture()
  if (!lecture) return ''
  
  const createdTime = lecture.createdTime
  
  const formatTime = (date) => {
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  
  return formatTime(createdTime)
}

// 开始定时刷新参与者数量
const startParticipantCountRefresh = () => {
  const userRole = getUserRole()
  const currentLecture = getCurrentLecture()
  
  if (!userRole || !currentLecture) {
    return
  }
  
  // 每15秒刷新一次参与者数量（改为更频繁，便于测试）
  participantCountTimer.value = setInterval(async () => {
    await refreshParticipantCount()
  }, 15000) // 15秒
}

// 停止定时刷新参与者数量
const stopParticipantCountRefresh = () => {
  if (participantCountTimer.value) {
    clearInterval(participantCountTimer.value)
    participantCountTimer.value = null
  }
}

// 刷新参与者数量
const refreshParticipantCount = async () => {
  const currentLecture = getCurrentLecture()
  if (!currentLecture) return
  
  try {
    const response = await fetch(`http://localhost:3001/api/participants/count/${currentLecture.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('刷新参与者数量数据:', result)
      // 更新当前讲座数据中的参与者数量
      if (currentLectureData.value) {
        currentLectureData.value.participants = result.total_participants
        currentLectureData.value.onlineParticipants = result.online_participants
        console.log('更新后的讲座数据:', currentLectureData.value)
      }
    }
  } catch (error) {
    console.warn('刷新参与者数量失败:', error)
  }
}

// 开始心跳
const startHeartbeat = () => {
  const userRole = getUserRole()
  const currentLecture = getCurrentLecture()
  
  console.log('startHeartbeat 被调用:', { userRole, currentLecture: !!currentLecture })
  
  if (!userRole || !currentLecture) {
    console.log('跳过心跳启动：', { userRole, currentLecture: !!currentLecture })
    return
  }
  
  // 立即发送一次心跳
  sendHeartbeat()
  
  // 每30秒发送一次心跳（改为更频繁，便于测试）
  heartbeatTimer.value = setInterval(async () => {
    await sendHeartbeat()
  }, 30000) // 30秒
  

  console.log('心跳定时器已启动')
}

// 停止心跳
const stopHeartbeat = () => {
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value)
    heartbeatTimer.value = null
  }
}

// 发送心跳
const sendHeartbeat = async () => {
  const currentLecture = getCurrentLecture()
  const token = sessionStorage.getItem('token')
  
  if (!currentLecture || !token) {
    console.log('心跳跳过：', { currentLecture: !!currentLecture, token: !!token })
    return
  }
  
  console.log('发送心跳到讲座:', currentLecture.id)
  
  try {
    const response = await fetch(`http://localhost:3001/api/participants/heartbeat/${currentLecture.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      console.log('心跳发送成功')
    } else {
      console.warn('心跳发送失败，状态码:', response.status)
    }
  } catch (error) {
    console.warn('发送心跳失败:', error)
  }
}

// 检查用户是否已加入讲座
const checkUserInLecture = async (lectureId) => {
  const token = sessionStorage.getItem('token')
  if (!token) return false
  
  try {
    const response = await fetch(`http://localhost:3001/api/participants/check/${lectureId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('用户讲座状态检查结果:', result)
      return result.isJoined
    }
    return false
  } catch (error) {
    console.warn('检查用户讲座状态失败:', error)
    return false
  }
}

// 确保用户加入讲座
const ensureUserJoinedLecture = async (lectureId) => {
  const isJoined = await checkUserInLecture(lectureId)
  
  if (!isJoined) {
    console.log('用户未加入讲座，尝试自动加入...')
    
    const token = sessionStorage.getItem('token')
    if (!token) return false
    
    try {
      const response = await fetch(`http://localhost:3001/api/participants/join/${lectureId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        console.log('用户已成功加入讲座')
        return true
      } else {
        console.warn('自动加入讲座失败，状态码:', response.status)
        return false
      }
    } catch (error) {
      console.warn('自动加入讲座失败:', error)
      return false
    }
  }
  
  console.log('用户已在讲座中')
  return true
}

// 重启定时器
const restartTimers = () => {
  // 停止现有定时器
  stopParticipantCountRefresh()
  stopHeartbeat()
  
  // 延迟重启，等待路由更新完成
  setTimeout(() => {
    startParticipantCountRefresh()
    startHeartbeat()
  }, 1000)
}

// 新增格式化时间方法
function formatLectureTimePanel(lecture) {
  // 支持mock和真实数据
  if (!lecture) return '无'
  // mock数据有startTime/endTime，真实数据只有created_at
  if (lecture.startTime && lecture.endTime) {
    const format = d => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    return `${format(lecture.startTime)} - ${format(lecture.endTime)}`
  }
  if (lecture.created_at) {
    // 尝试解析created_at
    try {
      const d = new Date(lecture.created_at)
      const mm = (d.getMonth()+1).toString().padStart(2,'0')
      const dd = d.getDate().toString().padStart(2,'0')
      const hh = d.getHours().toString().padStart(2,'0')
      const min = d.getMinutes().toString().padStart(2,'0')
      return `${mm}/${dd} ${hh}:${min}`
    } catch {
      return lecture.created_at
    }
  }
  return '无'
}
</script>

<style>
/* 全局重置和基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  background: #ffffff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  line-height: 1.6;
  color: #333;
}

/* 现代化头部导航 */
.app-header {
  background: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.brand-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #3eaf7c 0%, #667eea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
  margin-left: 0.5rem;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.settings-dropdown {
  position: relative;
}

.lecture-info-dropdown {
  position: relative;
}

.lecture-info-panel {
  position: absolute;
  top: 100%;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  min-width: 320px;
  z-index: 1001;
  overflow: hidden;
  margin-top: 0.5rem;
  animation: dropdownSlideIn 0.3s ease-out;
}

.lecture-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, rgba(62, 175, 124, 0.05) 0%, rgba(102, 126, 234, 0.05) 100%);
}

.lecture-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.lecture-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lecture-status.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.lecture-status.upcoming {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.lecture-status.ended {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
}

.lecture-details {
  padding: 1rem 1.5rem;
}

.lecture-actions {
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.leave-lecture-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.leave-lecture-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.leave-lecture-btn:active {
  transform: translateY(0);
}

.end-lecture-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.end-lecture-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.end-lecture-btn:active:not(:disabled) {
  transform: translateY(0);
}

.end-lecture-btn:disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1rem;
}

.btn-text {
  flex: 1;
  text-align: center;
}

.lecture-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.lecture-item:last-child {
  margin-bottom: 0;
}

.item-icon {
  font-size: 1rem;
  width: 1.2rem;
  text-align: center;
  margin-top: 0.1rem;
}

.item-label {
  font-weight: 600;
  color: #374151;
  min-width: 3rem;
}

.item-value {
  color: #6b7280;
  flex: 1;
  line-height: 1.4;
}

.online-indicator {
  color: #10b981;
  font-weight: 600;
  font-size: 0.9em;
}

.dropdown-arrow {
  font-size: 0.8rem;
  margin-left: 0.25rem;
  transition: transform 0.3s ease;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 1001;
  overflow: hidden;
  margin-top: 0.5rem;
  animation: dropdownSlideIn 0.3s ease-out;
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #374151;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background: rgba(62, 175, 124, 0.1);
  color: #3eaf7c;
}

.dropdown-item.danger {
  color: #ef4444;
}

.dropdown-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.dropdown-icon {
  font-size: 1rem;
  width: 1.2rem;
  text-align: center;
}

.dropdown-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0.5rem 0;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-role-badge {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.user-role-badge.speaker {
  background: linear-gradient(135deg, rgba(62, 175, 124, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%);
  color: #3eaf7c;
  border-color: rgba(62, 175, 124, 0.3);
}

.user-role-badge.listener {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(62, 175, 124, 0.1) 100%);
  color: #667eea;
  border-color: rgba(102, 126, 234, 0.3);
}

.user-role-badge.organizer {
  background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);
  color: #fff;
  border-color: #ff9800;
}

.user-role-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.nav-link:hover,
.nav-link.active {
  color: #3eaf7c;
  background: rgba(62, 175, 124, 0.1);
  transform: translateY(-1px);
}

.link-icon {
  font-size: 1.1rem;
}

/* 主要内容区域 */
.app-content {
  flex: 1;
  margin-top: 80px; /* 头部导航高度 */
  min-height: calc(100vh - 80px - 200px); /* 减去头部和页脚高度 */
  animation: fadeIn 0.6s ease-out;
}

.content-wrapper {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
}

main.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.no-component {
  border: 3px dashed #f87171;
  background: rgba(248, 113, 113, 0.04);
  padding: 2rem;
  text-align: center;
  color: #7f1d1d;
}

/* 简洁页脚 */
.app-footer {
  background: #222;
  color: #fff;
  text-align: center;
  padding: 1rem;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-container small {
  font-size: 0.9rem;
  color: #a0aec0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .header-container {
    padding: 1rem 1.5rem;
  }
  
  .brand-title {
    font-size: 1.8rem;
  }
  
  .brand-subtitle {
    display: none;
  }
  
  .footer-brand {
    grid-column: 1 / -1;
    margin-bottom: 1rem;
  }
}

@media (max-width: 768px) {
  .header-container {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .brand-section {
    gap: 0.75rem;
  }
  
  .brand-icon {
    font-size: 2rem;
  }
  
  .brand-title {
    font-size: 1.5rem;
  }
  
  .header-nav {
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }
  
  .nav-links {
    gap: 1rem;
    justify-content: center;
  }
  
  .dropdown-menu {
    right: -1rem;
    min-width: 180px;
  }
  
  .lecture-info-panel {
    right: -1rem;
    min-width: 280px;
  }
  
  .lecture-header {
    padding: 1rem;
  }
  
  .lecture-details {
    padding: 0.75rem 1rem;
  }
  
  .lecture-actions {
    padding: 0 1rem 1rem 1rem;
  }
  
  .leave-lecture-btn {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }
  
  .dropdown-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }
  
  .nav-link {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
  
  .user-info {
    justify-content: center;
  }
  
  .app-content {
    margin-top: 160px; /* 调整移动端头部高度 */
  }
  
  main.content-wrapper {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .brand-section {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
  
  .brand-title {
    font-size: 1.3rem;
  }
  
  .header-nav {
    gap: 0.8rem;
  }
  
  .nav-links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .dropdown-arrow {
    display: none;
  }
  
  .dropdown-menu {
    right: -2rem;
    min-width: 160px;
  }
  
  .lecture-info-panel {
    right: -2rem;
      min-width: 260px;
  }
  
  .lecture-title {
    font-size: 1rem;
  }
  
  .lecture-item {
    margin-bottom: 0.75rem;
  }
  
  .item-label {
    min-width: 2.5rem;
    font-size: 0.85rem;
  }
  
  .item-value {
    font-size: 0.85rem;
  }
  
  .dropdown-item {
    padding: 0.5rem 0.7rem;
    font-size: 0.8rem;
  }
  
  .leave-lecture-btn {
    padding: 0.5rem 0.7rem;
    font-size: 0.8rem;
  }

  .link-text {
    display: none;
  }  .nav-link {
    padding: 0.5rem;
    border-radius: 50%;
    min-width: 40px;
    justify-content: center;
  }
  
  .user-role-badge {
    font-size: 0.75rem;
    padding: 0.3rem 0.8rem;
  }
  
  .app-content {
    margin-top: 180px;
  }
}

/* 美化滚动条 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #3eaf7c 0%, #667eea 100%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #329c6b 0%, #5a6fd8 100%);
}

/* 页面加载动画 */
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

/* 链接和按钮的通用样式 */
a {
  color: #3eaf7c;
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: #329c6b;
}

/* 表单元素美化 */
input, textarea, select, button {
  font-family: inherit;
}

button {
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

/* 焦点样式优化 */
*:focus {
  outline: 2px solid #3eaf7c;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
