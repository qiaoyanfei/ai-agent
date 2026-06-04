import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { formatApiError } from '../lib/format'

const DEFAULT_MD = '# 标题\n\n在此编写 Markdown 内容…\n'

export function DocumentEditorPage() {
  const { id, docId } = useParams()
  const collectionId = parseInt(id || '0', 10)
  const documentId = docId ? parseInt(docId, 10) : null
  const isCreate = docId === 'new'
  const navigate = useNavigate()

  const [filename, setFilename] = useState('未命名.md')
  const [content, setContent] = useState(DEFAULT_MD)
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [editable, setEditable] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isCreate && documentId) {
      ;(async () => {
        try {
          const data = await api.getDocumentContent(documentId)
          setFilename(data.filename)
          setContent(data.content)
          setEditable(data.editable)
        } catch (e) {
          setError(formatApiError(e))
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [isCreate, documentId])

  async function save(e: FormEvent) {
    e.preventDefault()
    const body = content.trim()
    if (!body) {
      alert('内容不能为空')
      return
    }
    setSaving(true)
    try {
      if (isCreate) {
        await api.createTextDocument(collectionId, filename.trim(), body)
      } else if (documentId) {
        await api.updateDocumentContent(documentId, body)
      }
      navigate(`/collections/${collectionId}`)
    } catch (err) {
      alert(formatApiError(err))
    } finally {
      setSaving(false)
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
        <Link to={`/collections/${collectionId}`}>← 返回知识库</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>{isCreate ? '新建 Markdown' : '编辑文档'}</h1>
      {error && <p className="err">{error}</p>}
      <form onSubmit={save} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isCreate ? (
          <label>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>文件名</span>
            <input
              className="input"
              style={{ marginTop: 6 }}
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="例如：笔记.md"
            />
          </label>
        ) : (
          <div style={{ fontWeight: 600 }}>{filename}</div>
        )}
        {!editable ? (
          <p>该文件类型不支持在线编辑。</p>
        ) : (
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Markdown 正文</span>
            <textarea
              className="input"
              style={{
                marginTop: 6,
                minHeight: '50vh',
                fontFamily: 'ui-monospace, monospace',
                lineHeight: 1.55,
                resize: 'vertical',
              }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || !editable}>
          {saving ? '保存中…' : '保存并解析'}
        </button>
      </form>
    </>
  )
}
