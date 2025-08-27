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
  { path: '/login', component: Login },
  { path: '/register', component: Register },

  { path: '/listener', redirect: '/listener/home' },
  { path: '/listener/home', component: ListenerHome },
  {
    path: '/listener/lecture/:id',
    component: LectureLayout,
    children: [
      { path: 'quiz', component: QuizPage },
      { path: 'score', component: ScorePage },
      { path: 'discussion', component: DiscussionPage },
      { path: 'feedback', component: FeedbackPage }
    ]
  },
  { path: '/speaker', component: SpeakerIndex },
  { path: '/speaker', redirect: '/speaker/index' },
  { path: '/speaker/index', component: SpeakerIndex },
  { path: '/speaker', redirect: '/speaker/home' },
  { path: '/speaker/home', component: SpeakerHome },
  {
    path: '/speaker/lecture/:id',
    component: SpeakerLectureLayout,
    children: [
      { path: '', redirect: 'upload' },
      { path: 'upload', component: SpeakerUpload },
      { path: 'stats', component: SpeakerStats },
      { path: 'discussion', component: SpeakerDiscussion },
      { path: 'feedback', component: SpeakerFeedback }
    ]
  },

  // organizer 路由
  { path: '/organizer', redirect: '/organizer/home' },
  { path: '/organizer/home', component: OrganizerHome },
  {
    path: '/organizer/lectures/:id',
    component: OrganizerLectureLayout,
    children: [
      { path: '', redirect: 'score' },
      { path: 'score', name: 'OrganizerScorePage', component: OrganizerScorePage },
      { path: 'discussion', component: OrganizerDiscussionPage },
      { path: 'feedback', component: OrganizerFeedbackPage }
    ]
  },
  // profile 路由
  { path: '/profile/edit', component: EditProfile },
  { path: '/profile/change-password', component: ChangePassword },
  { path: '/profile/settings', component: AccountSettings },
];

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 防止已登录用户访问登录页，未登录用户访问需要认证的页面
router.beforeEach((to, from, next) => {
  // 使用 Pinia 管理的认证状态
  // 因为 router.beforeEach 在应用启动时就会执行，使用直接读取 sessionStorage 作为兜底方案
  // 若 Pinia 可用，prefer 使用 store
  let token = sessionStorage.getItem('token')
  try {
    // 尝试从 store（已挂载）读取
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    
    const auth = useAuthStore()
    if (auth && auth.token) {
      token = auth.token
    }
  } catch (e) {
    // ignore - 在某些启动阶段 require 可能失败，继续使用 sessionStorage
  }

  const isLoggedIn = !!token
  const protectedPaths = ['/speaker', '/listener', '/organizer']
  const isProtectedPath = protectedPaths.some(path => to.path.startsWith(path))

  if (to.path === '/' && isLoggedIn) {
    try {
      const payload = JSON.parse(atob((token as string).split('.')[1]))
      const userRole = payload.role

      if (userRole === 'speaker') {
        next('/speaker/home')
      } else if (userRole === 'listener') {
        next('/listener/home')
      } else {
        next('/login')
      }
    } catch (e) {
      sessionStorage.removeItem('token')
      next('/login')
    }
    return
  }

  if (isLoggedIn && (to.path === '/login' || to.path === '/register')) {
    try {
      const payload = JSON.parse(atob((token as string).split('.')[1]))
      const userRole = payload.role

      if (userRole === 'speaker') {
        next('/speaker/home')
      } else if (userRole === 'listener') {
        next('/listener/home')
      } else {
        next('/login')
      }
    } catch (e) {
      sessionStorage.removeItem('token')
      next('/login')
    }
  } else if (!isLoggedIn && isProtectedPath) {
    next('/login')
  } else if (isLoggedIn && isProtectedPath) {
    try {
      const payload = JSON.parse(atob((token as string).split('.')[1]))
      const userRole = payload.role

      if (to.path.startsWith('/speaker') && userRole !== 'speaker') {
        next('/listener/home')
      } else if (to.path.startsWith('/listener') && userRole !== 'listener') {
        next('/speaker/home')
      } else if (to.path.startsWith('/organizer') && userRole !== 'organizer') {
        if (userRole === 'speaker') {
          next('/speaker/home')
        } else if (userRole === 'listener') {
          next('/listener/home')
        } else {
          next('/login')
        }
      } else {
        next()
      }
    } catch (e) {
      sessionStorage.removeItem('token')
      next('/login')
    }
  } else {
    next()
  }
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')