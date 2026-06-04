import { API_BASE } from '../lib/config'
import { getToken } from '../lib/auth'

export type ChatEvent = {
  type: string
  content?: string
  conversation_id?: number
  citations?: unknown[]
}

export async function* chatStream(params: {
  collectionId: number
  message: string
  conversationId?: number | null
}): AsyncGenerator<ChatEvent> {
  const token = getToken()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collection_id: params.collectionId,
      message: params.message,
      conversation_id: params.conversationId ?? null,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `聊天请求失败 (${res.status})`)
  }
  if (!res.body) throw new Error('浏览器不支持流式响应')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() || ''
    for (const block of blocks) {
      for (const line of block.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.replace(/^data:\s*/, '')
        if (!payload) continue
        try {
          yield JSON.parse(payload) as ChatEvent
        } catch {
          /* skip */
        }
      }
    }
  }
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.replace(/^data:\s*/, '')
      if (!payload) continue
      try {
        yield JSON.parse(payload) as ChatEvent
      } catch {
        /* skip */
      }
    }
  }
}
