import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFormStore = defineStore('form', () => {
  const errors = ref<{ [k: string]: string }>({ username: '', password: '', confirmPassword: '', role: '', contact: '' })
  const errorMessage = ref('')
  const successMessage = ref('')

  function clearMessages() {
    errorMessage.value = ''
    successMessage.value = ''
    errors.value = { username: '', password: '', confirmPassword: '', role: '', contact: '' }
  }

  function clearFieldError(field: string) {
    try {
      // @ts-ignore
      errors.value[field] = ''
    } catch (e) {
      // ignore
    }
    if (errorMessage.value) errorMessage.value = ''
  }

  return {
    errors,
    errorMessage,
    successMessage,
    clearMessages,
    clearFieldError
  }
})
