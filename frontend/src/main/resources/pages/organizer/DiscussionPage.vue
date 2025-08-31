<template>
  <div class="discussion-wrapper">
    <div class="header-section">
      <div class="title-icon animate-bounce">💬</div>
      <h2 class="discussion-title animate-fade-in">讲座讨论区</h2>
      <p class="subtitle animate-fade-in-delay">与听众实时交流，分享观点和见解</p>
    </div>
    <div class="content-section">
      <!-- 注释掉题目相关mock逻辑
      <div v-if="questions.length === 0" class="empty-state">
        <div class="empty-icon">💭</div>
        <h4>暂无题目</h4>
        <p>请等待讲座发布题目后再来讨论吧！</p>
      </div>
      <div v-else>
        <div class="discussion-question">
          <div class="discussion-qtext">题目{{ currentIndex + 1 }}：{{ currentQuestion.text }}</div>
          <div class="discussion-options">
            <span v-for="(opt, idx) in currentQuestion.options" :key="idx" class="discussion-option">
              {{ String.fromCharCode(65 + idx) }}. {{ opt }}
            </span>
          </div>
        </div>
      -->
      <div class="comments-section animate-slide-up">
        <div class="section-header">
          <div class="section-icon">📝</div>
          <h3 class="section-title">讨论内容</h3>
        </div>
        <div v-if="comments.length" class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-card animate-slide-in" :class="{ 'pinned-card': comment.is_pinned }">
            <div class="comment-header">
              <div class="user-info">
                <span class="user-avatar user-avatar-main">{{ comment.username.charAt(0).toUpperCase() }}</span>
                <span class="user-name">{{ comment.username }}</span>
                <span class="user-role-badge" :class="'role-' + comment.user_role">{{ getRoleText(comment.user_role) }}</span>
                <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
                <span v-if="comment.is_pinned" class="pin-badge">置顶</span>
              </div>
              <div class="comment-ops comment-actions">
                <button class="like-btn" :class="{ liked: comment.isLikedByUser }" @click="toggleLike(comment)" :title="comment.isLikedByUser ? '取消点赞' : '点赞'">
                  👍 {{ comment.like_count }}
                </button>
                <button v-if="canPin(comment)" class="pin-btn" :class="{ pinned: comment.is_pinned }" @click="togglePin(comment)" :title="comment.is_pinned ? '取消置顶' : '置顶'">
                  {{ comment.is_pinned ? '取消置顶' : '置顶' }}
                </button>
                <button v-if="canDelete(comment)" class="delete-btn" @click="confirmDelete(comment)" title="删除">删除</button>
                <button class="reply-btn" @click="replyTo(comment)">回复</button>
              </div>
            </div>
            <div class="comment-body">{{ comment.message }}</div>
            <div v-if="deleteConfirmId === comment.id" class="delete-confirm-box">
              <span>确认删除该评论？</span>
              <button class="confirm-btn" @click="deleteComment(comment)">确认</button>
              <button class="cancel-btn" @click="deleteConfirmId = null">取消</button>
            </div>
            <div v-if="replyingTo === comment.id" class="discussion-reply-box">
              <input v-model="replyContent" placeholder="回复内容..." />
              <button @click="sendReply(comment)">发送</button>
            </div>
            <div v-if="comment.replies && comment.replies.length" class="discussion-replies animate-reply-in">
              <div v-for="reply in comment.replies" :key="reply.id" class="discussion-reply">
                <div class="reply-header">
                  <span class="user-avatar">{{ reply.username.charAt(0).toUpperCase() }}</span>
                  <span class="user-name">{{ reply.username }}</span>
                  <span class="user-role-badge" :class="'role-' + reply.user_role">{{ getRoleText(reply.user_role) }}</span>
                  <span class="comment-time">{{ formatTime(reply.created_at) }}</span>
                  <button class="like-btn" :class="{ liked: reply.isLikedByUser }" @click="toggleLike(reply)" :title="reply.isLikedByUser ? '取消点赞' : '点赞'">
                    👍 {{ reply.like_count }}
                  </button>
                  <button v-if="canDelete(reply)" class="delete-btn" @click="confirmDelete(reply)" title="删除">删除</button>
                </div>
                <div class="reply-body">{{ reply.message }}</div>
                <div v-if="deleteConfirmId === reply.id" class="delete-confirm-box">
                  <span>确认删除该评论？</span>
                  <button class="confirm-btn" @click="deleteComment(reply)">确认</button>
                  <button class="cancel-btn" @click="deleteConfirmId = null">取消</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">💬</div>
          <h4>暂无评论</h4>
          <p>成为第一个发表观点的人吧！</p>

        </div>
        <div class="discussion-input-box">
          <input v-model="newComment" placeholder="输入评论..." />
          <button class="submit-btn" @click="addComment">发送</button>
        </div>
      </div>
      <!-- 注释掉题目切换按钮
      <div class="discussion-actions">
        <button @click="prevQuestion" :disabled="currentIndex === 0" class="discussion-btn">上一题</button>
        <button @click="nextQuestion" :disabled="currentIndex === questions.length - 1" class="discussion-btn">下一题</button>
      </div>

      -->
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, toRef } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizerStore } from '../../../../stores/organizer'

const route = useRoute()
const lectureId = route.params.id

const organizerStore = useOrganizerStore()
const comments = toRef(organizerStore, 'comments')
const loading = toRef(organizerStore, 'commentsLoading')

const newComment = ref('')
const replyingTo = ref<number|null>(null)
const replyContent = ref('')
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'))

