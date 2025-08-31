import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'
import { useNotificationsStore } from './notifications'

export const useParticipantStore = defineStore('participant', () => {
  const leaving = ref(false)
  const notifications = useNotificationsStore()

  async function sendLeaveRequest(lectureId: string, token: string) {
    // use api instance which injects Authorization header
    return api.post(`/participants/leave/${lectureId}`, {}, { timeout: 10000 })
  }

  async function exitCurrentLecture(currentLecture: any, userRole: string) {
    if (!currentLecture || !userRole) return false
    if (leaving.value) return false
    leaving.value = true
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token')
      if (!token) throw new Error('未找到认证令牌')

      await sendLeaveRequest(currentLecture.id, token)
      notifications.push('已成功退出讲座', 'success')
      return true
    } catch (err) {
      const message = err?.message || '退出讲座失败'
      notifications.push(message, 'error')
      // ask user via notification fallback: also return false so caller can decide
      return false
    } finally {
      leaving.value = false
    }
  }

  return { leaving, exitCurrentLecture }
})
