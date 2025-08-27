export function isOk(res: any): boolean {
  if (!res) return false
  // fetch Response has boolean ok
  if (typeof res.ok === 'boolean') return res.ok
  // axios Response has numeric status
  if (typeof res.status === 'number') return res.status >= 200 && res.status < 300
  // fallback: if res.data exists and provides success flag
  if (res.data !== undefined) {
    if (typeof res.data.success === 'boolean') return res.data.success
    return true
  }
  return false
}

export async function parseResponseData(res: any): Promise<any> {
  if (!res) return null
  // fetch Response
  if (typeof res.json === 'function') {
    try { return await res.json() } catch { return null }
  }
  // axios Response
  if (res.data !== undefined) return res.data
  return null
}
