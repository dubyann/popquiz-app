<template>
  <div class="feedback-wrapper">
    <div class="page-header">
      <div class="title-icon animate-bounce">💬</div>
      <h2 class="feedback-title animate-fade-in">意见反馈</h2>
      <p class="subtitle animate-fade-in-delay">您的意见对我们很重要，请分享您的想法</p>
      
      <!-- 标签页导航 -->
      <div class="tab-navigation">
        <button @click="activeTab = 'submit'" 
                :class="{ active: activeTab === 'submit' }"
                class="tab-btn">
          📝 提交反馈
        </button>
        <button @click="activeTab = 'history'" 
                :class="{ active: activeTab === 'history' }"
                class="tab-btn">
          📋 我的反馈
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
      <button @click="error = ''" class="error-close">✕</button>
    </div>

    <div class="feedback-content">

      <div class="feedback-card">
        <!-- 提交反馈标签页 -->
        <div v-if="activeTab === 'submit'">
          <div v-if="!submitted" class="feedback-form">
          <div class="section">
            <h3 class="section-title">📋 选择反馈类型</h3>
            <div class="feedback-options">
              <label v-for="feedbackType in feedbackTypes" :key="feedbackType.type" 
                     class="feedback-option" 
                     :class="{ selected: selectedType === feedbackType.type }">
                <input type="radio" 
                       v-model="selectedType" 
                       :value="feedbackType.type" 
                       name="feedbackType" />
                <span class="option-content">{{ feedbackType.text }}</span>
                <span class="option-indicator"></span>
              </label>
            </div>
            <div v-if="feedbackTypes.length === 0" class="loading-message">
              正在加载反馈类型...
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">✏️ 详细建议</h3>
            <div class="textarea-container">
              <textarea 
                v-model="feedbackMessage" 
                placeholder="请详细描述您的建议或意见，我们会认真考虑..."
                class="feedback-textarea"
                maxlength="500"
              ></textarea>
              <div class="char-count">{{ feedbackMessage.length }}/500</div>
            </div>
          </div>

          <div class="submit-section">
            <button @click="submitFeedback" 
                    class="submit-btn" 
                    :disabled="!canSubmit || loading">
              <span v-if="loading" class="btn-icon">⏳</span>
              <span v-else class="btn-icon">📤</span>
              <span>{{ loading ? '提交中...' : '提交反馈' }}</span>
            </button>
            <p class="submit-hint">请选择反馈类型或填写建议</p>
          </div>
        </div>

        <div v-else class="success-state">
          <div class="success-icon">🎉</div>
          <h3>反馈提交成功！</h3>
          <p>感谢您的宝贵意见，我们会认真处理您的反馈</p>
          <div class="feedback-summary">
            <div v-if="selectedType" class="summary-item">
              <span class="summary-label">反馈类型：</span>
              <span class="summary-value">
                {{ feedbackTypes.find(t => t.type === selectedType)?.text || selectedType }}
              </span>
            </div>
            <div v-if="feedbackMessage.trim()" class="summary-item">
              <span class="summary-label">详细建议：</span>
              <span class="summary-value">{{ feedbackMessage }}</span>
            </div>
          </div>
          <div class="action-buttons">
            <button @click="viewHistory" class="view-history-btn">
              <span>查看我的反馈</span>
            </button>
            <button @click="resetForm" class="reset-btn">
              <span>继续反馈</span>
            </button>
          </div>
        </div>
        </div>
        
        <!-- 我的反馈历史标签页 -->
        <div v-else-if="activeTab === 'history'" class="history-section">
          <div v-if="historyLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在加载反馈历史...</p>
          </div>
          
          <div v-else-if="feedbackHistory.length === 0" class="empty-history">
            <div class="empty-icon">📝</div>
            <h3>暂无反馈记录</h3>
            <p>您还没有提交过任何反馈</p>
            <button @click="activeTab = 'submit'" class="switch-tab-btn">
              立即提交反馈
            </button>
          </div>
          
          <div v-else class="history-list">
            <div class="history-header">
              <h3>我的反馈历史</h3>
              <span class="history-count">共 {{ feedbackHistory.length }} 条</span>
            </div>
            
            <div v-for="feedback in feedbackHistory" :key="feedback.id" class="history-item">
              <div class="history-item-header">
                <span class="feedback-type-badge">{{ feedback.feedbackTypeText }}</span>
                <span class="feedback-time">{{ formatTime(feedback.created_at) }}</span>
              </div>
              <div v-if="feedback.feedback_message" class="feedback-message">
                {{ feedback.feedback_message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useListenerStore } from '../../../../stores/listener'
import { AuthManager } from '../../../../utils/auth'

interface FeedbackType {
  type: string
  text: string
}

interface FeedbackHistory {
  id: number
  feedback_type: string
  feedback_message?: string
  feedbackTypeText: string
  created_at: string
}

// 主要状态（部分由 listener store 提供）
const listenerStore = useListenerStore()
const feedbackTypes = listenerStore.feedbackTypes
const selectedType = ref('')
const feedbackMessage = ref('')
const submitted = ref(false)
const loading = ref(false)
const error = ref('')

// 标签页状态
const activeTab = ref<'submit' | 'history'>('submit')

// 历史反馈状态（存于 store）
const feedbackHistory = listenerStore.feedbackHistory
const historyLoading = ref(false)

const canSubmit = computed(() => {
  return selectedType.value || feedbackMessage.value.trim().length > 0
})

// 获取当前讲座ID：优先使用 listener store 中预加载的 lectureDetail
const lectureId = ref(String(listenerStore.lectureDetail?.id || localStorage.getItem('currentLectureId') || sessionStorage.getItem('currentLectureId') || '1'))

onMounted(async () => {
  await loadFeedbackTypes()
  // 监听标签页切换，当切换到历史页面时加载数据
  watch(activeTab, async (newTab) => {
    if (newTab === 'history' && feedbackHistory.length === 0) {
      await loadFeedbackHistory()
    }
  })
})

// 加载反馈类型
async function loadFeedbackTypes() {
  try {
    await listenerStore.loadFeedbackTypes()
    console.log('反馈类型加载成功:', feedbackTypes)
  } catch (err: any) {
    console.error('加载反馈类型失败:', err)
    error.value = err.response?.data?.message || '获取反馈类型失败'
    // 如果 store 未返回类型，保留本地默认
    if (!feedbackTypes || feedbackTypes.length === 0) {
      listenerStore.feedbackTypes = [
        { type: 'too_fast', text: '讲得太快了' },
        { type: 'too_slow', text: '讲得太慢了' },
        { type: 'unclear', text: '讲解不清楚' },
        { type: 'good', text: '讲得很好' },
        { type: 'other', text: '其他' }
      ]
    }
  }
}

async function submitFeedback() {
  if (!canSubmit.value) return

  loading.value = true
  error.value = ''

    try {
      if (!lectureId.value) throw new Error('讲座ID不能为空')
      const payload: any = {}
      if (selectedType.value) payload.feedbackType = selectedType.value
      else if (feedbackMessage.value.trim()) payload.feedbackType = 'other'
      if (feedbackMessage.value.trim()) payload.feedbackMessage = feedbackMessage.value.trim()

      // 通过 store 提交，store 内处理 token/headers
      await listenerStore.submitFeedback(String(lectureId.value), payload)
      submitted.value = true
      // 清空 store 中的历史以便下次重新加载
      listenerStore.feedbackHistory = []
    } catch (err: any) {
      console.error('提交反馈失败:', err)
      // 如果提示需要加入讲座，尝试通过 store 加入并重试一次
      const msg = err?.response?.data?.message || err?.message || ''
      if (msg.includes('加入讲座')) {
        try {
          await listenerStore.joinLecture(String(lectureId.value))
          await listenerStore.submitFeedback(String(lectureId.value), {
            feedbackType: selectedType.value || 'other',
            feedbackMessage: feedbackMessage.value.trim()
          })
          submitted.value = true
          listenerStore.feedbackHistory = []
        } catch (secondErr: any) {
          console.error('自动加入并重试反馈失败:', secondErr)
          error.value = secondErr?.response?.data?.message || secondErr?.message || '提交反馈失败'
        }
      } else {
        error.value = msg || '提交反馈失败'
      }
    } finally {
      loading.value = false
    }
}

function resetForm() {
  selectedType.value = ''
  feedbackMessage.value = ''
  submitted.value = false
  error.value = ''
}

// 查看历史反馈
function viewHistory() {
  submitted.value = false
  activeTab.value = 'history'
  if (feedbackHistory.length === 0) {
    loadFeedbackHistory()
  }
}

// 加载反馈历史
async function loadFeedbackHistory() {
  historyLoading.value = true
  try {
    await listenerStore.loadFeedbackHistory(String(lectureId.value))
    console.log('反馈历史加载成功:', feedbackHistory.length, '条')
  } catch (err: any) {
    console.error('加载反馈历史失败:', err)
    error.value = err?.response?.data?.message || '获取反馈历史失败'
    listenerStore.feedbackHistory = []
  } finally {
    historyLoading.value = false
  }
}

// 格式化时间
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>
<style scoped>
.feedback-wrapper {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.8rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(16, 163, 127, 0.12);
  border: 1px solid rgba(16, 163, 127, 0.1);
  position: relative;
  overflow: hidden;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1px solid #fca5a5;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.9rem;
  position: relative;
}

.error-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.error-close {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.error-close:hover {
  background-color: rgba(220, 38, 38, 0.1);
}

.loading-message {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 1rem;
}

.feedback-wrapper::before {
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
  margin-bottom: 1.5rem;
}

.title-icon {
  font-size: 1.8rem;
  margin-bottom: 0.8rem;
  filter: drop-shadow(0 3px 6px rgba(16, 163, 127, 0.2));
}

.feedback-title {
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
  margin: 0 0 2rem 0;
  font-weight: 500;
  opacity: 0.8;
}

.feedback-content {
  display: flex;
  justify-content: center;
}

.feedback-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(16, 163, 127, 0.1);
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #047857;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feedback-options {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.feedback-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(16, 163, 127, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.feedback-option:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(16, 163, 127, 0.3);
  transform: translateY(-2px);
}

.feedback-option.selected {
  background: rgba(16, 163, 127, 0.1);
  border-color: #10a37f;
  box-shadow: 0 4px 15px rgba(16, 163, 127, 0.2);
}

.feedback-option input[type="radio"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #10a37f;
  border-radius: 50%;
  position: relative;
  cursor: pointer;
  background: white;
  transition: all 0.2s ease;
}

.feedback-option input[type="radio"]:checked {
  background: #10a37f;
  border-color: #10a37f;
}

.feedback-option input[type="radio"]:checked::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}

