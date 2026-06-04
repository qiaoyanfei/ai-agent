import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Collection } from '../api/client'
import { formatApiError } from '../lib/format'

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCollections(await api.listCollections())
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submitCreate() {
    const name = createName.trim()
    if (!name) return
    setCreating(true)
    try {
      await api.createCollection(name, createDesc.trim())
      setShowCreate(false)
      setCreateName('')
      setCreateDesc('')
      await load()
    } catch (e) {
      alert(formatApiError(e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>我的知识库</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          ＋ 新建
        </button>
      </div>

      {loading && (
        <div className="empty">
          <div className="spinner" />
          <p>加载中…</p>
        </div>
      )}
      {error && <p className="err">{error}</p>}
      {!loading && !error && collections.length === 0 && (
        <div className="empty card">
          <p>还没有知识库</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            创建第一个知识库
          </button>
        </div>
      )}
      {!loading &&
        collections.map((c) => (
          <Link
            key={c.id}
            to={`/collections/${c.id}`}
            className="card card-clickable"
            style={{ display: 'block', marginBottom: 12, color: 'inherit', textDecoration: 'none' }}
          >
            <strong>{c.name}</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
              {c.description || '暂无描述'}
            </p>
          </Link>
        ))}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>新建知识库</h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              名称
              <input
                className="input"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                style={{ marginTop: 6 }}
                autoFocus
              />
            </label>
            <label style={{ display: 'block', marginBottom: 16 }}>
              描述（可选）
              <textarea
                className="input"
                rows={3}
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                style={{ marginTop: 6, resize: 'vertical' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={creating}
                onClick={submitCreate}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
