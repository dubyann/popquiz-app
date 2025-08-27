// 通用错误格式化工具（供前端页面复用）
// 返回一个适合展示给用户的错误信息字符串，接收任意错误对象

export function formatErrorMessage(error: unknown): string {
  const errAny = error as any
  // 优先处理 axios 风格的响应体
  if (errAny && errAny.response) {
    const status = errAny.response.status
    const data = errAny.response.data || {}

    if (status === 400) {
      if (data.error?.includes('用户名')) return '用户名格式不正确，请使用2-20个字符的字母、数字、下划线或中文'
      if (data.error?.includes('密码')) return '密码格式不正确，请使用6-20个字符'
      if (data.error?.includes('角色')) return '请选择有效的用户角色'
      return data.error || '请求参数错误，请检查输入内容'
    }

    if (status === 409) return data.error || '用户名或联系方式已被注册，请选择其他'
    if (status === 422) return '输入数据验证失败，请检查输入内容'
  if (status === 429) return '请求过于频繁，请稍后再试'
  if (status === 500) return '服务器内部错误，请稍后重试或联系技术支持'

  return data.error || `请求失败 (错误代码: ${status})，请稍后重试`
  }

  // 网络层错误（无响应但有 request）
  if (errAny && errAny.request) {
    if (errAny.code === 'ERR_NETWORK' || (errAny.message && String(errAny.message).includes('Network Error'))) return '无法连接到服务器，请检查网络或后端服务是否已启动'
    if (errAny.code === 'ECONNREFUSED') return '服务器拒绝连接，请确认后端服务已启动'
    return '网络请求超时或失败，请检查网络连接'
  }

  // 其它非 axios 错误
  if (errAny && errAny.message) return String(errAny.message)
  return '请求过程中出现未知错误，请刷新页面后重试'
}
