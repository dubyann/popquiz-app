<template>
  <div class="stats-wrapper">
    <div class="page-header">
      <div class="title-icon animate-bounce">📊</div>
      <h2 class="stats-title animate-fade-in">讲座统计数据</h2>
      <p class="subtitle animate-fade-in-delay" v-if="lecture">{{ lecture.title }} - 答题统计分析</p>
      <p class="subtitle animate-fade-in-delay" v-else>查看当前讲座的参与情况和答题统计</p>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载统计数据...</p>
    </div>
    
    <div v-else-if="!lecture" class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>暂无讲座数据</h3>
      <p>未找到当前讲座的统计信息，请检查讲座ID是否正确。</p>
      <button @click="loadData" class="retry-btn">重新加载</button>
    </div>
    
    <div v-else class="lecture-content">
      <!-- 讲座基本信息 -->
      <div class="lecture-info">
        <h2 class="lecture-title">{{ lecture.title }}</h2>
        <div class="lecture-meta">
          <span class="meta-item">
            <i class="icon">👥</i>
            参与人数: {{ lecture.participantCount || 0 }}
          </span>
          <span class="meta-item">
            <i class="icon">📝</i>
            题目数量: {{ lecture.quizCount || 0 }}
          </span>
          <span class="meta-item">
            <i class="icon">📅</i>
            {{ formatDate(lecture.created_at) }}
          </span>
        </div>
      </div>

      <!-- 讲座整体统计 -->
      <div class="overall-stats">
        <h3>📈 整体统计</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ lecture.userRankings?.length || 0 }}</div>
            <div class="stat-label">参与用户</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ getTotalAnswers() }}</div>
            <div class="stat-label">总答题数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ calculateOverallAccuracy(lecture.overallStats) }}%</div>
            <div class="stat-label">整体正确率</div>
          </div>
        </div>
      </div>

      <!-- 题目统计 -->
      <div class="quiz-stats" v-if="lecture.quizStats && lecture.quizStats.length > 0">
        <h3>📋 题目统计</h3>
        <div class="quiz-list">
          <div v-for="(quiz, index) in lecture.quizStats" :key="quiz.quizId" class="quiz-item">
            <div class="quiz-header">
              <span class="quiz-number">Q{{ index + 1 }}</span>
              <span class="quiz-question">{{ quiz.question }}</span>
            </div>
            <div class="quiz-metrics">
              <div class="metric">
                <span class="metric-value">{{ quiz.totalAnswers }}</span>
                <span class="metric-label">答题人数</span>
              </div>
              <div class="metric">
                <span class="metric-value">{{ quiz.correctAnswers }}</span>
                <span class="metric-label">答对人数</span>
              </div>
              <div class="metric accuracy">
                <span class="metric-value">{{ (quiz.accuracy * 100).toFixed(1) }}%</span>
                <span class="metric-label">正确率</span>
              </div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (quiz.accuracy * 100) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 用户排行榜 -->
      <div class="user-rankings" v-if="lecture.userRankings && lecture.userRankings.length > 0">
        <h3>🏆 参与者排行榜</h3>
        <div class="ranking-list">
          <div v-for="(user, index) in lecture.userRankings" :key="user.user_id" 
               class="ranking-item" 
               :class="{ 'top-performer': index < 3 }"
               @click="selectUser(user)">
            <div class="rank-badge" :class="getRankClass(index)">
              <span v-if="index < 3">{{ ['🥇', '🥈', '🥉'][index] }}</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="user-info">
              <div class="username">{{ user.username }}</div>
              <div class="user-stats">
                {{ user.correct_count }}/{{ user.total_answered }} 题正确
              </div>
            </div>
            <div class="accuracy-badge" :class="getAccuracyClass(user.accuracy)">
              {{ Math.round(user.accuracy || 0) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户详情弹窗 -->
    <div v-if="selectedUser" class="modal-overlay" @click="closeUserDetail">
      <div class="user-detail-modal" @click.stop>
        <div class="modal-header">
          <h3>👤 {{ selectedUser.username }} 的详细答题情况</h3>
          <button class="close-btn" @click="closeUserDetail">×</button>
        </div>
        <div class="modal-content">
          <div class="user-summary">
            <div class="summary-item">
              <div class="summary-label">总答题数</div>
              <div class="summary-value">{{ selectedUser.total_answered }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">答对题数</div>
              <div class="summary-value">{{ selectedUser.correct_count }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">正确率</div>
              <div class="summary-value accuracy">{{ Math.round(selectedUser.accuracy || 0) }}%</div>
            </div>
          </div>
          <div v-if="selectedUserAnswers && selectedUserAnswers.length > 0" class="user-answers">
            <h4>详细答题记录</h4>
            <div v-for="answer in selectedUserAnswers" :key="answer.id" class="answer-item">
              <div class="answer-question">{{ answer.question }}</div>
              <div class="answer-result" :class="{ correct: answer.is_correct, incorrect: !answer.is_correct }">
                {{ answer.is_correct ? '✅ 正确' : '❌ 错误' }}
              </div>
            </div>
          </div>
          <div v-else-if="selectedUserAnswers && selectedUserAnswers.length === 0" class="no-answers">
            该用户还没有答题记录
          </div>
          <div v-else class="loading-answers">加载答题详情中...</div>
        </div>
      </div>
    </div>
  </div>
</template>
  
<script setup lang="ts">
import { ref, onMounted, toRef } from 'vue'
import { useRoute } from 'vue-router'
import { useSpeakerStore } from '../../../../stores/speaker'

const route = useRoute()
const lectureId = route.params.id as string

function getSpeakerStore() { try { return useSpeakerStore() } catch (e) { console.debug('speakerStore not ready', e); return null } }
const loading = toRef(getSpeakerStore() || { loadingLecture: false }, 'loadingLecture')
const lecture = toRef(getSpeakerStore() || { currentLecture: null }, 'currentLecture')
const selectedUser = ref<any>(null)
const selectedUserAnswers = ref<any[]>([])

// store 方法直接使用
const loadData = async () => {
  if (!lectureId) return
  await speakerStore.loadLectureData(lectureId)
}

// 选择用户查看详情 (保留为局部实现，因为 store 当前不持有 per-user answers)
const selectUser = async (user: any) => {
  selectedUser.value = user
  selectedUserAnswers.value = []
  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || ''
    if (!token) return
    const res = await fetch(`/api/answers/lecture/${lectureId}/user/${user.user_id}/answers`, {
      headers: { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` }
    })
    if (res.ok) selectedUserAnswers.value = await res.json()
  } catch (e) {
    console.error('fetch user answers failed', e)
    selectedUserAnswers.value = []
  }
}

// 关闭用户详情
const closeUserDetail = () => {
  selectedUser.value = null
  selectedUserAnswers.value = []
}

// 计算整体正确率
const calculateOverallAccuracy = (stats: any) => {
  if (!stats || !stats.total_answers || stats.total_answers === 0) {
    // 如果没有整体统计数据，从排行榜数据计算
    if (lecture.value && lecture.value.userRankings && lecture.value.userRankings.length > 0) {
      const totalAnswered = lecture.value.userRankings.reduce((sum: number, user: any) => sum + (user.total_answered || 0), 0)
      const totalCorrect = lecture.value.userRankings.reduce((sum: number, user: any) => sum + (user.correct_count || 0), 0)
      if (totalAnswered > 0) {
        return ((totalCorrect / totalAnswered) * 100).toFixed(1)
      }
    }
    return 0
  }
  return ((stats.total_correct / stats.total_answers) * 100).toFixed(1)
}

// 计算总答题数
const getTotalAnswers = () => {
  if (lecture.value?.overallStats?.total_answers) {
    return lecture.value.overallStats.total_answers
  }
  // 从排行榜数据计算
  if (lecture.value?.userRankings && lecture.value.userRankings.length > 0) {
    return lecture.value.userRankings.reduce((sum: number, user: any) => sum + (user.total_answered || 0), 0)
  }
  return 0
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '未知时间'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 获取排名样式
const getRankClass = (index: number) => {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return 'rank-normal'
}

// 获取正确率样式
const getAccuracyClass = (accuracy: number) => {
  if (accuracy >= 90) return 'accuracy-excellent'
  if (accuracy >= 80) return 'accuracy-good'
  if (accuracy >= 70) return 'accuracy-fair'
  return 'accuracy-poor'
}

onMounted(() => {
  loadData()
})
</script>
  
<style scoped>
.stats-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.8rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(16, 163, 127, 0.12);
  border: 1px solid rgba(16, 163, 127, 0.1);
  position: relative;
  overflow: hidden;
}

.stats-wrapper::before {
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

.stats-title {
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

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #047857;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.retry-btn {
  background: #10a37f;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 1rem;
}

.retry-btn:hover {
  background: #059669;
}

.lectures-container {
  width: 100%;
}

.lecture-content {
  width: 100%;
}

.lecture-info {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(16, 163, 127, 0.15);
}

.lecture-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(16, 163, 127, 0.1);
  margin-bottom: 1.5rem;
  border: 1px solid rgba(16, 163, 127, 0.15);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.lecture-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #10a37f 0%, #059669 100%);
}

.lecture-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(16, 163, 127, 0.15);
}

.lecture-header {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  padding: 1.5rem;
  border-bottom: 1px solid rgba(16, 163, 127, 0.1);
}

.lecture-title {
  font-size: 1.4rem;
  margin: 0 0 0.8rem 0;
  font-weight: 600;
  color: #10a37f;
}

.lecture-meta {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #047857;
  font-weight: 500;
}

.icon {
  font-size: 0.9rem;
}

.overall-stats {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(16, 163, 127, 0.1);
}

.overall-stats h3 {
  font-size: 1.1rem;
  color: #10a37f;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.8rem;
}

.stat-card {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  color: white;
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.2);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.9;
}

.quiz-stats {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(16, 163, 127, 0.1);
}

.quiz-stats h3 {
  font-size: 1.1rem;
  color: #10a37f;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.quiz-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.quiz-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  border-left: 3px solid #10a37f;
  transition: all 0.2s ease;
}

.quiz-item:hover {
  background: rgba(16, 163, 127, 0.05);
  transform: translateX(2px);
}

.quiz-header {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  margin-bottom: 0.8rem;
}

.quiz-number {
  background: #10a37f;
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.quiz-question {
  font-weight: 500;
  color: #1f2937;
  line-height: 1.3;
  font-size: 0.9rem;
}

.quiz-metrics {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.8rem;
  flex-wrap: wrap;
}

.metric {
  text-align: center;
  min-width: 60px;
}

.metric-value {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.metric-label {
  font-size: 0.7rem;
  color: #6b7280;
  margin-top: 0.1rem;
}

.metric.accuracy .metric-value {
  color: #10a37f;
}

.progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10a37f 0%, #059669 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.user-rankings {
  padding: 1.5rem;
}

.user-rankings h3 {
  font-size: 1.1rem;
  color: #10a37f;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  background: #f8fafc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.ranking-item:hover {
  background: rgba(16, 163, 127, 0.05);
  transform: translateX(2px);
  border-color: rgba(16, 163, 127, 0.2);
}

.ranking-item.top-performer {
  background: linear-gradient(135deg, rgba(16, 163, 127, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
  border-color: rgba(16, 163, 127, 0.3);
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.rank-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #8b4513;
}

.rank-silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e5e5e5 100%);
  color: #555;
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #daa520 100%);
  color: white;
}

.rank-normal {
  background: #e5e7eb;
  color: #374151;
}

.user-info {
  flex: 1;
}

.username {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.1rem;
  font-size: 0.9rem;
}

.user-stats {
  font-size: 0.8rem;
  color: #6b7280;
}

.accuracy-badge {
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
}

.accuracy-excellent {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
}

.accuracy-good {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
}

.accuracy-fair {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.accuracy-poor {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(8px);
}

.user-detail-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(16, 163, 127, 0.2);
  border: 1px solid rgba(16, 163, 127, 0.1);
}

.modal-header {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(16, 163, 127, 0.1);
  border-radius: 16px 16px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-weight: 600;
  color: #10a37f;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.modal-content {
  padding: 1.5rem;
}

.user-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.summary-item {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(16, 163, 127, 0.1);
}

.summary-label {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.3rem;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1f2937;
}

.summary-value.accuracy {
  color: #10a37f;
}

.user-answers h4 {
  margin: 0 0 0.8rem 0;
  color: #10a37f;
  font-size: 1rem;
}

.answer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 0.6rem;
  border: 1px solid rgba(16, 163, 127, 0.1);
}

.answer-question {
  flex: 1;
  margin-right: 0.8rem;
  color: #1f2937;
  font-size: 0.9rem;
}

.answer-result {
  padding: 0.2rem 0.8rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.answer-result.correct {
  background: rgba(16, 163, 127, 0.1);
  color: #047857;
}

.answer-result.incorrect {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.loading-answers {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.no-answers {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
  font-size: 0.9rem;
  font-style: italic;
}

/* 动画样式 */
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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}

.animate-fade-in-delay {
  animation: fadeIn 0.8s ease-out 0.3s both;
}

@media (max-width: 768px) {
  .stats-wrapper {
    padding: 1rem;
    margin: 0 0.5rem;
  }
  
  .title-icon {
    font-size: 1.5rem;
  }
  
  .stats-title {
    font-size: 1.5rem;
  }
  
  .lecture-header {
    padding: 1rem;
  }
  
  .lecture-title {
    font-size: 1.2rem;
  }
  
  .lecture-meta {
    gap: 0.8rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .quiz-header {
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .quiz-metrics {
    gap: 1rem;
  }
  
  .ranking-item {
    padding: 0.6rem 0.8rem;
  }
  
  .user-summary {
    grid-template-columns: 1fr;
  }
  
  .modal-overlay {
    padding: 0.5rem;
  }
  
  .answer-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }
}
</style>
  