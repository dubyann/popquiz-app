<template>
  <div class="upload-wrapper">
    <div class="header-section">
      <div class="title-icon">📄</div>
      <h2 class="upload-title">智能题目生成器</h2>
      <p class="subtitle">上传或选择文件，AI 为您生成题目</p>
    </div>

    <div class="file-operations">
      <div class="operation-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'upload' }" @click="activeTab = 'upload'">上传新文件</button>
        <button class="tab-btn" :class="{ active: activeTab === 'select' }" @click="activeTab = 'select'">选择已有文件</button>
      </div>

      <div v-show="activeTab === 'upload'" class="upload-panel">
        <label class="upload-label">
          <input type="file" class="upload-input" @change="handleFile" accept=".pdf,.ppt,.pptx,.txt,.mp3,.mp4" />
          <div class="upload-content">点击上传文件（支持多种格式）</div>
        </label>
      </div>

      <div v-show="activeTab === 'select'" class="select-panel">
        <div class="select-header">
          <button class="refresh-btn" @click="loadUploadedFiles">🔄 刷新</button>
          <button class="select-files-btn" @click="openFileSelector">选择文件 ({{ selectedFiles.length }})</button>
        </div>
      </div>
    </div>

    <div class="action-buttons">
      <button class="main-btn" @click="generateQuiz" :disabled="!hasSelectedFiles || isGenerating">{{ isGenerating ? '生成中…' : '生成题目' }}</button>
      <button class="main-btn" @click="regenerateQuiz" :disabled="!currentGroupId || isRegenerating">{{ isRegenerating ? '重新生成中…' : '重新生成' }}</button>
      <button class="main-btn" @click="publishQuiz" :disabled="isPublishButtonDisabled">{{ isPublishing ? '发布中…' : '发布题目' }}</button>
      <button class="main-btn end-lecture-btn" @click="endLecture" :disabled="isEndingLecture">结束讲座</button>
    </div>

    <div v-if="quizzes.length" class="quiz-list">
      <div v-for="(q, i) in quizzes" :key="q.id" class="quiz-item">
        <div class="question">{{ i + 1 }}. {{ q.question }}</div>
        <ul>
          <li v-for="(opt, oi) in q.options" :key="oi">{{ String.fromCharCode(65 + oi) }}. {{ opt }}</li>
        </ul>
      </div>
    </div>

    <div v-if="showFileSelector" class="file-selector-overlay" @click="closeFileSelector">
      <div class="file-selector-modal" @click.stop>
        <div v-if="loading">加载中…</div>
        <div v-else>
          <div v-if="uploadedFiles.length === 0">暂无已上传文件</div>
          <div v-else>
            <label v-for="f in uploadedFiles" :key="f.id">
              <input type="checkbox" :value="f.id" v-model="tempSelectedFileIds" /> {{ f.original_name || f.filename }}
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeFileSelector">取消</button>
          <button @click="confirmFileSelection" :disabled="!tempSelectedFileIds.length">确认 ({{ tempSelectedFileIds.length }})</button>
        </div>
      </div>
    </div>

    <teleport to="body">
      <div v-for="n in notifications" :key="n.id" class="notification" :class="`notification-${n.type}`">{{ n.message }}</div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../../../../utils/api'
import { useRoute, useRouter } from 'vue-router'
import { useSpeakerStore } from '../../../../stores/speaker'
import { useNotificationsStore } from '../../../../stores/notifications'

type Quiz = { id: string | number; question: string; options: string[] }
type UploadedFile = { id: string | number; filename: string; original_name?: string; size?: number }

const route = useRoute()
const router = useRouter()
const lectureId = String(route.params.id || '')
function getSpeakerStore() { try { return useSpeakerStore() } catch (e) { console.debug('speakerStore not ready', e); return null } }

const quizzes = ref<Quiz[]>([])
const activeTab = ref('upload')
const selectedFiles = ref<UploadedFile[]>([])
const uploadedFiles = ref<UploadedFile[]>([])
const tempSelectedFileIds = ref<(string | number)[]>([])
const showFileSelector = ref(false)
const loading = ref(false)

const currentGroupId = ref('')
const quizIds = ref<number[]>([])

const isGenerating = ref(false)
const isRegenerating = ref(false)
const isPublishing = ref(false)
const isEndingLecture = ref(false)

// 不在模块顶层依赖 store 的具体类型，运行时按需读取
const notificationsFallback = ref<any[]>([])
function getNotificationsStore() { try { return useNotificationsStore() } catch (e) { console.debug('notificationsStore not ready', e); return null } }
const notifications = computed(() => {
  const ns = getNotificationsStore()
  if (ns && (ns as any).notifications) return (ns as any).notifications
  return notificationsFallback
})

