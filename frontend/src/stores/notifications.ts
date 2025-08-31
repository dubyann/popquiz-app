import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<{ id: number; message: string; type: 'success' | 'error' }[]>([])
  let seq = 1

  function push(message: string, type: 'success' | 'error' = 'success') {
    const id = seq++
    notifications.value.push({ id, message, type })
    setTimeout(() => remove(id), 4000)
  }

  function remove(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return { notifications, push, remove }
})
