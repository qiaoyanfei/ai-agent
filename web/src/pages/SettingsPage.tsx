import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { API_BASE } from '../lib/config'
import { formatApiError } from '../lib/format'

export function SettingsPage() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    api.me().then((u) => setEmail(u.email)).catch((e) => alert(formatApiError(e)))
  }, [])

  return (
    <>
      <h1 style={{ marginTop: 0 }}>设置</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>当前账号</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{email || '…'}</div>
      </div>
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>API 地址</div>
        <code style={{ wordBreak: 'break-all' }}>{API_BASE}</code>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          开发环境默认 <code>/api</code>，由 Vite 代理到本机 8000 端口。
        </p>
      </div>
    </>
  )
}
