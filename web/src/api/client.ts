import { API_BASE } from '../lib/config'
import { clearToken, getToken } from '../lib/auth'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const isAuth = path.includes('/auth/login') || path.includes('/auth/register')
  if (!isAuth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new ApiError('未登录或已过期', 401)
  }
  if (!res.ok) {
    let detail = `请求失败 (${res.status})`
    try {
      const body = await res.json()
      detail =
        typeof body.detail === 'string'
          ? body.detail
          : body.message || JSON.stringify(body.detail) || detail
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type User = { id: number; email: string }
export type Collection = {
  id: number
  name: string
  description?: string
  created_at?: string
}
export type Document = {
  id: number
  collection_id: number
  filename: string
  status: string
  error_message?: string
  created_at?: string
}
export type Conversation = {
  id: number
  collection_id: number
  title: string
  created_at?: string
}
export type ChatMessage = {
  id?: number
  role: string
  content: string
  citations?: unknown
}

export const api = {
  login(email: string, password: string) {
    return request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  register(email: string, password: string) {
    return request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  me() {
    return request<User>('/auth/me')
  },
  listCollections() {
    return request<Collection[]>('/collections')
  },
  getCollection(id: number) {
    return request<Collection>(`/collections/${id}`)
  },
  createCollection(name: string, description: string) {
    return request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    })
  },
  listDocuments(collectionId: number) {
    return request<Document[]>(`/collections/${collectionId}/documents`)
  },
  deleteDocument(documentId: number) {
    return request<void>(`/documents/${documentId}`, { method: 'DELETE' })
  },
  async uploadDocument(collectionId: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    const token = getToken()
    const headers: HeadersInit = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE}/collections/${collectionId}/documents`, {
      method: 'POST',
      headers,
      body: form,
    })
    if (!res.ok) {
      let detail = `上传失败 (${res.status})`
      try {
        const body = await res.json()
        detail = body.detail || detail
      } catch {
        /* ignore */
      }
      throw new ApiError(detail, res.status)
    }
    return res.json() as Promise<Document>
  },
  listConversations(collectionId: number) {
    return request<Conversation[]>(
      `/chat/conversations?collection_id=${collectionId}`,
    )
  },
  listMessages(conversationId: number) {
    return request<ChatMessage[]>(`/chat/${conversationId}/messages`)
  },
  getChunkSource(chunkId: number) {
    return request<{
      chunk_id: number
      document_id: number
      collection_id: number
      filename: string
      file_type: string
      full_text?: string
      char_start?: number
      char_end?: number
      page_start?: number
      excerpt?: string
    }>(`/chunks/${chunkId}/source`)
  },
  createTextDocument(collectionId: number, filename: string, content: string) {
    return request<Document>(`/collections/${collectionId}/documents/text`, {
      method: 'POST',
      body: JSON.stringify({ filename, content }),
    })
  },

  getDocumentContent(documentId: number) {
    return request<{
      id: number
      collection_id: number
      filename: string
      content: string
      editable: boolean
    }>(`/documents/${documentId}/content`)
  },

  updateDocumentContent(documentId: number, content: string) {
    return request<Document>(`/documents/${documentId}/content`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
  },

  async downloadDocumentFile(documentId: number): Promise<Blob> {
    const token = getToken()
    const headers: HeadersInit = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE}/documents/${documentId}/file`, { headers })
    if (!res.ok) throw new ApiError(`下载失败 (${res.status})`, res.status)
    return res.blob()
  },
}
