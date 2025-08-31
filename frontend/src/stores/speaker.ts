import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'

// Speaker domain store（讲者域状态管理）
// 责任：集中管理讲者页面的 UI 状态与与后端交互逻辑，页面只负责渲染和路由。
export const useSpeakerStore = defineStore('speaker', () => {
  // 列表数据
  const lectures = ref<any[]>([])

  // UI 状态
  const showCreate = ref(false)
  const showLectures = ref(false)

  // 新建讲座表单（直接在 store 中保存，组件用 v-model 绑定）
  const newLecture = ref({ title: '', desc: '', speaker: '' })

  const isLoading = ref(false)

  // 讲座相关的共享状态（供讲者子页面复用）
  const currentLecture = ref<any>(null)
  const loadingLecture = ref(false)
  const lectureStats = ref<any>(null)
  const loadingStats = ref(false)
  const comments = ref<any[]>([])
  const loadingComments = ref(false)

  function getAuthHeader() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || ''
    if (!token) return {}
    return { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` }
  }

  // 加载单个讲座基本信息
  async function fetchLecture(lectureId: string) {
    if (!lectureId) return null
    loadingLecture.value = true
    try {
      const res = await api.get(`/api/lectures/${lectureId}`)
      if (res.status === 200 && res.data) {
        currentLecture.value = res.data.lecture || res.data
        return currentLecture.value
      }
    } catch (e) {
      console.error('speakerStore.fetchLecture error', e)
    } finally {
      loadingLecture.value = false
    }
    return null
  }

  // 加载讲座统计信息（包含排行榜/总体统计）
  async function fetchLectureStats(lectureId: string) {
    if (!lectureId) return null
    loadingStats.value = true
    try {
      const res = await api.get(`/api/statistics/lecture/${lectureId}`)
      if (res.status === 200 && res.data) {
        lectureStats.value = res.data
        return lectureStats.value
      }
    } catch (e) {
      console.error('speakerStore.fetchLectureStats error', e)
    } finally {
      loadingStats.value = false
    }
    return null
  }

  // 加载讨论列表
  async function fetchComments(lectureId: string) {
    if (!lectureId) return []
    loadingComments.value = true
    try {
  const res = await api.get(`/api/discussion/lecture/${lectureId}/messages`)
      if (res.status === 200 && res.data && res.data.data && res.data.data.messages) {
        comments.value = res.data.data.messages.map((item: any) => ({
          id: item.id,
          userName: item.username,
          text: item.message,
          time: new Date(item.created_at),
          likeCount: item.like_count,
          isLikedByUser: item.isLikedByUser,
          isPinned: item.is_pinned,
          userId: item.user_id,
          userRole: item.user_role
        }))
        return comments.value
      }
      comments.value = []
    } catch (e) {
      console.error('speakerStore.fetchComments error', e)
      comments.value = []
    } finally {
      loadingComments.value = false
    }
    return comments.value
  }

  // 开始讲座
  async function startLecture(lectureId: string) {
    if (!lectureId) return null
    try {
  const res = await api.post(`/api/lectures/${lectureId}/start`, {})
      return res.data
    } catch (e) {
      console.error('speakerStore.startLecture error', e)
      throw e
    }
  }

  // 结束讲座
  async function endLecture(lectureId: string) {
    if (!lectureId) return null
    try {
  const res = await api.post(`/api/lectures/${lectureId}/end`, {})
      return res.data
    } catch (e) {
      console.error('speakerStore.endLecture error', e)
      throw e
    }
  }

  // 组合加载讲座详情与统计（页面可直接调用）
  async function loadLectureData(lectureId: string) {
    await Promise.all([
      fetchLecture(lectureId),
      fetchLectureStats(lectureId),
      fetchComments(lectureId)
    ])
  }

  // 获取讲者的讲座列表
  async function fetchLectures() {
    try {
      const token = sessionStorage.getItem('token')
      if (!token) return
      isLoading.value = true
      const res = await fetch('/api/lectures/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      lectures.value = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        desc: item.description,
        speaker: item.name || '',
        status: item.status || 0
      }))
    } catch (e) {
      console.error('fetchLectures error', e)
    } finally {
      isLoading.value = false
    }
  }

  // 切换讲座列表显示
  function toggleLectures() {
    showLectures.value = !showLectures.value
    if (showLectures.value && lectures.value.length === 0) {
      fetchLectures()
    }
  }

  // 新建讲座：返回新建成功的讲座 id（若成功）
  async function createLecture() {
    if (!newLecture.value.title || !newLecture.value.desc || !newLecture.value.speaker) {
      throw new Error('表单未填全')
    }
    const token = sessionStorage.getItem('token')
    if (!token) throw new Error('未登录')
    try {
      isLoading.value = true
      const res = await fetch('/api/lectures/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newLecture.value.title,
          description: newLecture.value.desc,
          name: newLecture.value.speaker
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.lecture) {
        // 成功后刷新列表
        await fetchLectures()
        // 重置表单
        newLecture.value = { title: '', desc: '', speaker: '' }
        return data.lecture.id
      }
      throw new Error(data.error || '创建失败')
    } finally {
      isLoading.value = false
    }
  }

  // 删除讲座
  async function deleteLecture(id: number) {
    const token = sessionStorage.getItem('token')
    if (!token) throw new Error('未登录')
    const res = await fetch(`/api/lectures/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      await fetchLectures()
      return true
    }
    throw new Error(data.error || '删除失败')
  }

  // 重新开始讲座
  async function restartLecture(id: number) {
    const token = sessionStorage.getItem('token')
    if (!token) throw new Error('未登录')
    const res = await fetch(`/api/lectures/${id}/restart`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      await fetchLectures()
      return true
    }
    throw new Error(data.error || '重新开始失败')
  }

  function setShowCreate(v: boolean) {
    showCreate.value = v
  }

  return {
    lectures,
    showCreate,
    showLectures,
    newLecture,
    isLoading,
    fetchLectures,
    toggleLectures,
    createLecture,
    deleteLecture,
    restartLecture,
    setShowCreate
  }
})
