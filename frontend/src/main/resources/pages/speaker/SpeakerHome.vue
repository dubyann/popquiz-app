<template>
  <div class="center-container">
    <div class="speaker-home-bg">
      <div class="speaker-home">
        <!-- 头部标题区域 -->
        <div class="header-section">
          <div class="title-icon">🎓</div>
          <h2 class="speaker-title">讲座管理</h2>
          <p class="subtitle">创建和管理您的讲座内容</p>
        </div>

        <!-- 操作按钮组 -->
        <div class="action-buttons">
          <button class="create-btn primary" @click="showCreate = true">
            <span class="btn-icon">✨</span>
            <span>创建新讲座</span>
          </button>
          <button class="create-btn secondary" @click="toggleLectures">
            <span class="btn-icon">📚</span>
            <span>{{ showLectures ? '隐藏讲座' : '已有讲座' }}</span>
          </button>
        </div>

        <!-- 讲座列表 -->
        <div v-if="showLectures" class="lecture-list">
          <div class="list-header">
            <h3>我的讲座</h3>
            <span class="lecture-count">{{ lectures.length }} 个讲座</span>
          </div>
          
          <div v-if="lectures.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <p>暂无创建任何讲座</p>
            <span>点击"创建新讲座"开始吧</span>
          </div>
          
          <div v-else class="lectures-grid">
            <div v-for="lecture in lectures" :key="lecture.id" class="lecture-card">
              <div class="card-header">
                <div class="status-badge" :class="getStatusClass(lecture.status)">
                  {{ getStatusText(lecture.status) }}
                </div>
                <div class="action-buttons-header">
                  <button 
                    v-if="lecture.status === 2" 
                    class="restart-btn" 
                    @click="restartLecture(lecture.id)" 
                    title="重新开始讲座"
                  >
                    <span>🔄</span>
                  </button>
                  <button class="delete-btn" @click="deleteLecture(lecture.id)" title="删除讲座">
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
              
              <router-link :to="`/speaker/lecture/${lecture.id}/upload`" class="card-content">
                <div class="lecture-title">{{ lecture.title }}</div>
                <div class="lecture-desc">{{ lecture.desc || '暂无简介' }}</div>
                <div class="lecture-meta">
                  <div class="lecture-speaker">
                    <span class="icon">👤</span>
                    {{ lecture.speaker }}
                  </div>
                </div>
              </router-link>
              
              <div class="card-footer">
                <span class="manage-text">点击进入管理</span>
                <span class="arrow">→</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 创建讲座模态框 -->
        <div v-if="showCreate" class="modal-bg" @click.self="showCreate = false">
          <div class="modal">
            <div class="modal-header">
              <h3>✨ 新建讲座</h3>
              <button class="close-btn" @click="showCreate = false">✕</button>
            </div>
            
            <div class="modal-body">
              <div class="input-group">
                <label for="new-lecture-title">讲座标题</label>
                <input id="new-lecture-title" v-model="newLecture.title" placeholder="请输入讲座标题" />
              </div>
              
              <div class="input-group">
                <label for="new-lecture-desc">讲座简介</label>
                <textarea id="new-lecture-desc" v-model="newLecture.desc" placeholder="请简要描述讲座内容..." rows="3"></textarea>
              </div>
              
              <div class="input-group">
                <label for="new-lecture-speaker">主讲人</label>
                <input id="new-lecture-speaker" v-model="newLecture.speaker" placeholder="请输入主讲人姓名" />
              </div>
            </div>
            
            <div class="modal-actions">
              <button class="btn-cancel" @click="showCreate = false">取消</button>
              <button class="btn-create" @click="createLecture">创建讲座</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { toRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSpeakerStore } from '../../../../stores/speaker'

// 使用 Pinia 的 speaker store 来集中管理讲者页面的状态与逻辑
const router = useRouter()
const speakerStore = useSpeakerStore()

// 模板直接绑定 store 中的响应式引用
const lectures = toRef(speakerStore, 'lectures')
const showCreate = toRef(speakerStore, 'showCreate')
const showLectures = toRef(speakerStore, 'showLectures')
const newLecture = toRef(speakerStore, 'newLecture')
const isLoading = toRef(speakerStore, 'isLoading')