.option-content {
  flex: 1;
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
}

.textarea-container {
  position: relative;
}

.feedback-textarea {
  width: 100%;
  min-height: 120px;
  border: 2px solid rgba(16, 163, 127, 0.2);
  border-radius: 12px;
  padding: 1rem;
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  resize: vertical;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #10a37f;
  box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.1);
  background: rgba(255, 255, 255, 0.95);
}

.char-count {
  position: absolute;
  bottom: 0.5rem;
  right: 1rem;
  font-size: 0.8rem;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.submit-section {
  text-align: center;
}

.submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(16, 163, 127, 0.3);
  margin-bottom: 0.8rem;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 163, 127, 0.4);
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1rem;
}

.submit-hint {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

.success-state {
  text-align: center;
  padding: 2rem 1rem;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 4px 12px rgba(16, 163, 127, 0.3));
}

.success-state h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10a37f;
  margin: 0 0 0.5rem 0;
}

.success-state p {
  font-size: 1rem;
  color: #047857;
  margin: 0 0 2rem 0;
  opacity: 0.8;
}

.feedback-summary {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: left;
}

.summary-item {
  margin-bottom: 1rem;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-weight: 600;
  color: #047857;
  display: block;
  margin-bottom: 0.3rem;
}

.summary-value {
  color: #374151;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.view-history-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
}

