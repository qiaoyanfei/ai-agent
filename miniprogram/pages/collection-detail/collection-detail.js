const api = require('../../utils/api')
const {
  docStatusLabel,
  docStatusClass,
  formatApiError,
  isEditableFilename,
} = require('../../utils/format')

Page({
  data: {
    collectionId: 0,
    collectionName: '知识库',
    documents: [],
    readyCount: 0,
    loading: true,
    refreshing: false,
    pollTimer: null,
  },

  onLoad(options) {
    const id = parseInt(options.id, 10)
    this.setData({ collectionId: id })
  },

  onShow() {
    this.loadAll()
  },

  onUnload() {
    this.clearPoll()
  },

  onHide() {
    this.clearPoll()
  },

  clearPoll() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer)
      this.setData({ pollTimer: null })
    }
  },

  onPullRefresh() {
    this.setData({ refreshing: true })
    this.loadDocuments().finally(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  mapDocuments(docs) {
    return (docs || []).map((d) => ({
      ...d,
      statusLabel: docStatusLabel(d.status),
      statusClass: docStatusClass(d.status),
      editable: isEditableFilename(d.filename),
    }))
  },

  async loadAll() {
    const { collectionId } = this.data
    if (!collectionId) return
    this.setData({ loading: true })
    try {
      const col = await api.getCollection(collectionId)
      this.setData({ collectionName: col.name || '知识库' })
      wx.setNavigationBarTitle({ title: col.name || '知识库' })
      await this.loadDocuments()
    } catch (e) {
      wx.showToast({ title: formatApiError(e), icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadDocuments() {
    const { collectionId } = this.data
    try {
      const docs = await api.listDocuments(collectionId)
      const mapped = this.mapDocuments(docs)
      const readyCount = mapped.filter((d) => d.status === 'ready').length
      this.setData({ documents: mapped, readyCount })
      this.schedulePoll(mapped)
    } catch (e) {
      wx.showToast({ title: formatApiError(e), icon: 'none' })
    }
  },

  schedulePoll(docs) {
    this.clearPoll()
    const needs = (docs || []).some(
      (d) => d.status === 'pending' || d.status === 'processing',
    )
    if (!needs) return
    const timer = setInterval(() => this.loadDocuments(), 3000)
    this.setData({ pollTimer: timer })
  },

  openChat() {
    const { collectionId, readyCount } = this.data
    if (readyCount <= 0) return
    wx.navigateTo({ url: `/pages/chat/chat?collectionId=${collectionId}` })
  },

  showAddMenu() {
    wx.showActionSheet({
      itemList: ['新建 Markdown', '上传文件'],
      success: (res) => {
        if (res.tapIndex === 0) this.createMarkdown()
        else if (res.tapIndex === 1) this.upload()
      },
    })
  },

  createMarkdown() {
    const { collectionId } = this.data
    wx.navigateTo({
      url: `/pages/document-editor/document-editor?collectionId=${collectionId}&mode=create`,
    })
  },

  openDocument(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10)
    const doc = (this.data.documents || []).find((d) => d.id === id)
    if (!doc || !doc.editable) {
      wx.showToast({ title: 'PDF 等文件请重新上传', icon: 'none' })
      return
    }
    const { collectionId } = this.data
    wx.navigateTo({
      url: `/pages/document-editor/document-editor?collectionId=${collectionId}&documentId=${id}`,
    })
  },

  upload() {
    const { collectionId } = this.data
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'txt', 'md'],
      success: async (res) => {
        const file = res.tempFiles[0]
        wx.showLoading({ title: '上传中…' })
        try {
          await api.uploadDocument(collectionId, file.path, file.name)
          wx.showToast({ title: '上传成功，解析中', icon: 'success' })
          await this.loadDocuments()
        } catch (e) {
          wx.showToast({ title: formatApiError(e), icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      },
    })
  },

  confirmDelete(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '删除文档',
      content: `确定删除「${name}」？向量索引将一并移除。`,
      confirmColor: '#dc2626',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.deleteDocument(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          await this.loadDocuments()
        } catch (err) {
          wx.showToast({ title: formatApiError(err), icon: 'none' })
        }
      },
    })
  },
})
