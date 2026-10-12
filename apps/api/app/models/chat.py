from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"

    session_id: str = Field(primary_key=True, index=True)
    level: str = Field(default="btech")
    language: str = Field(default="English")
    mode: str = Field(default="default")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    messages: List["ChatMessage"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "select"}
    )
    documents: List["DocumentChunk"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "select"}
    )


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="conversations.session_id", index=True)
    role: str = Field(...)  # user, assistant, system
    content: str = Field(...)
    timestamp: datetime = Field(default_factory=get_utc_now)

    conversation: Optional[Conversation] = Relationship(back_populates="messages")


class DocumentChunk(SQLModel, table=True):
    __tablename__ = "document_chunks"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="conversations.session_id", index=True)
    filename: str = Field(index=True)
    chunk_index: int = Field(default=0)
    content: str = Field(...)
    created_at: datetime = Field(default_factory=get_utc_now)

    conversation: Optional[Conversation] = Relationship(back_populates="documents")
