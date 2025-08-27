<template>
  <div class="quiz-wrapper">
    <div class="page-header">
      <div class="title-icon animate-bounce">📝</div>
      <h2 class="quiz-title animate-fade-in">答题区域</h2>
      <p class="subtitle animate-fade-in-delay">参与互动，检验学习成果</p>
      
      <!-- 题目统计信息 -->
      <div v-if="quizGroups.length > 0" class="quiz-stats">
        <div class="stats-item">
          <span class="stats-label">题目组数:</span>
          <span class="stats-value">{{ quizGroups.length }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">总题目数:</span>
          <span class="stats-value">{{ totalQuestions }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">已完成:</span>
          <span class="stats-value">{{ completedQuestions }}</span>
        </div>
      </div>
    </div>

    <!-- 讲座已结束提示 -->
    <div v-if="isLectureEnded" class="lecture-ended-notice">
      <div class="notice-icon">⏰</div>
      <h3>讲座已结束</h3>
      <p>本次讲座已结束，您无法继续答题。请前往成绩页面查看您的答题情况，或在反馈页面提交您的意见。</p>
      <div class="notice-actions">
        <button @click="router.push(`/listener/lecture/${lectureId}/score`)" class="action-btn primary">
          查看成绩
        </button>
        <button @click="router.push(`/listener/lecture/${lectureId}/feedback`)" class="action-btn secondary">
          提交反馈
        </button>
      </div>
    </div>

    <!-- 讲座未开始提示 -->
    <div v-else-if="isLectureUpcoming" class="lecture-upcoming-notice">
      <div class="notice-icon">⏳</div>
      <h3>讲座尚未开始</h3>
      <p>讲座还未开始，请等待讲者开始讲座后再进行答题。</p>
    </div>

    <!-- 正常答题界面 -->
    <div v-else>
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载题目，请稍候...</p>
      </div>
      
      <!-- 无题目状态 -->
      <div v-else-if="availableQuestions.length === 0" class="no-quiz-state">
        <div class="no-quiz-icon">📭</div>
        <h3>暂无可答题目</h3>
        <p>讲师还未发布题目，请耐心等待...</p>
      </div>
      
      <!-- 单题目显示模式 -->
      <div v-else class="quiz-content">
        <div class="question-card">
          <!-- 题目进度 -->
          <div class="question-header">
            <div class="question-number">
              题目 {{ getCurrentQuestionIndex() + 1 }} / {{ totalQuestions }}
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getProgressPercentage() + '%' }"></div>
            </div>
          </div>
          
          <!-- 当前题目内容 -->
          <div v-if="currentQuestion" class="current-question">
            <div class="question-text">{{ currentQuestion.question }}</div>
            
            <div class="options-container">
              <label v-for="(option, optIndex) in getQuestionOptions(currentQuestion)" :key="optIndex" 
                     class="option-item" 
                     :class="{ selected: userAnswer === option, disabled: isQuestionCompleted(currentQuestion.id) }">
                <input type="radio" :value="option" v-model="userAnswer" :disabled="isQuestionCompleted(currentQuestion.id)" />
                <span class="option-content">{{ option }}</span>
                <span class="option-indicator"></span>
              </label>
            </div>
            
            <!-- 答题反馈 -->
            <div v-if="showFeedback && isQuestionCompleted(currentQuestion.id)" class="feedback-section">
              <div v-if="getQuestionResult(currentQuestion.id)?.isCorrect" class="feedback-correct">
                <span class="feedback-icon">✅</span>
                <span>回答正确！</span>
              </div>
              <div v-else class="feedback-wrong">
                <span class="feedback-icon">❌</span>
                <span>回答错误，正确答案是：{{ getCorrectAnswer(currentQuestion) }}</span>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="action-buttons">
              <button v-if="currentQuestionIndex > 0" 
                      @click="goToPreviousQuestion" 
                      class="action-btn secondary">
                <span class="btn-icon">←</span>
                <span>上一题</span>
              </button>
              
              <button v-if="!isQuestionCompleted(currentQuestion.id)" 
                      @click="submitAnswer(currentQuestion)" 
                      :disabled="!userAnswer" 
                      class="action-btn primary">
                <span class="btn-icon">✓</span>
                <span>提交答案</span>
              </button>
              
              <button v-if="currentQuestionIndex < totalQuestions - 1" 
                      @click="goToNextQuestion(currentQuestion)" 
                      class="action-btn secondary">
                <span>下一题</span>
                <span class="btn-icon">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 全部完成状态 -->
      <div v-if="allQuestionsCompleted && availableQuestions.length > 0" class="completion-state">
        <div class="completion-icon">🎉</div>
        <h3>全部题目已完成！</h3>
        <p>恭喜您完成了所有题目</p>
        <router-link :to="`/listener/lecture/${lectureId}/score`" class="result-link">
          <span class="link-icon">📊</span>
          <span>查看成绩</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useListenerStore } from '../../../../stores/listener'

