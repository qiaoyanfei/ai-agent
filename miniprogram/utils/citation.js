function citationSourceCount(citations) {
  const docIds = new Set()
  for (const c of citations || []) {
    if (c && c.document_id != null) docIds.add(c.document_id)
  }
  return docIds.size === 0 ? (citations || []).length : docIds.size
}

function normalizeAnswerCitations(text, citations) {
  if (!text || !citations || !citations.length) return text || ''

  const n = citationSourceCount(citations)
  const chunkIndexToRef = {}
  for (const c of citations) {
    if (c.ref != null && c.chunk_index != null) {
      chunkIndexToRef[c.chunk_index] = c.ref
    }
  }

  let out = text.replace(/片段#(\d+)/g, (_, idx) => {
    const ref = chunkIndexToRef[parseInt(idx, 10)]
    return ref != null ? `[${ref}]` : `片段#${idx}`
  })

  out = out.replace(/【(\d+)】/g, (_, num) => {
    const ref = parseInt(num, 10)
    return ref >= 1 && ref <= n ? `[${ref}]` : `【${num}】`
  })
  out = out.replace(/《(\d+)》/g, (_, num) => {
    const ref = parseInt(num, 10)
    return ref >= 1 && ref <= n ? `[${ref}]` : `《${num}》`
  })
  for (const pattern of [/来源\s*(\d+)/g, /文档\s*(\d+)/g, /文献\s*(\d+)/g]) {
    out = out.replace(pattern, (match, num) => {
      const ref = parseInt(num, 10)
      return ref >= 1 && ref <= n ? `[${ref}]` : match
    })
  }
  out = out.replace(/\[(\d+)\]/g, (_, num) => {
    const ref = parseInt(num, 10)
    return ref >= 1 && ref <= n ? `[${ref}]` : num
  })
  return out
}

function ensureCitationMarkers(text, citations) {
  if (!text || !citations || !citations.length) return text || ''
  if (/\[\d+\]/.test(text)) return text

  const refs = new Set()
  for (const c of citations) {
    if (c.ref != null) refs.add(c.ref)
  }
  const sorted = [...refs].sort((a, b) => a - b)
  if (!sorted.length) {
    for (let i = 1; i <= citationSourceCount(citations); i++) sorted.push(i)
  }
  const markers = sorted.map((r) => `[${r}]`).join('')
  return `${text.trim()}\n\n${markers}`
}

function prepareAnswerWithCitations(text, citations) {
  return ensureCitationMarkers(normalizeAnswerCitations(text, citations), citations)
}

function citationRefToChunkId(citations) {
  const map = {}
  for (const c of citations || []) {
    if (c.ref != null && c.chunk_id != null) map[c.ref] = c.chunk_id
  }
  return map
}

/** Split assistant text into WXML-friendly segments with tappable [n] refs */
function parseMessageSegments(text, refToChunk) {
  if (!text) return [{ type: 'text', text: '' }]
  const parts = []
  const re = /\[(\d+)\]/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', text: text.slice(last, m.index) })
    }
    const ref = parseInt(m[1], 10)
    parts.push({
      type: 'cite',
      ref,
      chunkId: refToChunk[ref] || null,
    })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  if (!parts.length) parts.push({ type: 'text', text })
  return parts
}

module.exports = {
  citationSourceCount,
  normalizeAnswerCitations,
  ensureCitationMarkers,
  prepareAnswerWithCitations,
  citationRefToChunkId,
  parseMessageSegments,
}
