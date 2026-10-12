import pytest
import os
import sys
from sqlmodel import SQLModel, create_engine, Session, select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import Conversation, ChatMessage, DocumentChunk, SavedEmail
from ai.memory.memory_service import SQLAlchemyMemoryService


@pytest.fixture
def in_memory_engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    return engine


def test_models_creation(in_memory_engine):
    with Session(in_memory_engine) as session:
        conv = Conversation(
            session_id="sess-db-1",
            level="mtech",
            language="English",
            mode="teach",
        )
        session.add(conv)
        session.commit()

        msg = ChatMessage(
            session_id="sess-db-1",
            role="user",
            content="Can you explain attention?",
        )
        session.add(msg)

        doc = DocumentChunk(
            session_id="sess-db-1",
            filename="paper.pdf",
            chunk_index=0,
            content="Attention is all you need paper content...",
        )
        session.add(doc)

        email = SavedEmail(
            recipient="professor",
            recipient_label="Professor",
            purpose="research_collaboration",
            purpose_label="Research Collaboration",
            context="Need guidance on thesis",
            tone="academic",
            subject="Collaboration Proposal",
            email_body="Dear Professor...",
            reason="Clear subject and academic tone.",
        )
        session.add(email)
        session.commit()

        # Query back
        stored_conv = session.get(Conversation, "sess-db-1")
        assert stored_conv is not None
        assert stored_conv.level == "mtech"

        stored_msgs = session.exec(select(ChatMessage).where(ChatMessage.session_id == "sess-db-1")).all()
        assert len(stored_msgs) == 1
        assert stored_msgs[0].content == "Can you explain attention?"

        stored_emails = session.exec(select(SavedEmail)).all()
        assert len(stored_emails) == 1
        assert stored_emails[0].subject == "Collaboration Proposal"


def test_sqlalchemy_memory_service(in_memory_engine):
    service = SQLAlchemyMemoryService(engine=in_memory_engine)

    session_id = "test-mem-session"
    service.add_message(session_id, "user", "What is gradient descent?", level="btech")
    service.add_message(session_id, "assistant", "Gradient descent is an optimization algorithm...")

    history = service.get_conversation_history(session_id)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"

    # List sessions
    sessions = service.list_sessions()
    assert len(sessions) >= 1
    matching = [s for s in sessions if s["session_id"] == session_id]
    assert len(matching) == 1
    assert matching[0]["message_count"] == 2

    # Test document chunks and retrieval
    chunks = [
        "Convolutional neural networks are great for computer vision.",
        "Recurrent neural networks process sequential data and text.",
        "Gradient descent minimizes the loss function step by step.",
    ]
    service.store_document_chunks(session_id, "notes.txt", chunks)

    relevant = service.get_relevant_chunks(session_id, "gradient optimization", top_k=1)
    assert len(relevant) == 1
    assert "Gradient descent" in relevant[0]

    # Clear history
    service.clear_history(session_id)
    cleared_history = service.get_conversation_history(session_id)
    assert len(cleared_history) == 0
