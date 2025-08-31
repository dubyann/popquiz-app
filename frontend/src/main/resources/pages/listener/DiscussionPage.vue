<template>
  <div class="discussion-wrapper">
    <div class="header-section">
      <div class="title-icon animate-bounce">💬</div>
      <h2 class="discussion-title animate-fade-in">讲座讨论区</h2>
      <p class="subtitle animate-fade-in-delay">与听众实时交流，分享观点和见解</p>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载讨论内容...</p>
    </div>
    
    <div v-else class="content-section">
      <!-- 讨论列表 -->
      <div class="comments-section animate-slide-up">
        <div class="section-header">
          <div class="section-icon">📝</div>
          <h3 class="section-title">讨论内容</h3>
        </div>
        
        <div v-if="comments.length === 0" class="empty-state">
          <div class="empty-icon">💭</div>
          <h4>还没有讨论内容</h4>
          <p>成为第一个发表观点的人吧！</p>
        </div>
        
        <div v-else class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-card animate-slide-in">
            <div class="comment-header">
              <div class="user-info">
                <span class="user-avatar">👤</span>
                <span class="user-name">{{ comment.userName }}</span>
                <span class="user-badge" v-if="isSpeakerMessage(comment)">演讲者</span>
                <span class="user-badge current-user" v-if="isCurrentUserMessage(comment)">我</span>
                <span class="announcement-badge" v-if="comment.isAnnouncement">📢 公告</span>
                <span class="pinned-badge" v-if="comment.isPinned">📌 置顶</span>
              </div>
              <span class="comment-time">{{ formatTime(comment.time) }}</span>
            </div>
            <div class="comment-body">{{ comment.text }}</div>
            <div class="comment-actions">
              <button @click="toggleLike(comment)" :class="{ liked: comment.isLikedByUser }" class="like-btn">
                👍 {{ comment.likesCount || 0 }}
              </button>
              <!-- 只有自己发的消息才显示置顶和删除按钮 -->
              <button v-if="isCurrentUserMessage(comment)" @click="togglePin(comment)" class="pin-btn">
                {{ comment.isPinned ? '取消置顶' : '置顶' }}
              </button>
              <button v-if="isCurrentUserMessage(comment)" @click="deleteComment(comment)" class="delete-btn">删除</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 发表评论表单 -->
      <div class="comment-form-section animate-slide-up-delay">
        <div class="section-header">
          <div class="section-icon">✏️</div>
          <h3 class="section-title">发表观点</h3>
        </div>
        
        <!-- 讲座已结束提示 -->
        <div v-if="isLectureEnded" class="lecture-ended-notice">
          <div class="notice-icon">⏰</div>
          <p>讲座已结束，无法发布新的讨论内容</p>
        </div>
        
        <!-- 讲座未开始提示 -->
        <div v-else-if="isLectureUpcoming" class="lecture-upcoming-notice">
          <div class="notice-icon">⏳</div>
          <p>讲座尚未开始，请等待讲座开始后再参与讨论</p>
        </div>
        
        <!-- 正常评论表单 -->
        <form v-else class="comment-form" @submit.prevent="submitComment">
          <div class="form-group">
            <label class="form-label" for="comment-input">💭 您的观点</label>
            <textarea 
              id="comment-input"
              v-model="newComment.text" 
              placeholder="分享您对本次讲座的想法、问题或建议..." 
              required
              class="comment-input"
              rows="4"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="submit-btn" :disabled="!newComment.text.trim() || isSubmitting">
              <span class="btn-icon">{{ isSubmitting ? '⏳' : '📤' }}</span>
              {{ isSubmitting ? '发送中...' : '发表观点' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useListenerStore } from '../../../../stores/listener'

const route = useRoute()
const lectureId = route.params.id

const listenerStore = useListenerStore()
const loading = listenerStore.discussionLoading
const comments = listenerStore.comments
const newComment = ref({ text: '' })
const currentUser = ref<any>(null)
const currentLecture = ref<any>(null)
const isSubmitting = ref(false)

// 轮询相关
let pollInterval: number | null = null
const POLL_INTERVAL = 3000 // 3秒轮询一次

// 获取当前用户信息
const getCurrentUser = () => {
  try {
    // 尝试从 localStorage 或 sessionStorage 获取用户信息
    let userData = localStorage.getItem('user') || sessionStorage.getItem('user')
    
    if (userData) {
      const user = JSON.parse(userData)
      return user
    }
    
    // 尝试从其他存储位置获取
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId')
    const username = localStorage.getItem('username') || sessionStorage.getItem('username')
    
    if (userId) {
      const userInfo = {
        id: parseInt(userId) || userId,
        username: username
      }
      return userInfo
    }
    
    // 检查JWT token中是否包含用户信息
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      try {
        // 尝试解析JWT token
        const tokenParts = token.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]))
          if (payload.id || payload.userId) {
            const userFromToken = {
              id: payload.id || payload.userId,
              username: payload.username || payload.name
            }
            return userFromToken
          }
        }
      } catch (tokenError) {
        console.error('解析token失败:', tokenError)
      }
    }
    
    return null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

