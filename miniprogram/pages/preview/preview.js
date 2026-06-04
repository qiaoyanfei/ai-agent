const api = require('../../utils/api')
const { baseUrl } = require('../../utils/config')
const { formatApiError } = require('../../utils/format')

Page({
  data: {
    collectionId: 0,
    chunkId: 0,
    loading: true,
    error: '',
    source: null,
    before: '',
    highlight: '',
    after: '',
    excerpt: '',
    pageLabel: '1',
  },

  onLoad(options) {
    this.setData({
      collectionId: parseInt(options.collectionId, 10),
      chunkId: parseInt(options.chunkId, 10),
    })
    this.load()
  },

  async load() {
    const { chunkId } = this.data
    this.setData({ loading: true, error: '' })
    try {
      const source = await api.getChunkSource(chunkId)
      let before = ''
      let highlight = ''
      let after = ''
      const excerpt = source.excerpt || ''

      if (source.file_type !== 'pdf') {
        const fullText = source.full_text || ''
        const start = Math.max(0, Math.min(source.char_start || 0, fullText.length))
        const end = Math.max(start, Math.min(source.char_end || fullText.length, fullText.length))
        before = fullText.substring(0, start)
        highlight = fullText.substring(start, end)
        after = fullText.substring(end)
        if (!highlight) highlight = excerpt || '（引用片段）'
      }

      const pageStart = source.page_start || 1
      this.setData({
        source,
        before,
        highlight,
        after,
        excerpt,
        pageLabel: String(pageStart),
      })
    } catch (e) {
      this.setData({ error: formatApiError(e) })
    } finally {
      this.setData({ loading: false })
    }
  },

  openPdf() {
    const source = this.data.source
    if (!source || !source.document_id) return
    const token = wx.getStorageSync('token')
    const url = `${baseUrl}/documents/${source.document_id}/file`
    wx.showLoading({ title: '下载中…' })
    wx.downloadFile({
      url,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' })
          return
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail() {
            wx.showToast({ title: '无法打开 PDF', icon: 'none' })
          },
        })
      },
      fail() {
        wx.showToast({ title: '下载失败', icon: 'none' })
      },
      complete() {
        wx.hideLoading()
      },
    })
  },
})
