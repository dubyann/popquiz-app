import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'

export const useOrganizerStore = defineStore('organizer', () => {
  const lectures = ref<any[]>([])
  const users = ref<any[]>([])
  // 讨论区状态
  const comments = ref<any[]>([])
  const commentsLoading = ref(false)

  async function fetchLectures() {
    try {
  const res = await api.get('/api/lectures')
      lectures.value = res.data
    } catch (e) {
      console.error('organizer.fetchLectures error', e)
      lectures.value = []
    }
  }

  async function fetchUsers() {
    try {
  const res = await api.get('/api/users')
      users.value = res.data
    } catch (e) {
      console.error('organizer.fetchUsers error', e)
      users.value = []
    }
  }

  // ========== discussion actions ==========
  async function fetchComments(lectureId: any) {
    commentsLoading.value = true
    try {
  const res = await api.get(`/api/discussion/lecture/${lectureId}/messages`)
      if (res.data && res.data.success && res.data.data && res.data.data.messages) {
        comments.value = res.data.data.messages.map((item: any) => ({ ...item, user_id: item.user_id }))
      } else {
        comments.value = []
      }
    } catch (e) {
      comments.value = []
    }
    commentsLoading.value = false
  }

  async function addComment(lectureId: any, message: string, messageType = 'text') {
    try {
  await api.post(`/api/discussion/lecture/${lectureId}/message`, {
        message,
        messageType
      })
      await fetchComments(lectureId)
    } catch (e) {
      console.error('organizer.addComment error', e)
    }
  }

  async function sendReply(lectureId: any, parentId: any, message: string) {
    try {
  await api.post(`/api/discussion/lecture/${lectureId}/message`, {
        message,
        messageType: 'text',
        parentId
      })
      await fetchComments(lectureId)
    } catch (e) {
      console.error('organizer.sendReply error', e)
    }
  }

  async function toggleLike(lectureId: any, commentId: any) {
    try {
    // like endpoint in some places is /api/discussion/message/:id/like
  await api.post(`/api/discussion/message/${commentId}/like`, {})
      await fetchComments(lectureId)
    } catch (e) {
      console.error('organizer.toggleLike error', e)
    }
  }

  async function togglePin(lectureId: any, commentId: any) {
    try {
  await api.post(`/api/discussion/lecture/${lectureId}/message/${commentId}/pin`, {})
      await fetchComments(lectureId)
    } catch (e) {
      console.error('organizer.togglePin error', e)
    }
  }

  async function deleteComment(lectureId: any, commentId: any) {
    try {
  await api.delete(`/api/discussion/lecture/${lectureId}/message/${commentId}`)
      await fetchComments(lectureId)
    } catch (e) {
      console.error('organizer.deleteComment error', e)
    }
  }

  // ========== feedback actions ==========
  const feedbacks = ref<any[]>([])
  const stats = ref<any[]>([])
  const totalCount = ref(0)
  const statsSummary = ref({ total: 0, positive: 0, average: 0 })

  async function fetchStats(lectureId: any) {
    try {
  const res = await api.get(`/api/feedback/lecture/${lectureId}/stats`)
      if (res.data && res.data.success && res.data.data && res.data.data.stats) {
        stats.value = res.data.data.stats
        totalCount.value = res.data.data.totalCount || 0
        const statArr = res.data.data.stats || []
        const total = res.data.data.totalCount || 0
        const positive = statArr.find((s: any) => s.feedback_type === 'good')?.count || 0
        const average = total > 0 ? parseFloat((positive * 5 / total).toFixed(1)) : 0
        statsSummary.value = { total, positive, average }
      } else {
        stats.value = []
        totalCount.value = 0
        statsSummary.value = { total: 0, positive: 0, average: 0 }
      }
    } catch (e) {
      stats.value = []
      totalCount.value = 0
      statsSummary.value = { total: 0, positive: 0, average: 0 }
    }
  }

  async function fetchFeedbacks(lectureId: any) {
    try {
      const res = await api.get(`/api/feedback/lecture/${lectureId}/all`)
      if (res.data && res.data.success && res.data.data && res.data.data.feedbacks) {
        feedbacks.value = res.data.data.feedbacks
      } else {
        feedbacks.value = []
      }
    } catch (e) {
      feedbacks.value = []
    }
  }

  // ========== scores (for ScorePage) ==========
  const scores = ref<any[]>([])
  async function fetchScores(lectureId: any) {
    try {
      // Assumption: backend endpoint exists at /api/lectures/:id/scores
      const res = await api.get(`/api/lectures/${lectureId}/scores`)
      scores.value = res.data && res.data.data ? res.data.data : (res.data || [])
    } catch (e) {
      console.error('organizer.fetchScores error', e)
      scores.value = []
    }
  }

  return {
    lectures,
    users,
    fetchLectures,
    fetchUsers,
    // discussion exports
    comments,
    commentsLoading,
    fetchComments,
    addComment,
    sendReply,
    toggleLike,
    togglePin,
    deleteComment
  ,
  // feedback exports
  feedbacks,
  stats,
  totalCount,
  statsSummary,
  fetchStats,
  fetchFeedbacks
  ,
  // scores
  scores,
  fetchScores
  }
})
