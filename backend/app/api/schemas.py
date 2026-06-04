from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import DocumentStatus, MessageRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str


class CollectionCreate(BaseModel):
    name: str
    description: str = ""


class CollectionResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime


class DocumentResponse(BaseModel):
    id: int
    collection_id: int
    filename: str
    status: DocumentStatus
    error_message: str
    created_at: datetime


class DocumentTextCreate(BaseModel):
    """新建 Markdown 文档（应用内编辑，非上传文件）。"""

    filename: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class DocumentContentResponse(BaseModel):
    id: int
    collection_id: int
    filename: str
    content: str
    editable: bool


class DocumentContentUpdate(BaseModel):
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    collection_id: int
    message: str
    conversation_id: int | None = None


class MessageResponse(BaseModel):
    id: int
    role: MessageRole
    content: str
    citations: str
    created_at: datetime


class ConversationResponse(BaseModel):
    id: int
    collection_id: int
    title: str
    created_at: datetime


class ChunkSourceResponse(BaseModel):
    chunk_id: int
    document_id: int
    collection_id: int
    filename: str
    file_type: str
    full_text: str | None = None
    char_start: int
    char_end: int
    page_start: int
    page_end: int
    excerpt: str
    chunk_index: int
    ref: int | None = None
