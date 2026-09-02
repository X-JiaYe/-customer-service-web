// 后端 API 客户端：短期 token 鉴权 + SSE 流式对话
// 长期 API Key 只在登录那一刻提交，前端只持有短期 token，不落 key。

export interface ChatEvent {
  delta?: string
  done?: boolean
}

export interface LoginResult {
  token: string
  tenant: string
  expires_in: number
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function getToken(): string | null {
  return sessionStorage.getItem('cs_token')
}

export function setToken(token: string): void {
  sessionStorage.setItem('cs_token', token)
}

export function clearToken(): void {
  sessionStorage.removeItem('cs_token')
}

function authHeaders(json = true): Record<string, string> {
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

// 登录：用 API Key 换取短期 token（key 不落 localStorage）
export async function login(apiKey: string): Promise<LoginResult> {
  const resp = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  })
  if (!resp.ok) throw new Error('API Key 无效或登录失败')
  return resp.json()
}

export async function sendFeedback(rating: 'up' | 'down', sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ rating, session_id: sessionId }),
  })
}

// 流式对话：SSE 逐 token 回调 onDelta(累积文本)，返回完整答案
export async function chatStream(
  message: string,
  sessionId: string,
  onDelta: (accumulated: string) => void,
): Promise<string> {
  const resp = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, session_id: sessionId, stream: true }),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  if (!resp.body) throw new Error('无响应体')

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        let payload: ChatEvent
        try {
          payload = JSON.parse(line.slice(6))
        } catch {
          continue
        }
        if (payload.delta) {
          full += payload.delta
          onDelta(full)
        }
        if (payload.done) return full
      }
    }
  }
  return full
}