const hasSelectedFiles = computed(() => selectedFiles.value.length > 0)
const isPublishButtonDisabled = computed(() => quizzes.value.length === 0 || isPublishing.value)

// authentication header is handled by `api` interceptors

function showNotification(msg: string, type: 'success' | 'error' = 'success') {
  const ns = getNotificationsStore()
  if (ns && typeof (ns as any).push === 'function') {
    try { (ns as any).push(msg, type) } catch (e) { console.debug('notify push failed', e) }
  } else {
    // fallback: local transient notification
    notificationsFallback.value.push({ id: Date.now(), message: msg, type })
    // auto-remove after 4s
    setTimeout(() => { notificationsFallback.value.shift() }, 4000)
  }
}

const handleFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  try {
    // Let the browser/axios set multipart boundary; api adds Authorization
    const res = await api.post(`/api/upload/${lectureId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    showNotification('上传成功', 'success')
    if (res.data?.file) uploadedFiles.value.unshift(res.data.file)
  } catch (err) {
    console.debug('upload failed', err)
    showNotification('上传失败', 'error')
  }
}

const loadUploadedFiles = async () => {
  loading.value = true
  try {
  const res = await api.get(`/api/files/${lectureId}`)
    uploadedFiles.value = res.data.files || []
  } catch (err) {
    console.debug('load files failed', err)
    showNotification('加载文件失败', 'error')
  } finally {
    loading.value = false
  }
}

const confirmFileSelection = () => {
  selectedFiles.value = uploadedFiles.value.filter(f => tempSelectedFileIds.value.includes(f.id))
  tempSelectedFileIds.value = []
  showFileSelector.value = false
}

const openFileSelector = () => { showFileSelector.value = true; loadUploadedFiles() }
const closeFileSelector = () => { showFileSelector.value = false; tempSelectedFileIds.value = [] }

const removeSelectedFile = (id: string | number) => { selectedFiles.value = selectedFiles.value.filter(f => f.id !== id) }

const getSelectedFileIds = () => selectedFiles.value.map(f => f.id)

const generateQuiz = async () => {
  const fileIds = getSelectedFileIds()
  if (!fileIds.length) return showNotification('请选择文件后生成题目', 'error')
  isGenerating.value = true
  try {
  const res = await api.post(`/api/quizzes/generate/${lectureId}`, { file_ids: fileIds, count: 5 })
    quizzes.value = (res.data.data || []).map((q: any) => ({ id: q.id || Math.random().toString(), question: q.question, options: [q.option_a, q.option_b, q.option_c, q.option_d] }))
    currentGroupId.value = res.data.group_id || ''
    quizIds.value = res.data.quizIds || []
    showNotification('生成成功', 'success')
  } catch (err) {
    console.debug('generate failed', err)
    showNotification('生成失败', 'error')
  } finally { isGenerating.value = false }
}

const regenerateQuiz = async () => {
  if (!currentGroupId.value) return showNotification('请先生成题目组再重生', 'error')
  isRegenerating.value = true
  try {
  const res = await api.post(`/api/quizzes/${lectureId}/quizzes/regenerate`, { group_id: currentGroupId.value, file_ids: getSelectedFileIds(), count: 5 })
    quizzes.value = (res.data.data || []).map((q: any) => ({ id: q.id || Math.random().toString(), question: q.question, options: [q.option_a, q.option_b, q.option_c, q.option_d] }))
    showNotification('重新生成成功', 'success')
  } catch (err) {
    console.debug('regenerate failed', err)
    showNotification('重新生成失败', 'error')
  } finally { isRegenerating.value = false }
}

const publishQuiz = async () => {
  if (!quizIds.value.length) return showNotification('没有可发布的题目', 'error')
  isPublishing.value = true
  try {
  await api.post(`/api/quizzes/publish/${lectureId}`, { quiz_ids: quizIds.value })
    showNotification('发布成功', 'success')
    quizzes.value = []
    quizIds.value = []
    currentGroupId.value = ''
  } catch (err) {
    console.debug('publish failed', err)
    showNotification('发布失败', 'error')
  } finally { isPublishing.value = false }
}

const startLecture = async () => {
  try {
    await (getSpeakerStore() as any)?.startLecture?.(lectureId)
    showNotification('讲座已开始', 'success')
  } catch (e) {
    console.debug('startLecture failed', e)
    showNotification('开始讲座失败', 'error')
  }
}

const endLecture = async () => {
  if (!confirm('确定结束讲座？')) return
  isEndingLecture.value = true
  try {
    await (getSpeakerStore() as any)?.endLecture?.(lectureId)
    showNotification('讲座已结束', 'success')
    router.push('/speaker/home')
  } catch (e) {
    console.debug('endLecture failed', e)
    showNotification('结束失败', 'error')
  } finally {
    isEndingLecture.value = false
  }
}

onMounted(() => { startLecture(); loadUploadedFiles() })
</script>

<style scoped>
/* --- styles (kept from original file) --- */
.upload-wrapper { max-width: 880px; margin: 0 auto; padding: 1.2rem; background: #fff; border-radius: 12px }
.header-section { text-align: center; margin-bottom: 1rem }
.action-buttons { display:flex; gap:0.6rem; flex-wrap:wrap }
.main-btn { padding:0.6rem 1rem; border-radius:8px; background:#10a37f; color:#fff; border:none }
.end-lecture-btn { background:#ef4444 }
.file-selector-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center }
.file-selector-modal { background:#fff; padding:1rem; border-radius:8px; width:90%; max-width:520px }
.notification { position:fixed; top:12px; right:12px; background:#111; color:#fff; padding:0.6rem 1rem; border-radius:6px }
.main-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 1.8rem;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: center;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.main-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.main-btn:hover::before {
  left: 100%;
}

.generate-btn {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
}

.generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0e8c6b 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 163, 127, 0.3);
}

.regenerate-btn {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  color: white;
}

.regenerate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(4, 120, 87, 0.3);
}

.publish-btn {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  position: relative;
}

.publish-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);
}

.publish-btn:disabled {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  cursor: wait;
  position: relative;
  overflow: hidden;
}

.publish-btn:disabled::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: publishingShimmer 1.5s ease-in-out infinite;
}

.btn-disabled {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow: none !important;
}

.btn-disabled:hover {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  transform: none !important;
  box-shadow: none !important;
}

.unpublished-badge {
  display: inline-block;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  margin-left: 0.5rem;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.end-lecture-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

.end-lecture-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
}

.view-published-btn {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: white;
}

.view-published-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(52, 211, 153, 0.3);
}

.main-btn:disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1.1rem;
}

.published-badge {
  display: inline-block;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  margin-left: 0.5rem;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

.published-quiz {
  border-left: 4px solid #16a34a;
  background: rgba(22, 163, 74, 0.05);
}

.quiz-group-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.quiz-meta {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  color: #6b7280;
}

.publish-time {
  font-style: italic;
}

/* (rest of CSS omitted in patch for brevity; kept in file) */
</style>
.file-selector-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center }
.file-selector-modal { background:#fff; padding:1rem; border-radius:8px; width:90%; max-width:520px }
.notification { position:fixed; top:12px; right:12px; background:#111; color:#fff; padding:0.6rem 1rem; border-radius:6px }
.main-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 1.8rem;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: center;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.main-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.main-btn:hover::before {
  left: 100%;
}

.generate-btn {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
}

.generate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0e8c6b 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 163, 127, 0.3);
}

.regenerate-btn {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  color: white;
}

.regenerate-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(4, 120, 87, 0.3);
}

.publish-btn {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  position: relative;
}

.publish-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);
}

/* 发布状态的特殊动画 */
.publish-btn:disabled {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  cursor: wait;
  position: relative;
  overflow: hidden;
}

.publish-btn:disabled::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: publishingShimmer 1.5s ease-in-out infinite;
}

/* 没有可发布题目时的禁用状态 */
.btn-disabled {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow: none !important;
}

.btn-disabled:hover {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  transform: none !important;
  box-shadow: none !important;
}

/* 未发布标记样式 */
.unpublished-badge {
  display: inline-block;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  margin-left: 0.5rem;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.end-lecture-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

.end-lecture-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
}

.view-published-btn {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: white;
}

.view-published-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(52, 211, 153, 0.3);
}

.main-btn:disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1.1rem;
}

/* 已发布题目样式 */
.published-badge {
  display: inline-block;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  margin-left: 0.5rem;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

.published-quiz {
  border-left: 4px solid #16a34a;
  background: rgba(22, 163, 74, 0.05);
}

.quiz-group-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.quiz-meta {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  color: #6b7280;
}

.publish-time {
  font-style: italic;
}

/* 已发布题目空状态 */
.empty-published-section {
  margin-top: 2rem;
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(16, 163, 127, 0.1);
  box-shadow: 0 4px 20px rgba(16, 163, 127, 0.08);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.empty-published-content .empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.6;
  display: block;
}

.empty-published-content h3 {
  font-size: 1.5rem;
  color: #6b7280;
  margin-bottom: 0.8rem;
  font-weight: 600;
}

.empty-published-content p {
  color: #9ca3af;
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
  max-width: 500px;
  margin: 0 auto;
}

/* 已发布题目加载状态 */
.loading-published-section {
  margin-top: 2rem;
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(16, 163, 127, 0.1);
  box-shadow: 0 4px 20px rgba(16, 163, 127, 0.08);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.loading-published-content .loading-spinner {
  font-size: 2rem;
  margin-bottom: 1rem;
  display: block;
  animation: spin 1.5s linear infinite;
}

.loading-published-content p {
  color: #6b7280;
  font-size: 1.1rem;
  margin: 0;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 文件选择弹窗 */
.file-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease-out;
}

.file-selector-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(16, 163, 127, 0.2);
  border: 1px solid rgba(16, 163, 127, 0.1);
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid rgba(16, 163, 127, 0.1);
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #10a37f;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
}

.modal-icon {
  font-size: 1.6rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  transform: scale(1.1);
}

.modal-body {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.5rem 1.5rem;
  color: #6b7280;
}

.loading-spinner {
  font-size: 2.5rem;
  margin-bottom: 0.8rem;
  animation: spin 1s linear infinite;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 0.8rem;
  opacity: 0.6;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.file-item {
  border: 2px solid rgba(16, 163, 127, 0.1);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: #ffffff;
}

.file-item:hover {
  border-color: rgba(16, 163, 127, 0.3);
  box-shadow: 0 3px 12px rgba(16, 163, 127, 0.08);
}

.file-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  cursor: pointer;
  width: 100%;
}

.file-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #10a37f;
  cursor: pointer;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.file-icon {
  font-size: 2rem;
  color: #10a37f;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
}

.file-size {
  font-size: 0.85rem;
  color: #6b7280;
}

.file-date {
  font-size: 0.8rem;
  color: #9ca3af;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 2px solid rgba(16, 163, 127, 0.1);
  background: #f9fafb;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.cancel-btn {
  background: #e5e7eb;
  color: #374151;
}

.cancel-btn:hover {
  background: #d1d5db;
  transform: translateY(-1px);
}

.confirm-btn {
  background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0e8c6b 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(16, 163, 127, 0.25);
}

.confirm-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

/* 通知组件样式 */
.notification {
  position: fixed !important;
  top: 20px !important;
  right: 20px !important;
  z-index: 99999 !important;
  min-width: 320px;
  max-width: 450px;
  padding: 1.2rem 1.8rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  animation: slideInRight 0.3s ease-out;
  border: 1px solid transparent;
  word-wrap: break-word;
  line-height: 1.5;
  pointer-events: auto !important;
  transform: translateZ(999px) !important;
  isolation: isolate;
}

.notification-success {
  background: linear-gradient(135deg, rgba(16, 163, 127, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
  border-color: rgba(16, 163, 127, 0.3);
  color: white;
}

.notification-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%);
  border-color: rgba(239, 68, 68, 0.3);
  color: white;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notification-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.notification-message {
  font-weight: 500;
  line-height: 1.4;
}

/* 生成题目时的遮罩层样式 */
.generating-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease-out;
}

.generating-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(16, 163, 127, 0.3);
  border: 2px solid rgba(16, 163, 127, 0.2);
  padding: 3rem 2.5rem;
  max-width: 420px;
  width: 90vw;
  text-align: center;
  animation: slideUp 0.4s ease-out;
  position: relative;
  overflow: hidden;
}

.generating-modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #10a37f 0%, #059669 50%, #047857 100%);
}

.generating-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.generating-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 0.5rem;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 4px solid rgba(16, 163, 127, 0.2);
  border-top: 4px solid #10a37f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-ai-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  animation: pulse 2s ease-in-out infinite;
}

.generating-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10a37f;
  margin: 0;
  letter-spacing: 0.3px;
}

.generating-desc {
  font-size: 1rem;
  color: #047857;
  margin: 0;
  line-height: 1.6;
  opacity: 0.9;
}

.generating-progress {
  margin-top: 1rem;
}

.progress-dots {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.dot {
  width: 8px;
  height: 8px;
  background: #10a37f;
  border-radius: 50%;
  animation: dotPulse 1.5s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* 提示区域 */
.tip-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(16, 163, 127, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(16, 163, 127, 0.2);
  margin-bottom: 2rem;
}

.tip {
  color: #047857;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  text-align: center;
}

/* 题目列表区域 */
.quiz-list-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-icon {
  font-size: 2rem;
}

.quiz-list-title {
  color: #10a37f;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  text-align: center;
}

.quiz-bubble-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.quiz-bubble {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(16, 163, 127, 0.1);
  padding: 1.5rem;
  border: 1px solid rgba(16, 163, 127, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.quiz-bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #10a37f 0%, #059669 100%);
}

.quiz-bubble:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(16, 163, 127, 0.2);
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(16, 163, 127, 0.1);
}

.question-number {
  font-size: 1.1rem;
  color: #10a37f;
  font-weight: 700;
}

.question-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: scale(1.1);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: scale(1.1);
}

.quiz-question {
  font-size: 1.2rem;
  color: #1f2937;
  margin-bottom: 1rem;
  font-weight: 600;
  line-height: 1.5;
}

.quiz-options {
  list-style: none;
  padding: 0;
  margin: 0;
}

.quiz-options li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid rgba(16, 163, 127, 0.1);
  transition: all 0.2s ease;
}

.quiz-options li:hover {
  background: rgba(16, 163, 127, 0.05);
  border-color: rgba(16, 163, 127, 0.2);
}

.quiz-options li.correct-option {
  background: linear-gradient(135deg, rgba(16, 163, 127, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
  border-color: #10a37f;
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.1);
}

.option-label {
  font-weight: 700;
  color: #10a37f;
  min-width: 24px;
}

.option-text {
  flex: 1;
  color: #374151;
  font-weight: 500;
}

.correct-mark {
  color: #10a37f;
  font-weight: 700;
  font-size: 0.9rem;
  background: rgba(16, 163, 127, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

/* 动画效果 */
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

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes quizItemSlide {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes dotPulse {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.8;
  }
}

@keyframes publishingShimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 应用动画 */
.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}

.animate-fade-in-delay {
  animation: fadeIn 0.8s ease-out 0.2s both;
}

.animate-fade-in-delay-2 {
  animation: fadeIn 0.8s ease-out 0.4s both;
}

.animate-slide-up {
  animation: slideUp 0.8s ease-out 0.3s both;
}

.animate-slide-up-delay {
  animation: slideUp 0.8s ease-out 0.6s both;
}

.animate-bounce {
  animation: bounce 2s infinite;
}

.animate-quiz-item {
  animation: quizItemSlide 0.6s ease-out both;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .action-buttons {
    gap: 0.8rem;
  }
  
  .main-btn {
    min-width: 130px;
    padding: 0.8rem 1.5rem;
    font-size: 0.95rem;
  }
}

@media (max-width: 768px) {
  .upload-wrapper {
    padding: 1.5rem;
    margin: 1rem;
    max-height: none;
    overflow: visible;
  }
  
  .upload-title {
    font-size: 2rem;
  }
  
  .title-icon {
    font-size: 3rem;
  }
  
  .upload-content {
    padding: 2rem 1rem;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }
  
  .main-btn {
    width: 100%;
    max-width: 280px;
    min-width: 200px;
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }
  
  .quiz-bubble {
    padding: 1rem;
  }
  
  .bubble-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  
  .question-actions {
    align-self: flex-end;
  }
}

@media (max-width: 480px) {
  .upload-wrapper {
    margin: 0.5rem;
    padding: 1rem;
    max-height: none;
    overflow: visible;
  }
  
  .upload-title {
    font-size: 1.8rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .quiz-options li {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .correct-mark {
    align-self: flex-end;
  }
  
  /* 讲座信息区域移动端适配 */
  .lecture-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .lecture-status {
    flex-direction: column;
    gap: 0.8rem;
  }
  
  .status-item {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .end-lecture-btn-compact {
    width: 100%;
    justify-content: center;
  }
  
  .file-selector-modal {
    width: 95vw;
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 1rem 1.5rem;
  }
  
  .modal-title {
    font-size: 1.2rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .operation-tabs {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .tab-btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }
  
  .selected-files-list {
    flex-direction: column;
  }
  
  .selected-file-item {
    padding: 0.5rem 0.75rem;
  }
  
  .generating-modal {
    padding: 2rem 1.5rem;
    max-width: 350px;
  }
  
  .generating-title {
    font-size: 1.3rem;
  }
  
  .generating-desc {
    font-size: 0.9rem;
  }
  
  .generating-spinner {
    width: 60px;
    height: 60px;
  }
  
  .spinner-ai-icon {
    font-size: 1.5rem;
  }
  
  .notification {
    top: 10px !important;
    right: 10px !important;
    left: 10px !important;
    min-width: auto;
    max-width: none;
    z-index: 99999 !important;
    position: fixed !important;
    transform: translateZ(999px) !important;
    isolation: isolate;
  }
  
  .notification-message {
    font-size: 0.9rem;
  }
