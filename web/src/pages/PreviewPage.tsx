import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { formatApiError } from '../lib/format'

export function PreviewPage() {
  const { id, chunkId } = useParams()
  const collectionId = parseInt(id || '0', 10)
  const chunk = parseInt(chunkId || '0', 10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState<Awaited<ReturnType<typeof api.getChunkSource>> | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const s = await api.getChunkSource(chunk)
        setSource(s)
        if (s.file_type === 'pdf') {
          const blob = await api.downloadDocumentFile(s.document_id)
          revoked = URL.createObjectURL(blob)
          setPdfUrl(revoked)
        }
      } catch (e) {
        setError(formatApiError(e))
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [chunk])

  if (loading) {
    return (
      <div className="empty">
        <div className="spinner" />
      </div>
    )
  }

  if (error || !source) {
    return (
      <>
        <p>
          <Link to={`/collections/${collectionId}/chat`}>← 返回问答</Link>
        </p>
        <p className="err">{error || '加载失败'}</p>
      </>
    )
  }

  const fullText = source.full_text || ''
  const start = Math.max(0, Math.min(source.char_start ?? 0, fullText.length))
  const end = Math.max(start, Math.min(source.char_end ?? fullText.length, fullText.length))
  const before = fullText.slice(0, start)
  const highlight = fullText.slice(start, end) || source.excerpt || '（引用片段）'
  const after = fullText.slice(end)

  return (
    <>
      <p>
        <Link to={`/collections/${collectionId}/chat`}>← 返回问答</Link>
      </p>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{source.filename}</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
          {source.file_type === 'pdf'
            ? `PDF · 约第 ${source.page_start ?? 1} 页`
            : '文本 · 高亮为引用片段'}
        </p>
        {source.file_type === 'pdf' && pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ marginTop: 12, display: 'inline-block' }}
          >
            新标签页打开 PDF
          </a>
        )}
      </div>

      {source.file_type === 'pdf' ? (
        <div className="card">
          {pdfUrl ? (
            <iframe title="PDF" src={pdfUrl} style={{ width: '100%', height: '70vh', border: 'none' }} />
          ) : (
            <p className="empty">无法加载 PDF</p>
          )}
          {source.excerpt && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--primary-light)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>引用摘录</div>
              {source.excerpt}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ lineHeight: 1.65 }}>
          {before && <span>{before}</span>}
          <mark
            style={{
              background: 'var(--primary-light)',
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid rgba(79, 70, 229, 0.35)',
            }}
          >
            {highlight}
          </mark>
          {after && <span>{after}</span>}
        </div>
      )}
    </>
  )
}