// 辅助函数（保留原有文案）
const getStatusText = (status: number) => {
  switch (status) {
    case 0: return '未开始'
    case 1: return '进行中'
    case 2: return '已结束'
    default: return '未知'
  }
}

const getStatusClass = (status: number) => {
  switch (status) {
    case 0: return 'status-created'
    case 1: return 'status-teaching'
    case 2: return 'status-ended'
    default: return 'status-unknown'
  }
}

// 页面事件：调用 store 的方法
function toggleLectures() {
  speakerStore.toggleLectures()
}

async function createLecture() {
  try {
    const id = await speakerStore.createLecture()
    // 关闭模态并跳转到上传页面
    speakerStore.setShowCreate(false)
    if (id) router.push(`/speaker/lecture/${id}/upload`)
  } catch (e: any) {
    alert(e.message || '创建失败')
  }
}

async function deleteLecture(id: number) {
  if (!confirm('确定要删除该讲座吗？')) return
  try {
    await speakerStore.deleteLecture(id)
  } catch (e: any) {
    alert(e.message || '删除失败')
  }
}

async function restartLecture(id: number) {
  if (!confirm('确定要重新开始这个讲座吗？\n\n重新开始后：\n• 讲座状态将变为"进行中"\n• 您可以继续管理题目和与听众互动\n• 之前的数据和统计不会丢失')) return
  try {
    await speakerStore.restartLecture(id)
    if (confirm('讲座已成功重新开始！\n\n是否现在就进入讲座管理页面？')) {
      router.push(`/speaker/lecture/${id}/upload`)
    }
  } catch (e: any) {
    alert(e.message || '重新开始失败')
  }
}

onMounted(() => {
  // 页面加载时不自动拉取，除非用户展开列表。
})
</script>
<style scoped>
.center-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-height: 100vh;
  padding: 0;
  margin: 0;
}

.speaker-home-bg {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  padding: 2rem 1rem;
  box-sizing: border-box;
  position: relative;
}

