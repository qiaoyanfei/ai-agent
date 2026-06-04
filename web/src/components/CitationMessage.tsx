import { Link } from 'react-router-dom'
import type { MessageSegment } from '../lib/citation'

export function CitationMessage({
  segments,
  collectionId,
}: {
  segments: MessageSegment[]
  collectionId: number
}) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : seg.chunkId ? (
          <Link
            key={i}
            to={`/collections/${collectionId}/preview/${seg.chunkId}`}
            className="cite-link"
          >
            [{seg.ref}]
          </Link>
        ) : (
          <span key={i} className="cite-disabled">
            [{seg.ref}]
          </span>
        ),
      )}
    </>
  )
}
