const api = require('../../utils/api')
const { chatStream } = require('../../utils/chatStream')
const {
  prepareAnswerWithCitations,
  citationRefToChunkId,
  parseMessageSegments,
} = require('../../utils/citation')
const { formatApiError, formatTime } = require('../../utils/format')

const SUGGESTIONS = [
  '这个知识库主要讲什么？',
  '帮我总结一下要点',
  '有哪些配置说明？',
]

Page({
  data: {
    collectionId: 0,
    collectionName: '知识库',
    messages: [],
    conversationId: null,
    inputText: '',
    canSend: false,
    streaming: false,
    scrollIntoView: '',
    suggestions: SUGGESTIONS,
    showHistory: false,
    conversations: [],
    loadingHistory: false,
    streamTask: null,
  },

  onLoad(options) {
    const collectionId = parseInt(options.collectionId, 10)
    this.setData({ collectionId })
    this.loadTitle()
  },

  onUnload() {
    this.abortStream()
  },

  async loadTitle() {
    try {
      const col = await api.getCollection(this.data.collectionId)
      const name = col.name || '知识库'
      this.setData({ collectionName: name })
      wx.setNavigationBarTitle({ title: `问答 · ${name}` })
    } catch (_) {}
  },

  onInput(e) {
    const v = e.detail.value || ''
    this.setData({ inputText: v, canSend: v.trim().length > 0 })
  },

  useSuggestion(e) {
    const text = e.currentTarget.dataset.text
    this.setData({ inputText: text, canSend: true })
    this.send()
  },

  scrollToBottom() {
    const n = this.data.messages.length
    this.setData({ scrollIntoView: n ? `msg-${n - 1}` : 'msg-bottom' })
    setTimeout(() => this.setData({ scrollIntoView: 'msg-bottom' }), 80)
  },

  enrichAssistantMessage(msg) {
    const refMap = citationRefToChunkId(msg.citations || [])
    const content = msg.content || ''
    return {
      ...msg,
      segments: parseMessageSegments(content, refMap),
    }
  },

  parseCitations(raw) {
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string' && raw) {
      try {
        const d = JSON.parse(raw)
        return Array.isArray(d) ? d : []
      } catch (_) {
        return []
      }
    }
    return []
  },

  abortStream() {
    if (this.data.streamTask && this.data.streamTask.abort) {
      this.data.streamTask.abort()
    }
    this.setData({ streamTask: null })
  },

  async send() {
    const text = (this.data.inputText || '').trim()
    if (!text || this.data.streaming) return

    const userMsg = { role: 'user', content: text }
    const assistantMsg = {
      role: 'assistant',
      content: '',
      citations: [],
      segments: [],
      isStreaming: true,
    }
    const messages = [...this.data.messages, userMsg, assistantMsg]
    const assistantIndex = messages.length - 1

    this.setData({
      messages,
      inputText: '',
      canSend: false,
      streaming: true,
    })
    this.scrollToBottom()

    let streamDone = false
    const finishStream = (patch) => {
      if (streamDone) return
      streamDone = true
      const msgs = [...this.data.messages]
      const cur = { ...msgs[assistantIndex], ...patch, isStreaming: false }
      msgs[assistantIndex] = this.enrichAssistantMessage(cur)
      this.setData({ messages: msgs, streaming: false, streamTask: null })
      this.scrollToBottom()
    }

    const updateAssistant = (patch) => {
      const msgs = [...this.data.messages]
      msgs[assistantIndex] = { ...msgs[assistantIndex], ...patch }
      this.setData({ messages: msgs })
      this.scrollToBottom()
    }

    const task = chatStream(
      {
        collectionId: this.data.collectionId,
        message: text,
        conversationId: this.data.conversationId,
      },
      {
        onEvent: (event) => {
          const type = event.type
          if (type === 'meta') {
            if (event.conversation_id) {
              this.setData({ conversationId: event.conversation_id })
            }
            let citations = event.citations || []
            if (typeof citations === 'string') {
              try {
                citations = JSON.parse(citations)
              } catch (_) {
                citations = []
              }
            }
            if (citations.length) {
              updateAssistant({ citations })
            }
          } else if (type === 'token') {
            const msgs = this.data.messages
            const cur = msgs[assistantIndex]
            updateAssistant({ content: (cur.content || '') + (event.content || '') })
          } else if (type === 'done') {
            const msgs = this.data.messages
            const cur = msgs[assistantIndex]
            let content = cur.content || ''
            if (event.content) {
              content = prepareAnswerWithCitations(
                event.content,
                cur.citations || [],
              )
            } else if (cur.citations && cur.citations.length) {
              content = prepareAnswerWithCitations(content, cur.citations)
            }
            finishStream({ content })
          } else if (type === 'error') {
            finishStream({ content: `错误: ${event.content || '未知'}` })
          }
        },
        onError: (err) => {
          finishStream({ content: formatApiError(err) })
        },
        onComplete: () => {
          const msgs = this.data.messages
          const cur = msgs[assistantIndex]
          if (cur.isStreaming) {
            let content = cur.content || ''
            if (cur.citations && cur.citations.length) {
              content = prepareAnswerWithCitations(content, cur.citations)
            }
            finishStream({ content })
          }
        },
      },
    )
    this.setData({ streamTask: task })
  },

  newChat() {
    this.abortStream()
    this.setData({
      messages: [],
      conversationId: null,
      streaming: false,
      showHistory: false,
    })
  },

  newChatFromDrawer() {
    this.newChat()
  },

  async openHistory() {
    if (this.data.streaming) return
    this.setData({ showHistory: true, loadingHistory: true })
    try {
      const list = await api.listConversations(this.data.collectionId)
      const conversations = (list || []).map((c) => ({
        ...c,
        timeText: formatTime(c.updated_at || c.created_at),
      }))
      this.setData({ conversations })
    } catch (e) {
      wx.showToast({ title: formatApiError(e), icon: 'none' })
    } finally {
      this.setData({ loadingHistory: false })
    }
  },

  closeHistory() {
    this.setData({ showHistory: false })
  },

  noop() {},

  async loadConversation(e) {
    const id = e.currentTarget.dataset.id
    try {
      const rows = await api.listMessages(id)
      const messages = (rows || []).map((m) => {
        const citations = this.parseCitations(m.citations)
        let content = m.content || ''
        if (m.role === 'assistant' && citations.length) {
          content = prepareAnswerWithCitations(content, citations)
        }
        const msg = {
          role: m.role || 'user',
          content,
          citations: m.role === 'assistant' ? citations : [],
          segments: [],
          isStreaming: false,
        }
        if (msg.role === 'assistant') return this.enrichAssistantMessage(msg)
        return msg
      })
      this.setData({
        conversationId: id,
        messages,
        showHistory: false,
      })
      this.scrollToBottom()
    } catch (err) {
      wx.showToast({ title: formatApiError(err), icon: 'none' })
    }
  },

  onCitationTap(e) {
    const chunkId = e.currentTarget.dataset.chunk
    const ref = e.currentTarget.dataset.ref
    if (!chunkId) {
      wx.showToast({ title: `引用 [${ref}] 暂无片段`, icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/preview/preview?collectionId=${this.data.collectionId}&chunkId=${chunkId}`,
    })
  },
})
