def split_text_with_offsets(
    text: str, chunk_size: int = 800, overlap: int = 100
) -> list[dict]:
    """Split text and record char offsets in the original string (before strip)."""
    if not text:
        return []
    chunks: list[dict] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        raw = text[start:end]
        stripped = raw.strip()
        if stripped:
            lead = len(raw) - len(raw.lstrip())
            trail = len(raw) - len(raw.rstrip())
            char_start = start + lead
            char_end = end - trail
            chunks.append(
                {
                    "content": stripped,
                    "char_start": char_start,
                    "char_end": char_end,
                }
            )
        if end >= length:
            break
        start = max(end - overlap, start + 1)
    return chunks


def split_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    return [c["content"] for c in split_text_with_offsets(text, chunk_size, overlap)]
