import { Link, Outlet, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { clearToken } from '../lib/auth'
import { useEffect, useState } from 'react'

export function Layout() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  useEffect(() => {
    api.me().then((u) => setEmail(u.email)).catch(() => {})
  }, [])

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/collections">知库 MindVault</Link>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {email && <span style={{ fontSize: 14, opacity: 0.9 }}>{email}</span>}
          <Link to="/settings">设置</Link>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 14 }}
            onClick={() => {
              clearToken()
              navigate('/login')
            }}
          >
            退出
          </button>
        </nav>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}