.speaker-home-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 50%, rgba(16, 163, 127, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(5, 150, 105, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(4, 120, 87, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

.speaker-home {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  width: 100%;
  max-width: 900px;
  min-height: 500px;
  box-shadow: 
    0 25px 60px rgba(0, 0, 0, 0.08),
    0 10px 30px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
  z-index: 1;
    -webkit-backdrop-filter: blur(20px);
}

.speaker-home::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #10a37f 0%, #059669 50%, #047857 100%);
  border-radius: 24px 24px 0 0;
}

/* 头部区域 */
.header-section {
  text-align: center;
  margin-bottom: 2.5rem;
  width: 100%;
}

.title-icon {
  font-size: 3.5rem;
  margin-bottom: 1.2rem;
  filter: drop-shadow(0 4px 12px rgba(16, 163, 127, 0.3));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.speaker-title {
  font-size: 2.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  background-clip: text;
  margin: 0 0 0.8rem 0;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 4px rgba(16, 163, 127, 0.1);
}

.subtitle {
  font-size: 1.2rem;
  color: #047857;
  margin: 0;
  font-weight: 500;
  opacity: 0.8;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1.2rem 2.5rem;
  border: none;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 200px;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.create-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.create-btn:hover::before {
  left: 100%;
}

.create-btn.primary {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  box-shadow: 0 8px 25px rgba(16, 163, 127, 0.3);
}

.create-btn.secondary {
  background: rgba(255, 255, 255, 0.9);
  color: #10a37f;
  border: 2px solid #10a37f;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
/* stray duplicates removed */

.create-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(16, 163, 127, 0.4);
}

.create-btn.secondary:hover {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  border-color: transparent;
}

.btn-icon {
  font-size: 1.2rem;
}

/* 讲座列表 */
.lecture-list {
  width: 100%;
  margin-top: 1rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.list-header h3 {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.lecture-count {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  padding: 0.5rem 1.2rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(71, 85, 105, 0.15);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.6;
  filter: grayscale(20%);
}

.empty-state p {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0 0 0.8rem 0;
  color: #475569;
}

.empty-state span {
  font-size: 1rem;
  opacity: 0.7;
}

.lectures-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  width: 100%;
  padding: 0 1rem;
}

.lecture-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 0.8rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.lecture-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
}

.lecture-card:hover {
  transform: translateY(-8px);
  border-color: rgba(16, 163, 127, 0.3);
  box-shadow: 0 20px 50px rgba(16, 163, 127, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.status-badge {
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.status-created {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

.status-teaching {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.status-ended {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.status-unknown {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
}

.action-buttons-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.restart-btn {
  background: rgba(16, 163, 127, 0.1);
  color: #10a37f;
  border: none;
  border-radius: 10px;
  padding: 0.6rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.restart-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(16, 163, 127, 0.3), transparent);
  transition: left 0.5s;
}

.restart-btn:hover::before {
  left: 100%;
}

.restart-btn:hover {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(16, 163, 127, 0.3);
}

.restart-btn:hover span {
  animation: spin 0.6s ease-in-out;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: none;
  border-radius: 10px;
  padding: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.1);
}

.card-content {
  text-decoration: none;
  color: inherit;
  display: block;
  margin-bottom: 1rem;
}

.lecture-title {
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.8rem;
  line-height: 1.3;
}

.lecture-desc {
  color: #64748b;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.2rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lecture-meta {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: #94a3b8;
}

.lecture-speaker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 163, 127, 0.1);
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  color: #10a37f;
  font-weight: 500;
}

.icon {
  font-size: 1rem;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  color: #10a37f;
  font-size: 0.9rem;
  font-weight: 600;
}

.manage-text {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.arrow {
  font-size: 1.2rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #10a37f;
}

.lecture-card:hover .arrow {
  transform: translateX(6px);
}

/* 模态框 */
.modal-bg {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  padding: 1rem;
}

.modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 
    0 30px 80px rgba(0, 0, 0, 0.2),
    0 15px 40px rgba(16, 163, 127, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: rgba(148, 163, 184, 0.15);
  border: none;
  border-radius: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.3rem;
  color: #64748b;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  transform: scale(1.1);
}

.modal-body {
  padding: 2rem;
}

.input-group {
  margin-bottom: 1.8rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.8rem;
  font-weight: 600;
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 1rem;
}

.input-group input,
.input-group textarea {
  width: 100%;
  padding: 1rem 1.2rem;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.input-group input:focus,
.input-group textarea:focus {
  outline: none;
  border-color: #10a37f;
  box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.1);
  background: rgba(255, 255, 255, 0.95);
}

.input-group textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem 2rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-create {
  padding: 0.8rem 1.8rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  min-width: 120px;
}

.btn-cancel {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
}

.btn-cancel:hover {
  background: rgba(148, 163, 184, 0.25);
  transform: translateY(-1px);
}

.btn-create {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 163, 127, 0.3);
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 163, 127, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .speaker-home-bg {
    padding: 1rem 0.5rem;
  }
  
  .speaker-home {
    padding: 2rem 1.5rem;
    border-radius: 16px;
  }
  
  .speaker-title {
    font-size: 2rem;
  }
  
  .action-buttons {
    flex-direction: column;
    width: 100%;
  }
  
  .create-btn {
    width: 100%;
  }
  
  .lectures-grid {
    grid-template-columns: 1fr;
  }
  
  .modal {
    margin: 1rem;
    max-width: none;
    border-radius: 16px;
  }
}

@media (max-width: 480px) {
  .speaker-title {
    font-size: 1.8rem;
  }
  
  .title-icon {
    font-size: 2.5rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .btn-cancel,
  .btn-create {
    width: 100%;
  }
  
  .action-buttons-header {
    gap: 0.3rem;
  }
  
  .restart-btn,
  .delete-btn {
    width: 32px;
    height: 32px;
    padding: 0.4rem;
    font-size: 0.9rem;
  }
}
</style> 