// 获取当前讲座信息（使用 listener store 预加载）
const getCurrentLecture = async () => {
  try {
    const data = await listenerStore.fetchLecture(String(lectureId))
    return data || null
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

// 获取讨论消息（委托给 listener store）
const loadDiscussionMessages = async () => {
  try {
    await listenerStore.loadDiscussionMessages(String(lectureId))
  } catch (error) {
    console.error('加载讨论消息失败:', error)
  }
}

// 提交新的讨论消息（委托给 listener store）
const submitComment = async () => {
  if (!newComment.value.text.trim() || isSubmitting.value) return

  isSubmitting.value = true
  try {
    await listenerStore.submitComment(String(lectureId), newComment.value.text.trim())
    newComment.value.text = ''
    // store.submitComment 会内部刷新消息列表
  } catch (error) {
    console.error('提交讨论消息失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

// 开始轮询新消息
const startPolling = () => {
  if (pollInterval) return
  
  pollInterval = setInterval(async () => {
    if (!isLectureEnded.value) {
      await loadDiscussionMessages()
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

// 格式化时间显示
const formatTime = (time: Date) => {
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return time.toLocaleDateString('zh-CN')
}

// 检查是否是当前用户的消息
const isCurrentUserMessage = (message: any) => {
  if (!currentUser.value || !message.userId) return false
  
  // 尝试多种ID比较方式
  const currentUserId = currentUser.value.id
  const messageUserId = message.userId
  
  // 尝试严格相等、松散相等、字符串比较
  return currentUserId === messageUserId || 
         currentUserId == messageUserId || 
         String(currentUserId) === String(messageUserId)
}

// 检查是否是演讲者
const isSpeakerMessage = (message: any) => {
  return currentLecture.value && message.userId === currentLecture.value.speaker_id
}

// 检查当前用户是否是演讲者
const isCurrentUserSpeaker = () => {
  if (!currentUser.value || !currentLecture.value) return false
  
  const currentUserId = currentUser.value.id
  const speakerId = currentLecture.value.speaker_id
  
  return currentUserId === speakerId || 
         currentUserId == speakerId || 
         String(currentUserId) === String(speakerId)
}

// 点赞/取消点赞
const toggleLike = async (comment: any) => {
  try {
    await listenerStore.likeComment(Number(comment.id), String(lectureId))
  } catch (error) {
    console.error('toggleLike error', error)
  }
}

// 置顶/取消置顶（仅演讲者可操作）
const togglePin = async (comment: any) => {
  try {
    await listenerStore.pinMessage(String(lectureId), Number(comment.id))
  } catch (error) {
    console.error('togglePin error', error)
  }
}

// 删除消息（仅自己的消息）
const deleteComment = async (comment: any) => {
  if (!confirm('确定要删除这条消息吗？')) return
  try {
    await listenerStore.deleteMessage(String(lectureId), Number(comment.id))
  } catch (error) {
    console.error('deleteComment error', error)
  }
}

// 初始化数据
const initializeData = async () => {
  listenerStore.discussionLoading = true
  
  try {
    // 获取用户信息
    currentUser.value = getCurrentUser()
    
    // 获取讲座信息（使用 listener store 预加载方法）
    try {
      const data = await listenerStore.fetchLecture(String(lectureId))
      currentLecture.value = data || null
    } catch (e) {
      console.debug('parse current lecture error', e)
      currentLecture.value = null
    }
    
    // 加载讨论消息
    await loadDiscussionMessages()
    
    // 开始轮询
    if (!isLectureEnded.value) {
      startPolling()
    }
  } catch (error) {
    console.error('初始化数据失败:', error)
  } finally {
    listenerStore.discussionLoading = false
  }
}

// 生命周期钩子
onMounted(() => {
  initializeData()
})

onUnmounted(() => {
  stopPolling()
})
</script>


<style scoped>
/* 容器样式 */
.discussion-wrapper {
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

.discussion-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #10a37f 0%, #059669 50%, #047857 100%);
  z-index: 1;
}

/* 头部区域 */
.header-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.title-icon {
  font-size: 1.8rem;
  margin-bottom: 0.8rem;
  filter: drop-shadow(0 3px 6px rgba(16, 163, 127, 0.2));
}

.discussion-title {
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

/* 加载状态 */
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

/* 内容区域 */
.content-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.section-icon {
  font-size: 1.2rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #10a37f;
  margin: 0;
}

/* 评论区域 */
.comments-section {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(16, 163, 127, 0.1);
}

.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-state h4 {
  margin: 0 0 0.5rem 0;
  color: #374151;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 10px;
  padding: 1.2rem;
  border: 1px solid rgba(16, 163, 127, 0.15);
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.08);
  transition: all 0.3s ease;
}

.comment-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 163, 127, 0.12);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  font-size: 1.1rem;
}

.user-name {
  font-weight: 600;
  color: #10a37f;
  font-size: 0.9rem;
}

.user-badge {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
}

.user-badge.current-user {
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
}

.announcement-badge {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
}

.pinned-badge {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
}

.comment-time {
  color: #6b7280;
  font-size: 0.8rem;
}

.comment-body {
  color: #374151;
  line-height: 1.6;
  font-size: 0.95rem;
  margin-bottom: 0.8rem;
}

.comment-actions {
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
}

.like-btn, .pin-btn, .delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.like-btn {
  background: linear-gradient(135deg, #e0f2fe 0%, #d1eefd 100%);
  color: #10a37f;
  border: 1px solid #10a37f;
}

.like-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #cce6ff 0%, #b8e0ff 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.1);
}

.like-btn.liked {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  border: none;
}

.pin-btn {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  color: #d97706;
  border: 1px solid #d97706;
}

.pin-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #fef9c3 0%, #fde68a 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.1);
}

.delete-btn {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border: 1px solid #991b1b;
}

.delete-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #fca5a5 0%, #f87171 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(153, 27, 27, 0.1);
}

/* 评论表单区域 */
.comment-form-section {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(16, 163, 127, 0.1);
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #10a37f;
  font-size: 0.9rem;
}

.comment-input {
  padding: 0.8rem;
  border: 2px solid rgba(16, 163, 127, 0.2);
  border-radius: 8px;
  font-size: 0.95rem;
  resize: vertical;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
}

.comment-input:focus {
  outline: none;
  border-color: #10a37f;
  box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.2);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0e8c6b 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 163, 127, 0.3);
}

.submit-btn:disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1rem;
}

/* 动画效果 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
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

.animate-slide-up {
  animation: slideUp 0.6s ease-out;
}

.animate-slide-up-delay {
  animation: slideUp 0.6s ease-out 0.2s both;
}

.animate-slide-in {
  animation: slideInRight 0.5s ease-out;
}

/* 讲座状态提示样式 */
.lecture-ended-notice,
.lecture-upcoming-notice {
  background: rgba(255, 255, 255, 0.8);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin: 1rem 0;
}

.notice-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  display: block;
}

.lecture-ended-notice p,
.lecture-upcoming-notice p {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .discussion-wrapper {
    padding: 1rem;
    margin: 0 0.5rem;
  }
  
  .title-icon {
    font-size: 1.5rem;
  }
  
  .discussion-title {
    font-size: 1.5rem;
  }
  
  .content-section {
    gap: 1.5rem;
  }
  
  .comment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .comment-actions {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .like-btn, .pin-btn, .delete-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .submit-btn {
    width: 100%;
    justify-content: center;
  }
  
  .lecture-ended-notice,
  .lecture-upcoming-notice {
    padding: 1.5rem 1rem;
  }
  
  .notice-icon {
    font-size: 2rem;
  }
}
</style>