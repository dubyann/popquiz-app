import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useListenerStore = defineStore('listener', () => {
  // 我的讲座列表
  const myLectures = ref<any[]>([])
  const isJoining = ref(false)
  // 当前正在查看或预加载的讲座详情
  const lectureDetail = ref<any>(null)
  // 已经 join 的讲座 id 集合，用于避免重复 join
  const joinedLectures = ref<Set<string>>(new Set())
  // 布局/页面层的模态状态：加入讲座模态、输入的讲座ID 以及消息提示（集中管理）
  const showCreate = ref(false)
  const modalLectureId = ref<string>('')
  const message = ref({ show: false, type: 'success' as 'success' | 'error', text: '' })
  // 页面级 UI：是否展示我的讲座列表（迁移自 ListenerHome）
  const showLectures = ref(false)

  function setShowCreate(v: boolean) {
    showCreate.value = v
  }

  function setModalLectureId(id: string) {
    modalLectureId.value = id
  }

  function setShowLectures(v: boolean) {
    showLectures.value = v
  }

  // 在 store 里统一显示消息（组件可以直接调用），内部会自动隐藏
  function showMessage(text: string, type: 'success' | 'error' = 'success') {
    message.value = { show: true, type, text }
    // 避免 NodeJS.Timeout 类型问题，定时器返回 number in browsers
    const t = window.setTimeout(() => {
      message.value.show = false
    }, 3000)
    return t
  }

  // 讨论区
  const comments = ref<any[]>([])
  const discussionLoading = ref(false)

  // 反馈
  const feedbackTypes = ref<any[]>([])
  const feedbackHistory = ref<any[]>([])

  // 答题/题目（部分页面会使用）
  const availableQuestions = ref<any[]>([])
  const userAnswers = ref<Map<number, any>>(new Map())

  // ---- Quiz helpers start ----
  // 获取已发布的题目并追加到 availableQuestions
  async function fetchQuizPublished(lectureId: string) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return null
      const res = await axios.get(`/api/quiz/lecture/${lectureId}/published`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 200 && res.data && res.data.data) {
        const quizzes = res.data.data.quizzes || []
        const publishedQuizzes = quizzes.filter((q: any) => q.published)
        const existingIds = new Set(availableQuestions.value.map((q: any) => q.id))
        const newQuizzes = publishedQuizzes.filter((q: any) => !existingIds.has(q.id))
        if (newQuizzes.length > 0) {
          availableQuestions.value = [...availableQuestions.value, ...newQuizzes]
          return { added: newQuizzes.length }
        }
        return { added: 0 }
      }
      return null
    } catch (e) {
      console.error('fetchQuizPublished error', e)
      return null
    }
  }

  // 获取当前用户的答题记录（尝试多个端点兼容）
  async function fetchMyAnswers(lectureId: string) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return null
      let res: any = null
      try {
        res = await axios.get(`/api/quiz/lecture/${lectureId}/my-answers`, { headers: { Authorization: `Bearer ${token}` } })
      } catch (e1) {
        try {
          res = await axios.get(`/api/answers/lecture/${lectureId}/my-answers`, { headers: { Authorization: `Bearer ${token}` } })
        } catch (e2) {
          console.error('both quiz/my-answers endpoints failed', e1, e2)
          return null
        }
      }

      if (res && res.status === 200 && res.data && res.data.data) {
        const answers = res.data.data.answers || res.data.data || []
        const map = new Map<number, any>()
        for (const a of answers) {
          const qid = a.question_id ?? a.id ?? null
          if (!qid) continue
          map.set(qid, {
            questionId: qid,
            userAnswer: a.answer || a.user_answer || '',
            correctAnswer: a.correct_answer || a.correctOption || '',
            isCorrect: a.is_correct === true || (a.is_correct === 1),
            answeredAt: a.answered_at ? new Date(a.answered_at) : new Date()
          })
        }
        userAnswers.value = map
        return map
      }
      return null
    } catch (e) {
      console.error('fetchMyAnswers error', e)
      return null
    }
  }

  // 提交答案并更新本地 userAnswers
  async function submitAnswer(questionId: number, payload: { answer: string, lectureId?: string }) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) throw new Error('not authenticated')
      const res = await axios.post(`/api/quiz/${questionId}/answer`, { answer: payload.answer, lectureId: payload.lectureId }, { headers: { Authorization: `Bearer ${token}` } })
      if (res && res.status === 200 && res.data) {
        const data = res.data
        // 更新本地 map
        const isCorrect = data.correct === true || data.isCorrect === true || data.is_correct === 1
        userAnswers.value.set(Number(questionId), {
          questionId: Number(questionId),
          userAnswer: payload.answer,
          correctAnswer: data.correctAnswer || data.correct || data.correct_answer || '',
          isCorrect,
          answeredAt: new Date()
        })
        return res.data
      }
      return null
    } catch (e) {
      console.error('submitAnswer error', e)
      throw e
    }
  }

  // ---- Quiz helpers end ----

  async function fetchMyLectures() {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return
      const res = await axios.get('/api/participants/my-lectures', { headers: { Authorization: `Bearer ${token}` } })
      // axios 返回的响应在 res.status 中；后端可能把实际数据放在 res.data
      if (res.status === 200 && res.data) {
        myLectures.value = res.data || []
      }
    } catch (e) {
      console.error('fetchMyLectures error', e)
    }
  }

  async function joinLecture(lectureId: string) {
    if (!lectureId) throw new Error('lectureId required')
    try {
      isJoining.value = true
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) throw new Error('not authenticated')
      const res = await axios.post(`/api/participants/join/${lectureId}`, {}, { headers: { Authorization: `Bearer ${token}` } })
      // 如果 join 成功，记录到 joinedLectures，避免重复 join
      try {
        joinedLectures.value.add(String(lectureId))
      } catch (e) {
        // ignore if Set operations fail for any reason
      }
      return res.data
    } finally {
      isJoining.value = false
    }
  }

  async function rejoinLecture(lectureId: string) {
    return joinLecture(lectureId)
  }

  // 预加载单个讲座详情（用于布局或页面预览）
  async function fetchLecture(lectureId: string) {
    if (!lectureId) return null
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return null
      const res = await axios.get(`/api/lectures/${lectureId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res && res.status === 200 && res.data) {
        lectureDetail.value = res.data.data || res.data || null
        return lectureDetail.value
      }
      lectureDetail.value = null
      return null
    } catch (e) {
      console.error('fetchLecture error', e)
      lectureDetail.value = null
      return null
    }
  }

  // 讨论相关
  async function loadDiscussionMessages(lectureId: string) {
    discussionLoading.value = true
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return
      const res = await axios.get(`/api/discussion/lecture/${lectureId}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.data && (res.data.success || res.status === 200)) {
        comments.value = (res.data.data && res.data.data.messages) || res.data.messages || []
      } else {
        comments.value = []
      }
    } catch (e) {
      console.error('loadDiscussionMessages error', e)
      comments.value = []
    } finally {
      discussionLoading.value = false
    }
  }

  async function submitComment(lectureId: string, message: string) {
    if (!message || !message.trim()) return null
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) throw new Error('not authenticated')
      const res = await axios.post(`/api/discussion/lecture/${lectureId}/message`, { message: message.trim() }, { headers: { Authorization: `Bearer ${token}` } })
      // 刷新列表
      await loadDiscussionMessages(lectureId)
      return res.data
    } catch (e) {
      console.error('submitComment error', e)
      throw e
    }
  }

  // 点赞指定消息（messageId）并刷新讨论列表
  async function likeComment(messageId: number, lectureId?: string) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return null
      const res = await axios.post(`/api/discussion/message/${messageId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } })
      // 如果传入 lectureId，则刷新对应讲座的讨论列表
      if (lectureId) await loadDiscussionMessages(lectureId)
      return res.data
    } catch (e) {
      console.error('likeComment error', e)
      return null
    }
  }

  // 对指定消息置顶（仅讲座内接口）并刷新列表
  async function pinMessage(lectureId: string, messageId: number) {
    try {
      if (!lectureId) return null
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return null
      const res = await axios.post(`/api/discussion/lecture/${lectureId}/message/${messageId}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } })
      await loadDiscussionMessages(lectureId)
      return res.data
    } catch (e) {
      console.error('pinMessage error', e)
      return null
    }
  }

  // 删除指定消息（仅自己可删）并刷新列表
  async function deleteMessage(lectureId: string, messageId: number) {
    try {
      if (!lectureId) return null
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return null
      const res = await axios.delete(`/api/discussion/lecture/${lectureId}/message/${messageId}`, { headers: { Authorization: `Bearer ${token}` } })
      await loadDiscussionMessages(lectureId)
      return res.data
    } catch (e) {
      console.error('deleteMessage error', e)
      return null
    }
  }

  // 反馈相关
  async function loadFeedbackTypes() {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return
      const res = await axios.get('/api/feedback/types', { headers: { Authorization: `Bearer ${token}` } })
      if (res.data && res.data.success) {
        feedbackTypes.value = res.data.data.feedbackTypes || []
      }
    } catch (e) {
      console.error('loadFeedbackTypes error', e)
      feedbackTypes.value = []
    }
  }

  async function submitFeedback(lectureId: string, payload: any) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) throw new Error('not authenticated')
      const res = await axios.post(`/api/feedback/lecture/${lectureId}`, payload, { headers: { Authorization: `Bearer ${token}` } })
      return res.data
    } catch (e) {
      console.error('submitFeedback error', e)
      throw e
    }
  }

  async function loadFeedbackHistory(lectureId: string) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return
      const res = await axios.get(`/api/feedback/lecture/${lectureId}/my-history`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.data && res.data.success) {
        feedbackHistory.value = res.data.data.history || []
      }
    } catch (e) {
      console.error('loadFeedbackHistory error', e)
      feedbackHistory.value = []
    }
  }

  // ---- Score / statistics helpers ----
  const lectureStats = ref<any>({})
  const groupStats = ref<any[]>([])
  const leaderboard = ref<any[]>([])
  const myAnswers = ref<any[]>([])
  const myStats = ref<any>({})
  const scoreLoading = ref(false)

  // 加载讲座统计、排行榜和当前用户答题数据，封装错误处理
  async function loadScoreData(lectureId: string) {
    scoreLoading.value = true
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) throw new Error('not authenticated')

      const headers = { Authorization: `Bearer ${token}` }
      const statsUrl = `/api/answers/lecture/${lectureId}/stats`
      const leaderboardUrl = `/api/answers/lecture/${lectureId}/leaderboard?limit=100`
      const myAnswersUrl = `/api/answers/lecture/${lectureId}/my-answers`

      const [statsRes, leaderboardRes, myAnswersRes] = await Promise.all([
        axios.get(statsUrl, { headers }).catch(e => ({ error: e })),
        axios.get(leaderboardUrl, { headers }).catch(e => ({ error: e })),
        axios.get(myAnswersUrl, { headers }).catch(e => ({ error: e }))
      ])

      if (statsRes && !('error' in statsRes) && statsRes.data && statsRes.data.success) {
        lectureStats.value = statsRes.data.data.lectureStats || {}
        groupStats.value = statsRes.data.data.groupStats || []
      } else {
        lectureStats.value = {}
        groupStats.value = []
      }

      if (leaderboardRes && !('error' in leaderboardRes) && leaderboardRes.data && leaderboardRes.data.success) {
        leaderboard.value = leaderboardRes.data.data || []
      } else {
        leaderboard.value = []
      }

      if (myAnswersRes && !('error' in myAnswersRes) && myAnswersRes.data && myAnswersRes.data.success) {
        myAnswers.value = myAnswersRes.data.data.answers || []
        myStats.value = myAnswersRes.data.data.stats || {}
      } else {
        myAnswers.value = []
        myStats.value = {}
      }

      return { success: true }
    } catch (e) {
      console.error('loadScoreData error', e)
      lectureStats.value = {}
      groupStats.value = []
      leaderboard.value = []
      myAnswers.value = []
      myStats.value = {}
      throw e
    } finally {
      scoreLoading.value = false
    }
  }

  return {
    myLectures,
    isJoining,
    fetchMyLectures,
    joinLecture,
    rejoinLecture,

  // 讲座详情 / joined set
  lectureDetail,
  joinedLectures,
  fetchLecture,
  // modal / ui
  showCreate,
  modalLectureId,
  setShowCreate,
  setModalLectureId,
  message,
  showMessage,
  showLectures,
  setShowLectures,

    // discussion
    comments,
    discussionLoading,
    loadDiscussionMessages,
    submitComment,
  likeComment,
  pinMessage,
  deleteMessage,

    // feedback
    feedbackTypes,
    feedbackHistory,
    loadFeedbackTypes,
    submitFeedback,
    loadFeedbackHistory,

  // quiz helpers (lightweight)
  availableQuestions,
  userAnswers,
  // 导出 quiz 相关方法，供组件调用（fetchQuizPublished / fetchMyAnswers / submitAnswer）
  fetchQuizPublished,
  fetchMyAnswers,
  submitAnswer,
  // score / statistics
  lectureStats,
  groupStats,
  leaderboard,
  myAnswers,
  myStats,
  scoreLoading,
  loadScoreData
  }
})