const route = useRoute()
const router = useRouter()
const lectureId = route.params.id

// 数据结构定义
interface QuizQuestion {
  id: number
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  group_id: number
  published: boolean
  created_at: string
}

interface QuizGroup {
  groupId: number
  questions: QuizQuestion[]
}

interface QuestionResult {
  questionId: number
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  answeredAt: Date
}

// 响应式数据
const listenerStore = useListenerStore()
const quizGroups = ref<QuizGroup[]>([])
const availableQuestions = listenerStore.availableQuestions
const userAnswers = listenerStore.userAnswers
const currentQuestionIndex = ref<number>(0)
const userAnswer = ref('')
const showFeedback = ref(true)
const loading = ref(true)
const currentLecture = ref<any>(null)

// 轮询相关
let pollInterval: number | null = null
const POLL_INTERVAL = 3000 // 3秒轮询一次

// 计算属性
const totalQuestions = computed(() => availableQuestions.length)
const completedQuestions = computed(() => userAnswers.size)
const allQuestionsCompleted = computed(() => 
  availableQuestions.length > 0 && 
  completedQuestions.value >= totalQuestions.value
)

const currentQuestion = computed(() => {
  if (availableQuestions.length === 0) return null
  if (currentQuestionIndex.value >= availableQuestions.length) return null
  return availableQuestions[currentQuestionIndex.value]
})

// 获取当前讲座信息
const getCurrentLecture = async () => {
  const currentLectureId = localStorage.getItem('currentLectureId') || sessionStorage.getItem('currentLectureId')
  if (!currentLectureId || currentLectureId !== lectureId) {
    return null
  }
  try {
    const data = await listenerStore.fetchLecture(String(lectureId))
    if (!data) return null
    return {
      id: data.id,
      title: data.title || data.name,
      description: data.description || data.desc,
      speaker: data.speaker || data.name || '未知讲者',
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      status: data.status,
      speakerId: data.speaker_id || data.speakerId
    }
  } catch (error) {
    console.error('getCurrentLecture error', error)
    return null
  }
}

// 检查讲座状态
const checkLectureStatus = () => {
  if (!currentLecture.value) return { ended: false, upcoming: false, active: false }
  
  const status = currentLecture.value.status
  return {
    ended: status === 2,
    upcoming: status === 0,
    active: status === 1
  }
}

const lectureStatus = computed(() => checkLectureStatus())
const isLectureEnded = computed(() => lectureStatus.value.ended)
const isLectureUpcoming = computed(() => lectureStatus.value.upcoming)
const isLectureActive = computed(() => lectureStatus.value.active)

// 获取已发布的题目（通过 listener store 提供的方法）
const fetchPublishedQuizzes = async () => {
  try {
    const result = await listenerStore.fetchQuizPublished(String(lectureId))
    if (result && result.added && result.added > 0) {
      updateQuizGroups()
      if (currentQuestionIndex.value >= availableQuestions.length) currentQuestionIndex.value = 0
      loadCurrentQuestionAnswer()
    }
  } catch (error) {
    console.error('获取题目失败:', error)
  }
}

// 更新题目分组（保留用于统计）
const updateQuizGroups = () => {
  const groupMap = new Map<number, QuizQuestion[]>()
  
  availableQuestions.forEach(question => {
    // 确保group_id是数字类型
    const groupId = parseInt(question.group_id?.toString() || '1')
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, [])
    }
    groupMap.get(groupId)!.push(question)
  })
  
  // 按组ID排序（数字排序），每组内按创建时间排序
  quizGroups.value = Array.from(groupMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([groupId, questions]) => ({
      groupId,
      questions: questions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }))
    
  console.log('题目分组结果:', quizGroups.value.map(g => ({ 
    groupId: g.groupId, 
    count: g.questions.length 
  })))
}