function getRoleText(role: string) {
  if (role === 'organizer') return '组织者'
  if (role === 'speaker') return '讲师'
  if (role === 'listener') return '听众'
  return role
}
function formatTime(time: string) {
  const date = new Date(time)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff/60) + '分钟前'
  if (diff < 86400) return Math.floor(diff/3600) + '小时前'
  return date.getFullYear() + '-' + (date.getMonth()+1).toString().padStart(2,'0') + '-' + date.getDate().toString().padStart(2,'0')
}
function canPin(comment: any) {
  return user.value && (user.value.role === 'organizer' || user.value.role === 'speaker')
}
function canDelete(comment: any) {
  return user.value && (user.value.role === 'organizer' || user.value.role === 'speaker' || user.value.id === comment.user_id)
}

const deleteConfirmId = ref<number|null>(null)
function confirmDelete(comment: any) {
  deleteConfirmId.value = comment.id
}

async function toggleLike(comment: any) {
  await organizerStore.toggleLike(lectureId, comment.id)
}
async function togglePin(comment: any) {
  await organizerStore.togglePin(lectureId, comment.id)
}
async function deleteComment(comment: any) {
  await organizerStore.deleteComment(lectureId, comment.id)
  deleteConfirmId.value = null
}

onMounted(() => {
  user.value = JSON.parse(localStorage.getItem('user') || '{}')
  organizerStore.fetchComments(lectureId)
})

async function addComment() {
  if (!newComment.value.trim()) return
  await organizerStore.addComment(lectureId, newComment.value, 'text')
  newComment.value = ''
}

async function sendReply(comment: any) {
  if (!replyContent.value.trim()) return
  await organizerStore.sendReply(lectureId, comment.id, replyContent.value)
  replyContent.value = ''
  replyingTo.value = null
}

function replyTo(comment: any) {
  replyingTo.value = comment.id
  replyContent.value = ''
}

</script>
<style scoped>

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

.comments-section {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(16, 163, 127, 0.1);
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0f2fe 0%, #b2f5ea 100%);
  color: #059669;
  font-weight: bold;
  font-size: 1.1rem;
  margin-right: 6px;
  box-shadow: 0 1px 4px rgba(16,163,127,0.08);
}
.user-avatar-main {
  background: linear-gradient(135deg, #10a37f 0%, #b2f5ea 100%);
  color: #fff;
}
.user-role-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  vertical-align: middle;
}
.role-organizer {
  background: #fef3c7;
  color: #b45309;
}
.role-speaker {
  background: #dbeafe;
  color: #2563eb;
}
.role-listener {
  background: #f0fdf4;
  color: #059669;
}
.comment-time {
  margin-left: 10px;
  color: #94a3b8;
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
.reply-btn {
  background: linear-gradient(135deg, #e0f2fe 0%, #d1eefd 100%);
  color: #10a37f;
  border: 1px solid #10a37f;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 4px rgba(16,163,127,0.07);
}
.reply-btn:hover {
  background: linear-gradient(135deg, #cce6ff 0%, #b8e0ff 100%);
  color: #059669;
  box-shadow: 0 2px 8px rgba(16,163,127,0.13);
}

.discussion-reply-box {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
.discussion-replies {
  margin-top: 10px;
  margin-left: 36px;
  border-left: 3px solid #b2dfdb;
  padding-left: 16px;
  background: rgba(236,253,245,0.25);
  border-radius: 0 0 12px 12px;
  transition: background 0.2s;
}
.discussion-reply {
  background: linear-gradient(90deg, #f0fdf4 0%, #e0f2fe 100%);
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 10px;
  font-size: 0.97rem;
  color: #2d8c7f;
  box-shadow: 0 1px 6px rgba(44,209,171,0.07);
  position: relative;
  animation: replyBubbleIn 0.5s;
}
@keyframes replyBubbleIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-reply-in {
  animation: replyBubbleIn 0.5s;
}
.reply-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2px;
}
.reply-body {
  color: #374151;
  font-size: 0.95rem;
  line-height: 1.5;
}

.discussion-input-box {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: #f0fdfa;
  border-radius: 12px;
  border: 2px solid #a7f3d0;
}

.discussion-input-box input {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.5px solid #b2dfdb;
  font-size: 1rem;
  box-shadow: 0 1px 4px rgba(16,163,127,0.08);
  transition: border 0.2s, box-shadow 0.2s;
}
.discussion-input-box input:focus {
  border: 1.5px solid #10a37f;
  box-shadow: 0 2px 8px rgba(16,163,127,0.13);
}
.submit-btn {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 18px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s;
}
.submit-btn:hover {
  background: #059669;
}
.discussion-actions {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 12px;
}

.send-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.comment-ops.comment-actions {
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
.pin-badge {
  display: inline-block;
  background: #fef3c7;
  color: #b45309;
  font-size: 0.75rem;
  border-radius: 6px;
  padding: 2px 7px;
  margin-left: 8px;
  font-weight: 700;
  vertical-align: middle;
}
.pinned-card {
  border: 2px solid #f59e42;
  background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
  box-shadow: 0 4px 16px rgba(245,158,66,0.13);
}
.delete-confirm-box {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.97rem;
}
.confirm-btn {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 3px 12px;
  font-size: 0.95rem;
  cursor: pointer;
  margin-left: 6px;
}
.cancel-btn {
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 6px;
  padding: 3px 12px;
  font-size: 0.95rem;
  cursor: pointer;
}
/* 动画 */
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
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}
.animate-fade-in-delay {
  animation: fadeIn 0.8s ease-out 0.3s both;
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
.animate-slide-up {
  animation: slideUp 0.6s ease-out;
}
.animate-slide-up-delay {
  animation: slideUp 0.6s ease-out 0.2s both;
}
.animate-slide-in {
  animation: slideInRight 0.5s ease-out;
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
</style>
