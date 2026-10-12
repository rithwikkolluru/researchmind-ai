from typing import Generator
from sqlmodel import SQLModel, create_engine, Session

from app.core.config import settings
# Ensure all models are registered with SQLModel metadata
from app.models import Conversation, ChatMessage, DocumentChunk, SavedEmail  # noqa: F401

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)


def create_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session