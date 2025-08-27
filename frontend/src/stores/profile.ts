import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<any>({ username: '', email: '' })
  const settings = ref<any>({ notifications: 'all', theme: 'light' })
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProfile() {
    loading.value = true
    error.value = null
    try {
      const res = await axios.get('/api/profile')
      profile.value = res.data
      return res.data
    } catch (e: any) {
      error.value = '加载个人信息失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(payload: any) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.put('/api/profile', payload)
      profile.value = payload
      return res.data
    } catch (e: any) {
      error.value = '保存失败，请稍后重试'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      const res = await axios.get('/api/settings')
      settings.value = res.data
      return res.data
    } catch (e: any) {
      error.value = '加载设置失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(payload: any) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.put('/api/settings', payload)
      settings.value = payload
      return res.data
    } catch (e: any) {
      error.value = '保存失败，请稍后重试'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 密码敏感信息由组件管理，此处仅提供 ChangePassword 的 API 封装
  async function changePassword(currentPassword: string, newPassword: string) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.put('/api/password', {
        currentPassword,
        newPassword
      })
      return res.data
    } catch (e: any) {
      error.value = '修改密码失败，请检查当前密码是否正确'
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearError() { error.value = null }

  return {
    profile,
    settings,
    loading,
    error,
    fetchProfile,
    updateProfile,
    fetchSettings,
    updateSettings,
    changePassword,
    clearError
  }
})