// 加载当前题目的答案
const loadCurrentQuestionAnswer = () => {
  if (!currentQuestion.value) {
    userAnswer.value = ''
    return
  }

  const result = userAnswers.get(currentQuestion.value.id)
  if (result) {
    userAnswer.value = result.userAnswer
  } else {
    userAnswer.value = ''
  }
}

// 获取当前题目索引
const getCurrentQuestionIndex = () => currentQuestionIndex.value

// 获取进度百分比
const getProgressPercentage = () => {
  if (totalQuestions.value === 0) return 0
  return Math.round(((currentQuestionIndex.value + 1) / totalQuestions.value) * 100)
}

// 主要的数据获取函数
const fetchQuestions = async () => {
  loading.value = true
  
  try {
    // 获取讲座信息
    currentLecture.value = await getCurrentLecture()
    
    // 如果讲座已结束或未开始，不加载题目
    if (isLectureEnded.value || isLectureUpcoming.value) {
      loading.value = false
      return
    }
    
    // 获取已发布的题目
    await fetchPublishedQuizzes()
    
    // 加载用户的答题记录
    await loadUserAnswers()
    
  } catch (error) {
    console.error('加载题目失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载用户答题记录（使用 store）
const loadUserAnswers = async () => {
  try {
    await listenerStore.fetchMyAnswers(String(lectureId))
    // store 已经把 userAnswers 更新为 Map
    loadCurrentQuestionAnswer()
  } catch (error) {
    console.error('加载用户答题记录失败:', error)
  }
}

// 开始轮询
const startPolling = () => {
  if (pollInterval) return
  
  pollInterval = setInterval(async () => {
    if (!isLectureEnded.value && !isLectureUpcoming.value) {
      await fetchPublishedQuizzes()
    }
  }, POLL_INTERVAL)
}

// 停止轮询
const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// 题目操作函数
const goToPreviousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
    loadCurrentQuestionAnswer()
  }
}

const goToNextQuestion = (currentQuestion?: QuizQuestion) => {
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++
    loadCurrentQuestionAnswer()
  }
}

const submitAnswer = async (question: QuizQuestion) => {
  if (!userAnswer.value) return
  try {
    await listenerStore.submitAnswer(Number(question.id), { answer: userAnswer.value, lectureId: String(lectureId) })
    loadCurrentQuestionAnswer()
    // 显示反馈后自动跳转到下一题
    setTimeout(() => { if (currentQuestionIndex.value < totalQuestions.value - 1) goToNextQuestion() }, 1200)
  } catch (error) {
    console.error('提交答案失败:', error)
  }
}

// 辅助函数
const isQuestionCompleted = (questionId: number) => {
  const completed = userAnswers.has(questionId)
  console.log(`题目 ${questionId} 完成状态:`, completed)
  return completed
}

const getQuestionOptions = (question: QuizQuestion) => [
  question.option_a,
  question.option_b,
  question.option_c,
  question.option_d
].filter(Boolean)

const getCorrectAnswer = (question: QuizQuestion) => {
  const correctLetter = question.correct_option.toUpperCase()
  const options = {
    'A': question.option_a,
    'B': question.option_b,
    'C': question.option_c,
    'D': question.option_d
  }
  return `${correctLetter}. ${options[correctLetter] || question.correct_option}`
}

const getQuestionResult = (questionId: number) => userAnswers.get(questionId)

// 生命周期
onMounted(() => {
  fetchQuestions()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

// 监听当前题目变化，自动加载答案
watch(currentQuestion, () => {
  loadCurrentQuestionAnswer()
})
</script>

<style scoped>
.quiz-wrapper {
  max-width: 700px;
  margin: 0 auto;
  padding: 1.8rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(16, 163, 127, 0.12);
  border: 1px solid rgba(16, 163, 127, 0.1);
  position: relative;
  overflow: hidden;
  min-height: 70vh;
}

.quiz-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #10a37f 0%, #059669 50%, #047857 100%);
  z-index: 1;
}

.page-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.title-icon {
  font-size: 1.8rem;
  margin-bottom: 0.8rem;
  filter: drop-shadow(0 3px 6px rgba(16, 163, 127, 0.2));
}

.quiz-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #10a37f;
  margin: 0 0 0.4rem 0;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 3px rgba(16, 163, 127, 0.1);
}

