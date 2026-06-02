import json
import re

from sqlalchemy import text
from sqlmodel import Session

from app.core.config import settings
from app.models import Document, DocumentChunk
from app.services.openai_client import OpenAIClient


async def retrieve_chunks(
    session: Session, collection_id: int, query: str, top_k: int | None = None
) -> list[dict]:
    top_k = top_k or settings.rag_top_k
    client = OpenAIClient()
    query_emb = (await client.embed([query]))[0]
    emb_str = "[" + ",".join(str(x) for x in query_emb) + "]"

    sql = text(
        """
        SELECT dc.id, dc.content, dc.chunk_index, d.id AS document_id, d.filename,
               dc.char_start, dc.char_end, dc.page_start, dc.page_end,
               dc.embedding <=> CAST(:query_vec AS vector) AS distance
        FROM documentchunk dc
        JOIN document d ON d.id = dc.document_id
        WHERE d.collection_id = :collection_id AND d.status = 'ready'
        ORDER BY distance
        LIMIT :limit
        """
    )
    result = session.execute(
        sql,
        {
            "query_vec": emb_str,
            "collection_id": collection_id,
            "limit": top_k,
        },
    )
    rows = result.fetchall()

    results = []
    for row in rows:
        results.append(
            {
                "chunk_id": row[0],
                "content": row[1],
                "chunk_index": row[2],
                "document_id": row[3],
                "filename": row[4],
                "char_start": row[5] or 0,
                "char_end": row[6] or 0,
                "page_start": row[7] or 1,
                "page_end": row[8] or 1,
            }
        )
    return results


def document_ref_map(chunks: list[dict]) -> dict[int, int]:
    """Map document_id -> citation ref [1]..[n], one number per file."""
    doc_ref: dict[int, int] = {}
    for c in chunks:
        doc_id = c["document_id"]
        if doc_id not in doc_ref:
            doc_ref[doc_id] = len(doc_ref) + 1
    return doc_ref


def source_count(chunks: list[dict]) -> int:
    return len(document_ref_map(chunks))


def build_context(chunks: list[dict]) -> str:
    doc_ref = document_ref_map(chunks)
    parts = []
    for c in chunks:
        ref = doc_ref[c["document_id"]]
        parts.append(f"[{ref}] {c['filename']}\n{c['content']}")
    return "\n\n".join(parts)


def build_citations(chunks: list[dict]) -> str:
    """One citation per document; [1] opens the best-matching chunk for that file."""
    doc_ref = document_ref_map(chunks)
    out = []
    seen_docs: set[int] = set()
    for c in chunks:
        doc_id = c["document_id"]
        if doc_id in seen_docs:
            continue
        seen_docs.add(doc_id)
        ref = doc_ref[doc_id]
        excerpt = (c["content"] or "")[:120]
        if len(c["content"] or "") > 120:
            excerpt += "…"
        out.append(
            {
                "ref": ref,
                "chunk_id": c["chunk_id"],
                "document_id": doc_id,
                "filename": c["filename"],
                "chunk_index": c["chunk_index"],
                "char_start": c.get("char_start", 0),
                "char_end": c.get("char_end", 0),
                "page_start": c.get("page_start", 1),
                "page_end": c.get("page_end", 1),
                "excerpt": excerpt,
            }
        )
    out.sort(key=lambda x: x["ref"])
    return json.dumps(out, ensure_ascii=False)


def _format_system_prompt(num_sources: int) -> str:
    return f"""你是知识库助手。仅根据提供的上下文回答问题。
若上下文不足以回答，请明确说明不知道，不要编造。

上下文共有 {num_sources} 个文件来源，编号 [1] 到 [{num_sources}]，每个编号对应一个文件（不是段落号、页码或片段序号）。
引用时只写文件编号，例如：……[1]、……[2]；同一文件无论出现几段内容都只使用同一个编号。
禁止写 [123]、片段#123、来源123 等形式。多个文件可写 [1][2]。"""


def normalize_answer_citations(text: str, chunks: list[dict]) -> str:
    """Fix common model mistakes: chunk index / out-of-range numbers vs [1]..[n]."""
    n = source_count(chunks)
    if n == 0 or not text:
        return text

    doc_ref = document_ref_map(chunks)
    chunk_index_to_ref = {
        c["chunk_index"]: doc_ref[c["document_id"]] for c in chunks
    }

    def repl_fragment(match: re.Match) -> str:
        ref = chunk_index_to_ref.get(int(match.group(1)))
        return f"[{ref}]" if ref else match.group(0)

    text = re.sub(r"片段#(\d+)", repl_fragment, text)

    for pattern in (r"【(\d+)】", r"《(\d+)》"):
        text = re.sub(
            pattern,
            lambda m: f"[{m.group(1)}]" if 1 <= int(m.group(1)) <= n else m.group(0),
            text,
        )

    for pattern in (r"来源\s*(\d+)", r"文档\s*(\d+)", r"文献\s*(\d+)"):
        text = re.sub(
            pattern,
            lambda m: f"[{m.group(1)}]" if 1 <= int(m.group(1)) <= n else m.group(0),
            text,
        )

    def repl_bracket(match: re.Match) -> str:
        ref = int(match.group(1))
        if 1 <= ref <= n:
            return f"[{ref}]"
        return match.group(1)

    return re.sub(r"\[(\d+)\]", repl_bracket, text)


def ensure_citation_markers(text: str, chunks: list[dict]) -> str:
    """Append [1][2]… when the model forgot to cite (one marker per file)."""
    text = normalize_answer_citations(text, chunks)
    n = source_count(chunks)
    if n == 0:
        return text
    if re.search(r"\[\d+\]", text):
        return text
    markers = "".join(f"[{i}]" for i in range(1, n + 1))
    return text.rstrip() + f"\n\n{markers}"


async def stream_answer(question: str, context: str, num_sources: int):
    messages = [
        {"role": "system", "content": _format_system_prompt(num_sources)},
        {
            "role": "user",
            "content": f"上下文:\n{context}\n\n问题: {question}",
        },
    ]
    client = OpenAIClient()
    async for payload in client.chat_stream(messages):
        yield payload
