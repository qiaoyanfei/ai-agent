import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Document } from '../api/client'
import { isEditableFilename } from '../lib/docEditable'
import { docStatusLabel, formatApiError } from '../lib/format'

export function CollectionDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const collectionId = parseInt(id || '0', 10)
  const [name, setName] = useState('知识库')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadDocs = useCallback(async () => {
    const docs = await api.listDocuments(collectionId)
    setDocuments(docs)
    const needsPoll = docs.some((d) => d.status === 'pending' || d.status === 'processing')
    if (pollRef.current) clearInterval(pollRef.current)
    if (needsPoll) pollRef.current = setInterval(() => loadDocs(), 3000)
  }, [collectionId])

  useEffect(() => {
    if (!collectionId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const col = await api.getCollection(collectionId)
        if (!cancelled) setName(col.name)
        await loadDocs()
      } catch (e) {
        if (!cancelled) alert(formatApiError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [collectionId, loadDocs])

  const readyCount = documents.filter((d) => d.status === 'ready').length

  async function onFileChange(file: File | undefined) {
    if (!file) return
    try {
      await api.uploadDocument(collectionId, file)
      await loadDocs()
    } catch (e) {
      alert(formatApiError(e))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteDoc(doc: Document) {
    if (!confirm(`确定删除「${doc.filename}」？`)) return
    try {
      await api.deleteDocument(doc.id)
      await loadDocs()
    } catch (e) {
      alert(formatApiError(e))
    }
  }

  if (loading) {
    return (
      <div className="empty">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <>
      <p>
        <Link to="/collections">← 知识库列表</Link>
      </p>
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--primary), #6366f1)',
          color: '#fff',
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>{name}</h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
          {documents.length} 个文档 · {readyCount} 个可问答
        </p>
        {readyCount > 0 ? (
          <Link
            to={`/collections/${collectionId}/chat`}
            className="btn"
            style={{
              marginTop: 16,
              background: '#fff',
              color: 'var(--primary)',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            ✨ 开始 AI 问答
          </Link>
        ) : (
          <p style={{ marginTop: 16, fontSize: 14 }}>请先上传并等待文档就绪</p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>文档</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`/collections/${collectionId}/documents/new`)}
          >
            新建 Markdown
          </button>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            上传
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              hidden
              onChange={(e) => onFileChange(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {documents.length === 0 && (
        <div className="empty card">支持 PDF、TXT、Markdown</div>
      )}
      {documents.map((d) => (
        <div key={d.id} className="card" style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              cursor: isEditableFilename(d.filename) ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (isEditableFilename(d.filename)) {
                navigate(`/collections/${collectionId}/documents/${d.id}`)
              }
            }}
          >
            <div style={{ wordBreak: 'break-all' }}>{d.filename}</div>
            <span className={`status-${d.status === 'ready' ? 'ready' : d.status === 'failed' ? 'failed' : 'pending'}`}>
              {docStatusLabel(d.status)}
            </span>
            {isEditableFilename(d.filename) && (
              <span style={{ fontSize: 12, color: 'var(--primary)', marginLeft: 8 }}>点击编辑</span>
            )}
            {d.status === 'failed' && d.error_message && (
              <div className="err" style={{ marginTop: 4 }}>
                {d.error_message}
              </div>
            )}
          </div>
          <button type="button" className="btn btn-danger-text" onClick={() => deleteDoc(d)}>
            删除
          </button>
        </div>
      ))}
    </>
  )
}
