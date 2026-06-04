import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { setToken } from '../lib/auth'
import { formatApiError } from '../lib/format'

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email || password.length < 6) {
      setError('请填写邮箱和至少 6 位密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password)
      setToken(res.access_token)
      navigate('/collections', { replace: true })
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '48px auto' }}>
      <div className="card" style={{ padding: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>知库</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)' }}>
          上传文档 · 智能问答 · 可追溯引用
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--surface)', padding: 4, borderRadius: 10 }}>
          <button
            type="button"
            className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>
        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>邮箱</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>密码</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </label>
          {error && <p className="err">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          与 App、小程序共用同一账号
        </p>
      </div>
    </div>
  )
}
