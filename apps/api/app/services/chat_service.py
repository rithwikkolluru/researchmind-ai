import os
import sys
from typing import Generator, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

from ai.memory.memory_service import SQLAlchemyMemoryService
from ai.agents.mentor_agent import MentorAgent
from app.schemas.chat import ChatResponse
from app.database.database import engine

memory_service = SQLAlchemyMemoryService(engine=engine)
mentor_agent = MentorAgent(memory_service=memory_service)


def process_chat_message(
    session_id: str,
    message: str,
    language: str = "English",
    level: str = "btech",
    mode: str = "default",
    enable_quality_tracker: bool = False,
) -> ChatResponse:
    # Ensure conversation record is stored/updated
    memory_service.ensure_conversation(session_id, level=level, language=language, mode=mode)

    # Retrieve relevant document chunks for RAG
    relevant_chunks = memory_service.get_relevant_chunks(session_id, message, top_k=3)
    context = "\n---\n".join(relevant_chunks) if relevant_chunks else None

    response_text = mentor_agent.generate_response(
        session_id=session_id,
        user_message=message,
        level=level,
        language=language,
        mode=mode,
        enable_quality_tracker=enable_quality_tracker,
        context=context,
    )
    history = memory_service.get_conversation_history(session_id)
    return ChatResponse(
        session_id=session_id,
        response=response_text,
        history=history,
    )


def stream_chat_message(
    session_id: str,
    message: str,
    language: str = "English",
    level: str = "btech",
    mode: str = "default",
    enable_quality_tracker: bool = False,
) -> Generator[str, None, None]:
    # Ensure conversation record is stored/updated
    memory_service.ensure_conversation(session_id, level=level, language=language, mode=mode)

    # Retrieve relevant document chunks for RAG
    relevant_chunks = memory_service.get_relevant_chunks(session_id, message, top_k=3)
    context = "\n---\n".join(relevant_chunks) if relevant_chunks else None

    yield from mentor_agent.generate_response_stream(
        session_id=session_id,
        user_message=message,
        level=level,
        language=language,
        mode=mode,
        enable_quality_tracker=enable_quality_tracker,
        context=context,
    )
