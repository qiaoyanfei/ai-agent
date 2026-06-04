import shutil
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, delete, select

from app.api.deps import get_current_user
from app.api.schemas import (
    ChunkSourceResponse,
    DocumentContentResponse,
    DocumentContentUpdate,
    DocumentResponse,
    DocumentTextCreate,
)
from app.core.config import settings
from app.db.session import get_session
from app.models import Collection, Document, DocumentChunk, DocumentStatus, User
from app.services.document_processor import process_document_task

router = APIRouter(tags=["documents"])

ALLOWED_SUFFIX = {".pdf", ".txt", ".md", ".markdown"}
EDITABLE_SUFFIX = {".md", ".markdown", ".txt"}
MAX_TEXT_BYTES = 2 * 1024 * 1024  # 2MB


def _normalize_md_filename(filename: str) -> str:
    name = (filename or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    suffix = Path(name).suffix.lower()
    if suffix in {".md", ".markdown"}:
        return name
    if suffix and suffix not in ALLOWED_SUFFIX:
        raise HTTPException(status_code=400, detail="新建文档仅支持 .md / .markdown")
    if "." not in Path(name).name:
        return f"{name}.md"
    raise HTTPException(status_code=400, detail="新建文档请使用 .md 扩展名")


def _is_content_editable(filename: str) -> bool:
    return Path(filename).suffix.lower() in EDITABLE_SUFFIX


def _write_document_file(doc: Document, content: str) -> None:
    data = content.encode("utf-8")
    if len(data) > MAX_TEXT_BYTES:
        raise HTTPException(status_code=400, detail="文档内容超过 2MB 限制")
    dest_dir = Path(settings.upload_dir) / str(doc.collection_id) / str(doc.id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / doc.filename
    path.write_bytes(data)


def _schedule_process(background_tasks: BackgroundTasks, document_id: int) -> None:
    background_tasks.add_task(process_document_task, document_id)


def _file_type(filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return "pdf"
    return "text"


def _document_path(doc: Document) -> Path:
    return Path(settings.upload_dir) / str(doc.collection_id) / str(doc.id) / doc.filename


def _get_owned_document(session: Session, user: User, document_id: int) -> Document:
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    col = session.get(Collection, doc.collection_id)
    if not col or col.owner_id != user.id:
        raise HTTPException(status_code=404, detail="文档不存在")
    return doc


def _get_owned_collection(session: Session, user: User, collection_id: int) -> Collection:
    col = session.get(Collection, collection_id)
    if not col or col.owner_id != user.id:
        raise HTTPException(status_code=404, detail="知识库不存在")
    return col


@router.get("/collections/{collection_id}/documents", response_model=list[DocumentResponse])
def list_documents(
    collection_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_collection(session, user, collection_id)
    rows = session.exec(select(Document).where(Document.collection_id == collection_id)).all()
    return [
        DocumentResponse(
            id=d.id,
            collection_id=d.collection_id,
            filename=d.filename,
            status=d.status,
            error_message=d.error_message,
            created_at=d.created_at,
        )
        for d in rows
    ]


@router.post("/collections/{collection_id}/documents", response_model=DocumentResponse)
async def upload_document(
    collection_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_collection(session, user, collection_id)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIX:
        raise HTTPException(status_code=400, detail="仅支持 pdf / txt / md")

    doc = Document(
        collection_id=collection_id,
        filename=file.filename or "unknown",
        content_type=file.content_type or "",
        status=DocumentStatus.pending,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)

    dest_dir = Path(settings.upload_dir) / str(collection_id) / str(doc.id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / doc.filename
    with dest_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    background_tasks.add_task(process_document_task, doc.id)

    return DocumentResponse(
        id=doc.id,
        collection_id=doc.collection_id,
        filename=doc.filename,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at,
    )


@router.post("/collections/{collection_id}/documents/text", response_model=DocumentResponse)
async def create_text_document(
    collection_id: int,
    body: DocumentTextCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """新建 Markdown 文档并写入内容，后台解析入库。"""
    _get_owned_collection(session, user, collection_id)
    filename = _normalize_md_filename(body.filename)
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="内容不能为空")

    doc = Document(
        collection_id=collection_id,
        filename=filename,
        content_type="text/markdown",
        status=DocumentStatus.pending,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)

    _write_document_file(doc, content)
    _schedule_process(background_tasks, doc.id)

    return DocumentResponse(
        id=doc.id,
        collection_id=doc.collection_id,
        filename=doc.filename,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at,
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doc = _get_owned_document(session, user, document_id)
    return DocumentResponse(
        id=doc.id,
        collection_id=doc.collection_id,
        filename=doc.filename,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at,
    )


@router.get("/documents/{document_id}/content", response_model=DocumentContentResponse)
def get_document_content(
    document_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doc = _get_owned_document(session, user, document_id)
    editable = _is_content_editable(doc.filename)
    content = ""
    if editable:
        path = _document_path(doc)
        if path.exists():
            content = path.read_text(encoding="utf-8", errors="ignore")
    return DocumentContentResponse(
        id=doc.id,
        collection_id=doc.collection_id,
        filename=doc.filename,
        content=content,
        editable=editable,
    )


@router.put("/documents/{document_id}/content", response_model=DocumentResponse)
async def update_document_content(
    document_id: int,
    body: DocumentContentUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doc = _get_owned_document(session, user, document_id)
    if not _is_content_editable(doc.filename):
        raise HTTPException(status_code=400, detail="PDF 等文件请重新上传，不支持在线编辑")
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="内容不能为空")

    _write_document_file(doc, content)
    doc.status = DocumentStatus.pending
    doc.error_message = ""
    session.add(doc)
    session.commit()
    session.refresh(doc)
    _schedule_process(background_tasks, doc.id)

    return DocumentResponse(
        id=doc.id,
        collection_id=doc.collection_id,
        filename=doc.filename,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at,
    )


@router.get("/chunks/{chunk_id}/source", response_model=ChunkSourceResponse)
def get_chunk_source(
    chunk_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    chunk = session.get(DocumentChunk, chunk_id)
    if not chunk:
        raise HTTPException(status_code=404, detail="片段不存在")
    doc = _get_owned_document(session, user, chunk.document_id)
    if doc.status != DocumentStatus.ready:
        raise HTTPException(status_code=400, detail="文档尚未就绪")

    ft = _file_type(doc.filename)
    full_text = None
    if ft == "text":
        path = _document_path(doc)
        if path.exists():
            full_text = path.read_text(encoding="utf-8", errors="ignore")

    excerpt = chunk.content[:120] + ("…" if len(chunk.content) > 120 else "")
    return ChunkSourceResponse(
        chunk_id=chunk.id,
        document_id=doc.id,
        collection_id=doc.collection_id,
        filename=doc.filename,
        file_type=ft,
        full_text=full_text,
        char_start=chunk.char_start,
        char_end=chunk.char_end,
        page_start=chunk.page_start,
        page_end=chunk.page_end,
        excerpt=excerpt,
        chunk_index=chunk.chunk_index,
    )


@router.get("/documents/{document_id}/file")
def download_document_file(
    document_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doc = _get_owned_document(session, user, document_id)
    path = _document_path(doc)
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    media = "application/pdf" if _file_type(doc.filename) == "pdf" else "text/plain"
    return FileResponse(path, media_type=media, filename=doc.filename)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doc = _get_owned_document(session, user, document_id)

    session.exec(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
    upload_dir = Path(settings.upload_dir) / str(doc.collection_id) / str(doc.id)
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)
    session.delete(doc)
    session.commit()
