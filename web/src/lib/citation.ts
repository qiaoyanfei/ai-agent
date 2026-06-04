export type Citation = {
  ref?: number
  chunk_id?: number
  chunk_index?: number
  document_id?: number
}

export type MessageSegment =
  | { type: 'text'; text: string }
  | { type: 'cite'; ref: number; chunkId: number | null }

function citationSourceCount(citations: Citation[]): number {
  const docIds = new Set<number>()
  for (const c of citations) {
    if (c.document_id != null) docIds.add(c.document_id)
  }
  return docIds.size === 0 ? citations.length : docIds.size
}

function normalizeAnswerCitations(text: string, citations: Citation[]): string {
  if (!text || !citations.length) return text || ''
  const n = citationSourceCount(citations)
  const chunkIndexToRef: Record<number, number> = {}
  for (const c of citations) {
    if (c.ref != null && c.chunk_index != null) {
      chunkIndexToRef[c.chunk_index] = c.ref
    }
  }
  let out = text.replace(/片段#(\d+)/g, (_, idx) => {
    const ref = chunkIndexToRef[parseInt(idx, 10)]
    return ref != null ? `[${ref}]` : `片段#${idx}`
  })
  for (const pattern of [/【(\d+)】/g, /《(\d+)》/g]) {
    out = out.replace(pattern, (_, num) => {
      const ref = parseInt(num, 10)
      return ref >= 1 && ref <= n ? `[${ref}]` : _
    })
  }
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

function ensureCitationMarkers(text: string, citations: Citation[]): string {
  if (!text || !citations.length) return text || ''
  if (/\[\d+\]/.test(text)) return text
  const refs = new Set<number>()
  for (const c of citations) {
    if (c.ref != null) refs.add(c.ref)
  }
  const sorted = [...refs].sort((a, b) => a - b)
  if (!sorted.length) {
    for (let i = 1; i <= citationSourceCount(citations); i++) sorted.push(i)
  }
  return `${text.trim()}\n\n${sorted.map((r) => `[${r}]`).join('')}`
}

export function prepareAnswerWithCitations(text: string, citations: Citation[]): string {
  return ensureCitationMarkers(normalizeAnswerCitations(text, citations), citations)
}

export function citationRefToChunkId(citations: Citation[]): Record<number, number> {
  const map: Record<number, number> = {}
  for (const c of citations) {
    if (c.ref != null && c.chunk_id != null) map[c.ref] = c.chunk_id
  }
  return map
}

export function parseMessageSegments(
  text: string,
  refToChunk: Record<number, number>,
): MessageSegment[] {
  if (!text) return [{ type: 'text', text: '' }]
  const parts: MessageSegment[] = []
  const re = /\[(\d+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', text: text.slice(last, m.index) })
    const ref = parseInt(m[1], 10)
    parts.push({ type: 'cite', ref, chunkId: refToChunk[ref] ?? null })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  if (!parts.length) parts.push({ type: 'text', text })
  return parts
}

export function parseCitations(raw: unknown): Citation[] {
  if (Array.isArray(raw)) return raw as Citation[]
  if (typeof raw === 'string' && raw) {
    try {
      const d = JSON.parse(raw)
      return Array.isArray(d) ? (d as Citation[]) : []
    } catch {
      return []
    }
  }
  return []
}
