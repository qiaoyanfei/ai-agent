const { baseUrl } = require('./config')

function arrayBufferToString(buf) {
  if (!buf) return ''
  if (typeof buf === 'string') return buf
  try {
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(new Uint8Array(buf))
  } catch (_) {
    const bytes = new Uint8Array(buf)
    let s = ''
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
    try {
      return decodeURIComponent(escape(s))
    } catch (e2) {
      return s
    }
  }
}

function flushSseBlocks(buffer, onEvent) {
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() || ''
  for (const block of blocks) {
    for (const line of block.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.replace(/^data:\s*/, '')
      if (!payload || payload === '[DONE]') continue
      try {
        onEvent(JSON.parse(payload))
      } catch (e) {
        console.warn('[SSE] parse', payload, e)
      }
    }
  }
  return rest
}

/**
 * Stream POST /chat via enableChunked.
 * handlers: { onEvent, onError, onComplete }
 * Returns request task (abort with task.abort()).
 */
function chatStream({ collectionId, message, conversationId }, handlers) {
  const token = wx.getStorageSync('token')
  let buffer = ''
  let finished = false

  const finish = (err) => {
    if (finished) return
    finished = true
    if (err) handlers.onError(err)
    else {
      buffer = flushSseBlocks(buffer + '\n\n', handlers.onEvent)
      if (handlers.onComplete) handlers.onComplete()
    }
  }

  const task = wx.request({
    url: `${baseUrl}/chat`,
    method: 'POST',
    enableChunked: true,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data: {
      collection_id: collectionId,
      message,
      conversation_id: conversationId || null,
    },
    success() {
      finish()
    },
    fail(err) {
      finish(new Error(err.errMsg || '问答请求失败'))
    },
  })

  if (task && typeof task.onChunkReceived === 'function') {
    task.onChunkReceived((res) => {
      buffer += arrayBufferToString(res.data)
      buffer = flushSseBlocks(buffer, handlers.onEvent)
    })
  } else {
    finish(
      new Error('当前基础库不支持流式问答，请在开发者工具中调高基础库版本（≥2.20.1）'),
    )
  }

  return task
}

module.exports = { chatStream, arrayBufferToString }
