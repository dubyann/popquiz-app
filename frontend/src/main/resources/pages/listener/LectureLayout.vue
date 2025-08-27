<template>
  <div class="lecture-layout">
    <aside class="sidebar">
      <router-link :to="`/listener/lecture/${lectureId}/quiz`" :class="{active: isActive('quiz')}">答题测验</router-link>
      <router-link :to="`/listener/lecture/${lectureId}/score`" :class="{active: isActive('score')}">成绩报告</router-link>
      <router-link :to="`/listener/lecture/${lectureId}/discussion`" :class="{active: isActive('discussion')}">互动讨论</router-link>
      <router-link :to="`/listener/lecture/${lectureId}/feedback`" :class="{active: isActive('feedback')}">进行反馈</router-link>
    </aside>
    <main class="content">
      <div class="content-card">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useListenerStore } from '../../../../stores/listener'
import { onMounted, watch } from 'vue'

// 使用路由与 Pinia store（listener 域）
const route = useRoute()
const listenerStore = useListenerStore()

// 讲座 ID（始终为字符串），组件和子路由可以使用该值
const lectureId = computed(() => String(route.params.id || ''))

// 侧边栏是否处于激活状态（用于高亮当前选项）
function isActive(tab: string) {
  return route.path.includes(`/${tab}`)
}

// 这里保留 listener store 的引用，未来可以在布局层统一触发
// 如自动 join、预加载讲座信息或统计（目前尚无额外副作用）

// 自动 join 和预加载逻辑：当布局挂载或 route.params.id 变化时触发一次
onMounted(async () => {
  const id = lectureId.value
  if (!id) return
  // 如果尚未 join，则尝试 join（避免重复调用）
  if (!listenerStore.joinedLectures.has(id)) {
    try {
      await listenerStore.joinLecture(id)
    } catch (e) {
      // join 失败时不阻塞预加载
      console.warn('auto join failed', e)
    }
  }
  // 并行预加载讲座详情与成绩数据（如果后端支持）
  listenerStore.fetchLecture(id).catch(() => {})
  listenerStore.loadScoreData?.(id).catch(() => {})
})

watch(() => route.params.id, (newVal, oldVal) => {
  const id = String(newVal || '')
  if (!id) return
  // 切换讲座时再次尝试预加载
  if (!listenerStore.joinedLectures.has(id)) {
    listenerStore.joinLecture(id).catch(() => {})
  }
  listenerStore.fetchLecture(id).catch(() => {})
  listenerStore.loadScoreData?.(id).catch(() => {})
})
</script>
<style scoped>
.lecture-layout {
  display: flex;
  min-height: 80vh;
  background: linear-gradient(90deg, #e0f7fa 0%, #f6fcfa 100%);
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(64,158,255,0.07);
  margin: 0;
  max-width: 100vw;
  width: 100vw;
}
.sidebar {
  width: 200px;
  min-width: 140px;
  background: linear-gradient(135deg, #a8e6cf 0%, #f5f5f5 100%);
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
  box-shadow: 2px 0 12px rgba(44,209,171,0.07);
  padding: 40px 0 40px 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
}
.sidebar a {
  display: block;
  width: 100%;
  padding: 14px 32px;
  margin-bottom: 0;
  font-size: 1.1rem;
  color: #2d8c7f;
  border-radius: 0 24px 24px 0;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.18s, color 0.18s, font-weight 0.18s;
}
.sidebar a.active, .sidebar a:hover {
  background: #e0f7fa;
  color: #26c6da;
  font-weight: 700;
}
.content {
  flex: 1;
  padding: 48px 32px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
}
.content-card {
  width: 100%;
  max-width: 900px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(44,209,171,0.07);
  padding: 36px 28px;
  min-height: 400px;
  box-sizing: border-box;
}
@media (max-width: 900px) {
  .lecture-layout {
    flex-direction: column;
    min-height: unset;
    border-radius: 12px;
    max-width: 100vw;
    width: 100vw;
  }
  .sidebar {
    flex-direction: row;
    width: 100%;
    min-width: unset;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 2px 8px rgba(44,209,171,0.07);
    padding: 18px 0 10px 0;
    align-items: center;
    justify-content: center;
    gap: 0;
  }
  .sidebar a {
    border-radius: 18px 18px 0 0;
    padding: 10px 18px;
    margin: 0 8px;
    text-align: center;
    font-size: 1rem;
  }
  .content {
    padding: 18px 4vw;
  }
  .content-card {
    padding: 18px 8px;
    min-height: 200px;
    border-radius: 12px;
    max-width: 100vw;
  }
}
</style>
