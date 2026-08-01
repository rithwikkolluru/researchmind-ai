import os
import sys

# Add root to sys.path to allow importing from ai
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

from ai.memory.mock_memory import MockMemoryService
from ai.agents.mentor_agent import MentorAgent
from app.schemas.chat import ChatResponse

# Dependency Injection equivalent for Mock services
memory_service = MockMemoryService()
mentor_agent = MentorAgent(memory_service=memory_service)

def process_chat_message(session_id: str, message: str, language: str) -> ChatResponse:
    # Generate the response via the AI agent
    response_text = mentor_agent.generate_response(
        session_id=session_id,
        user_message=message,
        language=language
    )
    
    # Retrieve updated history
    history = memory_service.get_conversation_history(session_id)
    
    return ChatResponse(
        session_id=session_id,
        response=response_text,
        history=history
    )
