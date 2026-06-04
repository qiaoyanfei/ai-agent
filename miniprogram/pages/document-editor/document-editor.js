const api = require('../../utils/api')
const { formatApiError } = require('../../utils/format')

const DEFAULT_MD = '# 标题\n\n在此编写 Markdown 内容…\n'

Page({
  data: {
    collectionId: 0,
    documentId: 0,
    isCreate: true,
    filename: '未命名.md',
    content: DEFAULT_MD,
    loading: false,
    saving: false,
    error: '',
    editable: true,
  },

  onLoad(options) {
    const collectionId = parseInt(options.collectionId, 10)
    const documentId = parseInt(options.documentId || '0', 10)
    const isCreate = options.mode === 'create' || !documentId
    this.setData({
      collectionId,
      documentId,
      isCreate,
    })
    wx.setNavigationBarTitle({ title: isCreate ? '新建 Markdown' : '编辑文档' })
    if (!isCreate) {
      this.loadContent()
    }
  },

  onFilename(e) {
    this.setData({ filename: e.detail.value })
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  async loadContent() {
    const { documentId } = this.data
    this.setData({ loading: true, error: '' })
    try {
      const data = await api.getDocumentContent(documentId)
      this.setData({
        filename: data.filename || '',
        content: data.content || '',
        editable: data.editable !== false,
      })
    } catch (e) {
      this.setData({ error: formatApiError(e) })
    } finally {
      this.setData({ loading: false })
    }
  },

  async save() {
    const { isCreate, collectionId, documentId, filename, content, editable } = this.data
    if (!editable) return
    const body = (content || '').trim()
    if (!body) {
      wx.showToast({ title: '内容不能为空', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      if (isCreate) {
        await api.createTextDocument(collectionId, (filename || '未命名').trim(), body)
      } else {
        await api.updateDocumentContent(documentId, body)
      }
      wx.showToast({ title: '已保存，解析中', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 400)
    } catch (e) {
      wx.showToast({ title: formatApiError(e), icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },
})
