const api = require('../../utils/api')
const { formatApiError } = require('../../utils/format')

Page({
  data: {
    email: '',
    avatarLetter: '知',
    collections: [],
    loading: true,
    refreshing: false,
    error: '',
    showCreate: false,
    createName: '',
    createDesc: '',
    creating: false,
  },

  onShow() {
    if (!this._hasLoadedOnce) {
      this.load()
    }
  },

  onPullDownRefresh() {
    this.onRefresh()
  },

  onRefresh() {
    if (this.data.refreshing) return
    this.setData({ refreshing: true })
    this.load({ silent: true })
      .then(() => {
        if (!this.data.error) {
          wx.showToast({ title: '已刷新', icon: 'none', duration: 1200 })
        }
      })
      .finally(() => {
        this.setData({ refreshing: false })
        wx.stopPullDownRefresh()
      })
  },

  async load(options = {}) {
    const silent = options.silent === true
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    if (!silent) {
      this.setData({ loading: true, error: '' })
    } else {
      this.setData({ error: '' })
    }
    try {
      const me = await api.authMe()
      const collections = await api.listCollections()
      const email = me.email || ''
      this.setData({
        email,
        avatarLetter: (email[0] || '知').toUpperCase(),
        collections: collections || [],
      })
    } catch (e) {
      const msg = formatApiError(e)
      this.setData({ error: msg })
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        wx.removeStorageSync('token')
        wx.reLaunch({ url: '/pages/login/login' })
      }
    } finally {
      this._hasLoadedOnce = true
      this.setData({ loading: false })
    }
  },

  openCollection(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/collection-detail/collection-detail?id=${id}` })
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  openCreate() {
    this.setData({ showCreate: true, createName: '', createDesc: '' })
  },

  closeCreate() {
    this.setData({ showCreate: false })
  },

  noop() {},

  onCreateName(e) {
    this.setData({ createName: e.detail.value })
  },

  onCreateDesc(e) {
    this.setData({ createDesc: e.detail.value })
  },

  async submitCreate() {
    const name = (this.data.createName || '').trim()
    if (!name) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return
    }
    this.setData({ creating: true })
    try {
      await api.createCollection(name, (this.data.createDesc || '').trim())
      this.setData({ showCreate: false })
      wx.showToast({ title: '已创建', icon: 'success' })
      await this.load()
    } catch (e) {
      wx.showToast({ title: formatApiError(e), icon: 'none' })
    } finally {
      this.setData({ creating: false })
    }
  },
})
