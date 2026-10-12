import os
import sys
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

from sqlmodel import Session, select, create_engine
from ai.memory.memory_interface import MemoryInterface

# Ensure apps/api and root are available on sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.abspath(os.path.join(_current_dir, "../.."))
_api_dir = os.path.join(_repo_root, "apps", "api")
for p in [_repo_root, _api_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.models.chat import Conversation, ChatMessage, DocumentChunk
    from app.models.email import SavedEmail
except ImportError:
    from apps.api.app.models.chat import Conversation, ChatMessage, DocumentChunk
    from apps.api.app.models.email import SavedEmail


class SQLAlchemyMemoryService(MemoryInterface):
    """
    SQLAlchemy/SQLModel persistent memory service.
    Persists conversation sessions, chat messages, and document chunks to database.
    """

    def __init__(self, engine=None, db_url: Optional[str] = None):
        if engine is not None:
            self.engine = engine
        elif db_url is not None:
            connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
            self.engine = create_engine(db_url, echo=False, connect_args=connect_args)
        else:
            try:
                from app.database.database import engine as app_engine
                self.engine = app_engine
            except Exception:
                db_url = os.getenv("DATABASE_URL", "sqlite:///./researchmind.db")
                connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
                self.engine = create_engine(db_url, echo=False, connect_args=connect_args)

        # Ensure all tables are created
        try:
            from sqlmodel import SQLModel
            SQLModel.metadata.create_all(self.engine)
        except Exception:
            pass

    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve conversation history as a list of role/content dictionaries."""
        with Session(self.engine) as session:
            stmt = (
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.id.asc())
            )
            messages = session.exec(stmt).all()
            return [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                }
                for msg in messages
            ]

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        level: str = "btech",
        language: str = "English",
        mode: str = "default",
    ) -> None:
        """Add a message and ensure the parent conversation exists."""
        with Session(self.engine) as session:
            conv = session.get(Conversation, session_id)
            now = get_utc_now()
            if not conv:
                conv = Conversation(
                    session_id=session_id,
                    level=level,
                    language=language,
                    mode=mode,
                    created_at=now,
                    updated_at=now,
                )
                session.add(conv)
            else:
                conv.updated_at = now
                session.add(conv)

            chat_msg = ChatMessage(
                session_id=session_id,
                role=role,
                content=content,
                timestamp=now,
            )
            session.add(chat_msg)
            session.commit()

    def clear_history(self, session_id: str) -> None:
        """Clear all messages for a given session ID."""
        with Session(self.engine) as session:
            stmt = select(ChatMessage).where(ChatMessage.session_id == session_id)
            messages = session.exec(stmt).all()
            for msg in messages:
                session.delete(msg)
            session.commit()

    def ensure_conversation(
        self,
        session_id: str,
        level: str = "btech",
        language: str = "English",
        mode: str = "default",
    ) -> Conversation:
        """Ensure conversation record exists with updated metadata."""
        with Session(self.engine) as session:
            conv = session.get(Conversation, session_id)
            now = get_utc_now()
            if not conv:
                conv = Conversation(
                    session_id=session_id,
                    level=level,
                    language=language,
                    mode=mode,
                    created_at=now,
                    updated_at=now,
                )
                session.add(conv)
                session.commit()
                session.refresh(conv)
            else:
                conv.level = level
                conv.language = language
                conv.mode = mode
                conv.updated_at = now
                session.add(conv)
                session.commit()
                session.refresh(conv)
            return conv

    def get_conversation(self, session_id: str) -> Optional[Conversation]:
        """Fetch conversation by session_id."""
        with Session(self.engine) as session:
            return session.get(Conversation, session_id)

    def list_sessions(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """List past conversation sessions with metadata and message counts."""
        with Session(self.engine) as session:
            stmt = (
                select(Conversation)
                .order_by(Conversation.updated_at.desc())
                .offset(offset)
                .limit(limit)
            )
            conversations = session.exec(stmt).all()

            results = []
            for conv in conversations:
                # Get message count and last message
                msg_stmt = (
                    select(ChatMessage)
                    .where(ChatMessage.session_id == conv.session_id)
                    .order_by(ChatMessage.id.desc())
                )
                all_msgs = session.exec(msg_stmt).all()
                last_msg = all_msgs[0].content if all_msgs else ""
                results.append({
                    "session_id": conv.session_id,
                    "level": conv.level,
                    "language": conv.language,
                    "mode": conv.mode,
                    "created_at": conv.created_at.isoformat() if conv.created_at else None,
                    "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                    "message_count": len(all_msgs),
                    "last_message": last_msg[:120] if last_msg else "",
                })
            return results

    def get_session_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a session."""
        return self.get_conversation_history(session_id)

    # ── Document RAG Support ──────────────────────────────────────────────────

    def store_document_chunks(
        self, session_id: str, filename: str, chunks: List[str]
    ) -> int:
        """Store document chunks for a session in the database."""
        with Session(self.engine) as session:
            self.ensure_conversation(session_id)
            now = get_utc_now()
            for idx, chunk_text in enumerate(chunks):
                doc_chunk = DocumentChunk(
                    session_id=session_id,
                    filename=filename,
                    chunk_index=idx,
                    content=chunk_text,
                    created_at=now,
                )
                session.add(doc_chunk)
            session.commit()
            return len(chunks)

    def get_relevant_chunks(
        self, session_id: str, query: str, top_k: int = 3
    ) -> List[str]:
        """
        Retrieve the top_k most relevant document chunks for the session using keyword/similarity scoring.
        """
        with Session(self.engine) as session:
            stmt = select(DocumentChunk).where(DocumentChunk.session_id == session_id)
            chunks = session.exec(stmt).all()
            if not chunks:
                return []

            # Basic keyword & token-overlap scoring
            query_words = set(re.findall(r"\w+", query.lower()))
            if not query_words:
                return [c.content for c in chunks[:top_k]]

            scored: List[tuple[float, str]] = []
            for chunk in chunks:
                chunk_words = set(re.findall(r"\w+", chunk.content.lower()))
                if not chunk_words:
                    score = 0.0
                else:
                    intersection = query_words.intersection(chunk_words)
                    score = len(intersection) / float(len(query_words) + 1)
                scored.append((score, chunk.content))

            scored.sort(key=lambda x: x[0], reverse=True)
            # If highest score is 0, still return top chunks so the mentor has some document context
            return [content for _, content in scored[:top_k]]
