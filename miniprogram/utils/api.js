const { request } = require('./request')
const { baseUrl } = require('./config')

function authMe() {
  return request('/auth/me')
}

function listCollections() {
  return request('/collections')
}

function createCollection(name, description) {
  return request('/collections', {
    method: 'POST',
    data: { name, description: description || '' },
  })
}

function getCollection(id) {
  return request(`/collections/${id}`)
}

function listDocuments(collectionId) {
  return request(`/collections/${collectionId}/documents`)
}

function deleteDocument(documentId) {
  return request(`/documents/${documentId}`, { method: 'DELETE' })
}

function uploadDocument(collectionId, filePath, filename) {
  const token = wx.getStorageSync('token')
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${baseUrl}/collections/${collectionId}/documents`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(typeof res.data === 'string' ? JSON.parse(res.data) : res.data)
          } catch (e) {
            resolve(res.data)
          }
          return
        }
        let detail = `上传失败 (${res.statusCode})`
        try {
          const body = JSON.parse(res.data)
          detail = body.detail || body.message || detail
        } catch (_) {}
        reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)))
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'))
      },
    })
  })
}

function getChunkSource(chunkId) {
  return request(`/chunks/${chunkId}/source`)
}

function listConversations(collectionId) {
  return request(`/chat/conversations?collection_id=${collectionId}`)
}

function listMessages(conversationId) {
  return request(`/chat/${conversationId}/messages`)
}

function createTextDocument(collectionId, filename, content) {
  return request(`/collections/${collectionId}/documents/text`, {
    method: 'POST',
    data: { filename, content },
  })
}

function getDocumentContent(documentId) {
  return request(`/documents/${documentId}/content`)
}

function updateDocumentContent(documentId, content) {
  return request(`/documents/${documentId}/content`, {
    method: 'PUT',
    data: { content },
  })
}

module.exports = {
  authMe,
  listCollections,
  createCollection,
  getCollection,
  listDocuments,
  deleteDocument,
  uploadDocument,
  getChunkSource,
  listConversations,
  listMessages,
  createTextDocument,
  getDocumentContent,
  updateDocumentContent,
}
