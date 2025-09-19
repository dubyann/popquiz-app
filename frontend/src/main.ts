import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/auth'

// 页面组件导入
import Login from './main/resources/pages/Login.vue'
import Register from './main/resources/pages/Register.vue'
import ListenerHome from './main/resources/pages/listener/ListenerHome.vue'
import LectureLayout from './main/resources/pages/listener/LectureLayout.vue'
import QuizPage from './main/resources/pages/listener/QuizPage.vue'
import ScorePage from './main/resources/pages/listener/ScorePage.vue'
import DiscussionPage from './main/resources/pages/listener/DiscussionPage.vue'
import FeedbackPage from './main/resources/pages/listener/FeedbackPage.vue'
import SpeakerIndex from './main/resources/pages/speaker/index.vue'
import OrganizerHome from './main/resources/pages/organizer/OrganizerHome.vue'
import OrganizerLectureLayout from './main/resources/pages/organizer/LectureLayout.vue'
import OrganizerScorePage from './main/resources/pages/organizer/ScorePage.vue'
import OrganizerDiscussionPage from './main/resources/pages/organizer/DiscussionPage.vue'
import OrganizerFeedbackPage from './main/resources/pages/organizer/FeedbackPage.vue'
import SpeakerHome from './main/resources/pages/speaker/SpeakerHome.vue'
import SpeakerLectureLayout from './main/resources/pages/speaker/LectureLayout.vue'
import SpeakerUpload from './main/resources/pages/speaker/Upload.vue'
import SpeakerStats from './main/resources/pages/speaker/Stats.vue'
import SpeakerDiscussion from './main/resources/pages/speaker/Discussion.vue'
import SpeakerFeedback from './main/resources/pages/speaker/Feedback.vue'
import EditProfile from './main/resources/pages/profile/EditProfile.vue'
import ChangePassword from './main/resources/pages/profile/ChangePassword.vue'
import AccountSettings from './main/resources/pages/profile/AccountSettings.vue'

// 路由配置
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },

  // Listener 模块
  {
    path: '/listener',
    redirect: '/listener/home',
    children: [
      { path: 'home', name: '', component: ListenerHome },
      {
        path: 'lecture/:id',
        component: LectureLayout,
        children: [
          { path: 'quiz', name: 'listener-quiz', component: QuizPage },
          { path: 'score', name: 'listener-score', component: ScorePage },
          { path: 'discussion', name: 'listener-discussion', component: DiscussionPage },
          { path: 'feedback', name: 'listener-feedback', component: FeedbackPage }
        ]
      }
    ]
  },

  // Speaker 模块
  {
    path: '/speaker',
    redirect: '/speaker/home',
    children: [
      { path: 'index', name: 'speaker-index', component: SpeakerIndex },
      { path: 'home', name: 'speaker-home', component: SpeakerHome },
      {
        path: 'lecture/:id',
        component: SpeakerLectureLayout,
        children: [
          { path: '', redirect: 'upload' },
          { path: 'upload', name: 'speaker-upload', component: SpeakerUpload },
          { path: 'stats', name: 'speaker-stats', component: SpeakerStats },
          { path: 'discussion', name: 'speaker-discussion', component: SpeakerDiscussion },
          { path: 'feedback', name: 'speaker-feedback', component: SpeakerFeedback }
        ]
      }
    ]
  },

  // Organizer 模块
  {
    path: '/organizer',
    redirect: '/organizer/home',
    children: [
      { path: 'home', name: 'organizer-home', component: OrganizerHome },
      {
        path: 'lectures/:id',
        component: OrganizerLectureLayout,
        children: [
          { path: '', redirect: 'score' },
          { path: 'score', name: 'organizer-score', component: OrganizerScorePage },
          { path: 'discussion', name: 'organizer-discussion', component: OrganizerDiscussionPage },
          { path: 'feedback', name: 'organizer-feedback', component: OrganizerFeedbackPage }
        ]
      }
    ]
  },

  // Profile 模块
  { path: '/profile/edit', name: 'profile-edit', component: EditProfile },
  { path: '/profile/change-password', name: 'profile-change-password', component: ChangePassword },
  { path: '/profile/settings', name: 'profile-settings', component: AccountSettings },
]

const router = createRouter({
  history: createWebHistory(),
  routes: routes
})

// 路由守卫 - 防止已登录用户访问登录页，未登录用户访问需要认证的页面
// 抽取 helper 函数以降低复杂度并便于测试
function getToken(): string | null {
  try {
  // 延迟获取 auth store，避免在 Pinia 尚未安装时抛错
  let auth: any = null
  try { 
    auth = useAuthStore() 
  } catch (e) { 
    console.debug('AuthStore 还没有准备好', e)
  }
  if (auth && auth.token) return auth.token as string
  } catch (e) {
    console.error('getToken 异常', e)
  }
  return sessionStorage.getItem('token')
}

function roleRedirectPath(role: string | undefined | null) {
  if (!role) return '/login'
  if (role === 'speaker') return '/speaker/home'
  if (role === 'listener') return '/listener/home'
  if (role === 'organizer') return '/organizer/home'
  return '/login'
}

const protectedPaths = ['/speaker', '/listener', '/organizer']

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const devEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : null
  const devBypass = Boolean(devEnv && devEnv.DEV && to.query && to.query.debug === '1')

  const token = getToken()

  console.debug('[ROUTE-GUARD]', { to: to.path, devBypass, tokenPresent: !!token, authStore: authStore.isLoggedIn, role: authStore.role })

  if (devBypass) {
    console.info('[ROUTE-GUARD] DEV BYPASS enabled (to=' + to.path + ')')
    next()
    return
  }

  const isProtectedPath = protectedPaths.some(path => to.path.startsWith(path))

  // 根路径跳转
  if (to.path === '/') {
    if (authStore.isLoggedIn && token) {
      next(roleRedirectPath(authStore.role))
    } else {
      sessionStorage.removeItem('token')
      next('/login')
    }
    return
  }

  // 已登录用户访问登录/注册页 -> 重定向到角色首页
  if (authStore.isLoggedIn && (to.path === '/login' || to.path === '/register')) {
    if (authStore.role) next(roleRedirectPath(authStore.role))
    else {
      sessionStorage.removeItem('token')
      next('/login')
    }
    return
  }

  // 未登录访问受保护页面
  if (!authStore.isLoggedIn && isProtectedPath) {
    next('/login')
    return
  }

  // 已登录访问受保护页面，检查角色是否匹配
  if (authStore.isLoggedIn && isProtectedPath) {
    if (!token) {
      sessionStorage.removeItem('token')
      next('/login')
      return
    }

    if (to.path.startsWith('/speaker') && authStore.role !== 'speaker') {
      next(roleRedirectPath(authStore.role))
      return
    }
    if (to.path.startsWith('/listener') && authStore.role !== 'listener') {
      next(roleRedirectPath(authStore.role))
      return
    }
    if (to.path.startsWith('/organizer') && authStore.role !== 'organizer') {
      next(roleRedirectPath(authStore.role))
      return
    }
  }

  next()
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')