.subtitle {
  font-size: 1rem;
  color: #047857;
  margin: 0;
  font-weight: 500;
  opacity: 0.8;
}

/* 题目统计信息 */
.quiz-stats {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(16, 163, 127, 0.1);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.stats-label {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
}

.stats-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #10a37f;
}

/* 无题目状态 */
.no-quiz-state {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.no-quiz-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.6;
}

.no-quiz-state h3 {
  font-size: 1.5rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.no-quiz-state p {
  color: #9ca3af;
  font-size: 1rem;
}

/* 单题目显示模式 */
.quiz-content {
  display: flex;
  justify-content: center;
}

.question-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 4px 20px rgba(16, 163, 127, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.question-number {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(16, 163, 127, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.current-question {
  animation: fadeIn 0.5s ease-out;
}

.question-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #047857;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #10a37f;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(16, 163, 127, 0.2);
  border-top: 3px solid #10a37f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.2rem;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(16, 163, 127, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.option-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(16, 163, 127, 0.3);
  transform: translateY(-2px);
}

.option-item.selected {
  background: rgba(16, 163, 127, 0.1);
  border-color: #10a37f;
  box-shadow: 0 4px 15px rgba(16, 163, 127, 0.2);
}

.option-item.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.option-item input[type="radio"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #10a37f;
  border-radius: 50%;
  position: relative;
  cursor: pointer;
}

.option-item input[type="radio"]:checked::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #10a37f;
  border-radius: 50%;
}

.option-content {
  flex: 1;
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
}

.feedback-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
}

.feedback-correct {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #059669;
  font-weight: 600;
}

.feedback-wrong {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
  font-weight: 600;
}

.feedback-icon {
  font-size: 1.2rem;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: center;
}

.action-btn.primary {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 163, 127, 0.3);
}

.action-btn.secondary {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 2px solid rgba(107, 114, 128, 0.3);
}

.action-btn.submit {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 163, 127, 0.4);
}

.action-btn.secondary:hover {
  background: rgba(107, 114, 128, 0.2);
  color: #4b5563;
  transform: translateY(-2px);
}

.action-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1rem;
}

.completion-state {
  text-align: center;
  padding: 3rem 2rem;
}

.completion-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 4px 12px rgba(16, 163, 127, 0.3));
}

.completion-state h3 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #10a37f;
  margin: 0 0 0.5rem 0;
}

.completion-state p {
  font-size: 1rem;
  color: #047857;
  margin: 0 0 2rem 0;
  opacity: 0.8;
}

.result-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(16, 163, 127, 0.3);
}

.result-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 163, 127, 0.4);
}

.link-icon {
  font-size: 1.1rem;
}

/* 动画效果 */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}

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

.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}

.animate-fade-in-delay {
  animation: fadeIn 0.6s ease-out 0.2s both;
}

/* 讲座状态提示样式 */
.lecture-ended-notice,
.lecture-upcoming-notice {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin: 2rem auto;
  max-width: 600px;
}

.notice-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  display: block;
}

.lecture-ended-notice h3,
.lecture-upcoming-notice h3 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 1rem;
}

.lecture-ended-notice p,
.lecture-upcoming-notice p {
  font-size: 1.1rem;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.notice-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.notice-actions .action-btn.secondary {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 2px solid rgba(107, 114, 128, 0.3);
}

.notice-actions .action-btn.secondary:hover {
  background: rgba(107, 114, 128, 0.2);
  color: #4b5563;
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .quiz-wrapper {
    padding: 1rem;
    margin: 0.5rem;
  }
  
  .question-card {
    padding: 1.5rem;
  }
  
  .question-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .lecture-ended-notice,
  .lecture-upcoming-notice {
    padding: 2rem 1.5rem;
    margin: 1rem;
  }
  
  .notice-icon {
    font-size: 3rem;
  }
  
  .notice-actions {
    flex-direction: column;
  }
}
</style>