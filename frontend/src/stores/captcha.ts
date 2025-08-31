import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useCaptchaStore = defineStore('captcha', () => {
  const captchaToken = ref<string>('')
  const captchaTarget = ref<number | null>(null)
  const lastCaptchaSvg = ref<string>('')
  const lastCaptchaSvgText = ref<string>('')

  async function fetchCaptcha() {
    try {
      const r = await axios.get('/api/auth/captcha')
      captchaToken.value = r.data.captchaToken

      const rawSvgText = r.data.svgText || ''
      let svgText = rawSvgText

      try {
        if (svgText && /&lt;|&gt;|&amp;/.test(svgText)) {
          const ta = document.createElement('textarea')
          ta.innerHTML = svgText
          svgText = ta.value || svgText
        }
      } catch (err) {
        // ignore
      }

      lastCaptchaSvgText.value = svgText

      if (r.data.svg) {
        lastCaptchaSvg.value = r.data.svg
      } else {
        const txt = (svgText || '').trim()
        if (!txt) {
          lastCaptchaSvg.value = ''
        } else if (/^data%3A/i.test(txt)) {
          try { lastCaptchaSvg.value = decodeURIComponent(txt) } catch (e) { lastCaptchaSvg.value = txt }
        } else if (/^data:/i.test(txt)) {
          lastCaptchaSvg.value = txt
        } else if (/^<svg[\s>]/i.test(txt)) {
          try { lastCaptchaSvg.value = 'data:image/svg+xml;utf8,' + encodeURIComponent(txt) } catch (e) { lastCaptchaSvg.value = '' }
        } else {
          try { lastCaptchaSvg.value = 'data:image/svg+xml;utf8,' + encodeURIComponent(txt) } catch (e) { lastCaptchaSvg.value = '' }
        }
      }

      captchaTarget.value = r.data.target
      return r.data
    } catch (e) {
      captchaToken.value = ''
      captchaTarget.value = null
      return null
    }
  }

  function refreshCaptcha() {
    captchaToken.value = ''
    captchaTarget.value = null
    return fetchCaptcha()
  }

  return {
    captchaToken,
    captchaTarget,
    lastCaptchaSvg,
    lastCaptchaSvgText,
    fetchCaptcha,
    refreshCaptcha
  }
})
