from pathlib import Path

from pypdf import PdfReader


def extract_text(path: Path, content_type: str) -> str:
    text, _ = extract_text_with_pages(path, content_type)
    return text


def extract_text_with_pages(path: Path, content_type: str) -> tuple[str, list[int]]:
    """
    Returns full text and page_start_offsets (char index where each PDF page begins).
    page_start_offsets[0] is always 0. For non-PDF, returns [0] only.
    """
    suffix = path.suffix.lower()
    if suffix == ".pdf" or "pdf" in content_type:
        reader = PdfReader(str(path))
        parts: list[str] = []
        page_starts: list[int] = []
        pos = 0
        for i, page in enumerate(reader.pages):
            page_starts.append(pos)
            page_text = page.extract_text() or ""
            parts.append(page_text)
            pos += len(page_text)
            if i < len(reader.pages) - 1:
                pos += 1  # newline between pages
        return "\n".join(parts), page_starts
    if suffix in {".md", ".markdown", ".txt"} or "text" in content_type:
        content = path.read_text(encoding="utf-8", errors="ignore")
        return content, [0]
    raise ValueError(f"不支持的文件类型: {suffix or content_type}")


def char_offset_to_page(char_pos: int, page_starts: list[int]) -> int:
    """1-based page number for a character offset."""
    if not page_starts:
        return 1
    page = 1
    for i, start in enumerate(page_starts):
        if char_pos >= start:
            page = i + 1
    return page
