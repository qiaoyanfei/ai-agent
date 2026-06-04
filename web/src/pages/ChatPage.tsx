import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { chatStream } from '../api/chatStream'
import { api, type Conversation } from '../api/client'
import { CitationMessage } from '../components/CitationMessage'
import {
  type Citation,
  citationRefToChunkId,
  parseCitations,
  parseMessageSegments,
  prepareAnswerWithCitations,
} from '../lib/citation'
import { formatApiError, formatTime } from '../lib/format'

type UiMessage = {
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
  streaming?: boolean
}

const SUGGESTIONS = ['这个知识库主要讲什么？', '帮我总结一下要点', '有哪些配置说明？']

export function ChatPage() {
  const { id } = useParams()
  const collectionId = parseInt(id || '0', 10)
  const [title, setTitle] = useState('知识库')
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getCollection(collectionId).then((c) => setTitle(c.name)).catch(() => {})
  }, [collectionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openHistory() {
    setShowHistory(true)
    try {
      setConversations(await api.listConversations(collectionId))
    } catch (e) {
      alert(formatApiError(e))
    }
  }

  async function loadConversation(convId: number) {
    try {
      const rows = await api.listMessages(convId)
      setConversationId(convId)
      setMessages(
        rows.map((m) => {
          const citations = m.role === 'assistant' ? parseCitations(m.citations) : []
          let content = m.content || ''
          if (m.role === 'assistant' && citations.length) {
            content = prepareAnswerWithCitations(content, citations)
          }
          return { role: m.role as 'user' | 'assistant', content, citations }
        }),
      )
      setShowHistory(false)
    } catch (e) {
      alert(formatApiError(e))
    }
  }

  function newChat() {
    setMessages([])
    setConversationId(null)
    setShowHistory(false)
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (!text || streaming) return
    setInput('')
    setStreaming(true)
    const next: UiMessage[] = [
      ...messages,
      { role: 'user', content: text, citations: [] },
      { role: 'assistant', content: '', citations: [], streaming: true },
    ]
    setMessages(next)
    const assistantIdx = next.length - 1
    let citations: Citation[] = []

    try {
      for await (const event of chatStream({
        collectionId,
        message: text,
        conversationId,
      })) {
        if (event.type === 'meta') {
          if (event.conversation_id) setConversationId(event.conversation_id)
          if (event.citations?.length) {
            citations = event.citations as Citation[]
            setMessages((prev) => {
              const copy = [...prev]
              copy[assistantIdx] = { ...copy[assistantIdx], citations }
              return copy
            })
          }
        } else if (event.type === 'token') {
          setMessages((prev) => {
            const copy = [...prev]
            const cur = copy[assistantIdx]
            copy[assistantIdx] = {
              ...cur,
              content: cur.content + (event.content || ''),
            }
            return copy
          })
        } else if (event.type === 'done') {
          const fromServer = event.content
          const final = fromServer
            ? prepareAnswerWithCitations(fromServer, citations)
            : prepareAnswerWithCitations(
                next[assistantIdx]?.content || '',
                citations,
              )
          setMessages((prev) => {
            const copy = [...prev]
            copy[assistantIdx] = {
              role: 'assistant',
              content: final,
              citations,
              streaming: false,
            }
            return copy
          })
        } else if (event.type === 'error') {
          setMessages((prev) => {
            const copy = [...prev]
            copy[assistantIdx] = {
              role: 'assistant',
              content: `错误: ${event.content}`,
              citations: [],
              streaming: false,
            }
            return copy
          })
        }
      }
      setMessages((prev) => {
        const cur = prev[assistantIdx]
        if (cur?.streaming) {
          const copy = [...prev]
          copy[assistantIdx] = {
            ...cur,
            content: prepareAnswerWithCitations(cur.content, cur.citations),
            streaming: false,
          }
          return copy
        }
        return prev
      })
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev]
        copy[assistantIdx] = {
          role: 'assistant',
          content: formatApiError(e),
          citations: [],
          streaming: false,
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', margin: '-24px', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Link to={`/collections/${collectionId}`}>← {title}</Link>
          <h1 style={{ margin: '8px 0 0', fontSize: 20 }}>AI 问答</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={openHistory} disabled={streaming}>
            历史
          </button>
          <button type="button" className="btn btn-ghost" onClick={newChat} disabled={streaming}>
            新对话
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {messages.length === 0 && (
          <div className="empty">
            <p>向知识库提问，回答将标注引用来源</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="btn btn-ghost" onClick={() => send(s)} disabled={streaming}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: 16,
                background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary), #6366f1)' : 'var(--card)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {m.role === 'user' ? (
                m.content
              ) : (
                <>
                  <CitationMessage
                    segments={parseMessageSegments(
                      m.content || (m.streaming ? '…' : ''),
                      citationRefToChunkId(m.citations),
                    )}
                    collectionId={collectionId}
                  />
                  {m.streaming && <span style={{ color: 'var(--primary)' }}> ▍</span>}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <textarea
          className="input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入问题…"
          disabled={streaming}
          style={{ flex: 1, resize: 'none' }}
        />
        <button type="submit" className="btn btn-primary" disabled={streaming || !input.trim()}>
          发送
        </button>
      </form>

      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <div
            className="modal"
            style={{ marginLeft: 'auto', marginRight: 0, maxWidth: 360, height: '100%', maxHeight: '100vh', borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <strong>历史会话</strong>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={newChat}>
                新对话
              </button>
            </div>
            {conversations.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>暂无历史</p>}
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                className="card"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  marginBottom: 8,
                  cursor: 'pointer',
                  border: c.id === conversationId ? '2px solid var(--primary)' : undefined,
                }}
                onClick={() => loadConversation(c.id)}
              >
                <div>{c.title || '新对话'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {formatTime(c.created_at)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
