function docStatusLabel(status) {
  const map = {
    pending: '排队中',
    processing: '解析中',
    ready: '已就绪',
    failed: '失败',
  }
  return map[status] || status || '未知'
}

function docStatusClass(status) {
  if (status === 'ready') return 'status-ready'
  if (status === 'failed') return 'status-failed'
  if (status === 'processing' || status === 'pending') return 'status-pending'
  return ''
}

function formatApiError(err) {
  if (!err) return '未知错误'
  if (typeof err === 'string') return err
  return err.message || String(err)
}

function isEditableFilename(filename) {
  const lower = (filename || '').toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

module.exports = {
  docStatusLabel,
  docStatusClass,
  formatApiError,
  formatTime,
  isEditableFilename,
}
