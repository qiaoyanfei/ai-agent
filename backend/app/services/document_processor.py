from pathlib import Path

from sqlmodel import Session, select

from app.core.config import settings
from app.models import Document, DocumentChunk, DocumentStatus
from app.services.openai_client import OpenAIClient
from app.services.parser import char_offset_to_page, extract_text_with_pages
from app.services.text_splitter import split_text_with_offsets


async def process_document_task(document_id: int) -> None:
    from app.db.session import engine

    with Session(engine) as session:
        await process_document(session, document_id)


async def process_document(session: Session, document_id: int) -> None:
    doc = session.get(Document, document_id)
    if not doc:
        return
    doc.status = DocumentStatus.processing
    session.add(doc)
    session.commit()

    path = Path(settings.upload_dir) / str(doc.collection_id) / str(doc.id) / doc.filename
    try:
        full_text, page_starts = extract_text_with_pages(path, doc.content_type)
        chunk_specs = split_text_with_offsets(
            full_text, settings.chunk_size, settings.chunk_overlap
        )
        if not chunk_specs:
            raise ValueError("文档无有效文本")

        client = OpenAIClient()
        batch_size = 20
        all_embeddings: list[list[float]] = []
        texts = [c["content"] for c in chunk_specs]
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            all_embeddings.extend(await client.embed(batch))

        existing = session.exec(
            select(DocumentChunk).where(DocumentChunk.document_id == doc.id)
        ).all()
        for row in existing:
            session.delete(row)

        for idx, (spec, emb) in enumerate(zip(chunk_specs, all_embeddings)):
            char_start = spec["char_start"]
            char_end = spec["char_end"]
            page_start = char_offset_to_page(char_start, page_starts)
            page_end = char_offset_to_page(max(char_end - 1, char_start), page_starts)
            session.add(
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=idx,
                    content=spec["content"],
                    char_start=char_start,
                    char_end=char_end,
                    page_start=page_start,
                    page_end=page_end,
                    embedding=emb,
                )
            )

        doc.status = DocumentStatus.ready
        doc.error_message = ""
    except Exception as exc:  # noqa: BLE001
        doc.status = DocumentStatus.failed
        doc.error_message = str(exc)[:500]
    session.add(doc)
    session.commit()
