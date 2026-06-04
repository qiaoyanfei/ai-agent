const api = require('../../utils/api')
const { baseUrl } = require('../../utils/config')
const { formatApiError } = require('../../utils/format')

Page({
  data: {
    email: '',
    avatarLetter: '知',
    apiHost: '',
  },

  onShow() {
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    let host = baseUrl
    try {
      host = baseUrl.replace(/^https?:\/\//, '')
    } catch (_) {}
    this.setData({ apiHost: host })
    this.loadMe()
  },

  async loadMe() {
    try {
      const me = await api.authMe()
      const email = me.email || ''
      this.setData({
        email,
        avatarLetter: (email[0] || '知').toUpperCase(),
      })
    } catch (e) {
      wx.showToast({ title: formatApiError(e), icon: 'none' })
    }
  },

  confirmLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (!res.confirm) return
        wx.removeStorageSync('token')
        wx.reLaunch({ url: '/pages/login/login' })
      },
    })
  },
})
