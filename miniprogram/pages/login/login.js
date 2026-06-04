const { request } = require('../../utils/request')

Page({
  data: {
    mode: 'login',
    email: '',
    password: '',
    loading: false,
    error: '',
  },

  setLogin() {
    this.setData({ mode: 'login', error: '' })
  },

  setRegister() {
    this.setData({ mode: 'register', error: '' })
  },

  onEmail(e) {
    this.setData({ email: e.detail.value.trim() })
  },

  onPassword(e) {
    this.setData({ password: e.detail.value })
  },

  async submit() {
    const { mode, email, password } = this.data
    if (!email || password.length < 6) {
      this.setData({ error: '请填写邮箱和至少6位密码' })
      return
    }
    this.setData({ loading: true, error: '' })
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const res = await request(path, {
        method: 'POST',
        data: { email, password },
      })
      wx.setStorageSync('token', res.access_token)
      wx.reLaunch({ url: '/pages/collections/collections' })
    } catch (e) {
      this.setData({ error: e.message || '失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
