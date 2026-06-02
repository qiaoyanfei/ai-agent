from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Text
from sqlmodel import Field, Relationship, SQLModel

from app.core.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DocumentStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=utcnow)

    collections: list["Collection"] = Relationship(back_populates="owner")


class Collection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    owner_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)

    owner: User = Relationship(back_populates="collections")
    documents: list["Document"] = Relationship(back_populates="collection")


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    collection_id: int = Field(foreign_key="collection.id", index=True)
    filename: str
    content_type: str = ""
    status: DocumentStatus = Field(default=DocumentStatus.pending)
    error_message: str = ""
    created_at: datetime = Field(default_factory=utcnow)

    collection: Collection = Relationship(back_populates="documents")
    chunks: list["DocumentChunk"] = Relationship(back_populates="document")


class DocumentChunk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(foreign_key="document.id", index=True)
    chunk_index: int
    content: str = Field(sa_column=Column(Text))
    char_start: int = 0
    char_end: int = 0
    page_start: int = 1
    page_end: int = 1
    embedding: list[float] = Field(sa_column=Column(Vector(settings.embedding_dimensions)))

    document: Document = Relationship(back_populates="chunks")


class Conversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    collection_id: int = Field(foreign_key="collection.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str = "新对话"
    created_at: datetime = Field(default_factory=utcnow)

    messages: list["ChatMessage"] = Relationship(back_populates="conversation")


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id", index=True)
    role: MessageRole
    content: str = Field(sa_column=Column(Text))
    citations: str = ""  # JSON string of citation list
    created_at: datetime = Field(default_factory=utcnow)

    conversation: Conversation = Relationship(back_populates="messages")