.view-history-btn:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-1px);
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background: rgba(16, 163, 127, 0.1);
  color: #10a37f;
  border: 2px solid #10a37f;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
}

.reset-btn:hover {
  background: #10a37f;
  color: white;
  transform: translateY(-1px);
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

/* 标签页样式 */
.tab-navigation {
  display: flex;
  margin: 0 auto;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(16, 163, 127, 0.2);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(16, 163, 127, 0.15);
}

.tab-btn {
  flex: 1;
  padding: 0.8rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab-btn.active {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.3);
}

.tab-btn:hover:not(.active) {
  background: rgba(16, 163, 127, 0.1);
  color: #10a37f;
}

/* 历史反馈样式 */
.history-section {
  min-height: 300px;
}

.loading-container {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #10a37f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-history {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-history h3 {
  font-size: 1.2rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.empty-history p {
  color: #9ca3af;
  margin: 0 0 1.5rem 0;
}

.switch-tab-btn {
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.switch-tab-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 163, 127, 0.3);
}

.history-list {
  padding: 1rem 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0f2f1;
}

.history-header h3 {
  font-size: 1.1rem;
  color: #047857;
  margin: 0;
}

.history-count {
  font-size: 0.9rem;
  color: #6b7280;
  background: rgba(16, 163, 127, 0.1);
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
}

.history-item {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(16, 163, 127, 0.1);
  border-radius: 12px;
  padding: 1rem 1.2rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.history-item:hover {
  border-color: rgba(16, 163, 127, 0.3);
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.1);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.feedback-type-badge {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
}

.feedback-time {
  font-size: 0.8rem;
  color: #6b7280;
}

.feedback-message {
  color: #374151;
  line-height: 1.5;
  background: rgba(240, 253, 244, 0.5);
  padding: 0.8rem;
  border-radius: 8px;
  border-left: 3px solid #10a37f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .feedback-wrapper {
    padding: 1rem;
    margin: 0.5rem;
  }
  
  .feedback-card {
    padding: 1.5rem;
  }
  
  .feedback-option {
    padding: 0.8rem;
  }
  
  .feedback-textarea {
    min-height: 100px;
  }
}
</style>