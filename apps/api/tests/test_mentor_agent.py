import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.agents.mentor_agent import MentorAgent, GROQ_DEFAULT_MODEL, GEMINI_DEFAULT_MODEL
from ai.memory.mock_memory import MockMemoryService


def test_mentor_agent_model_defaults():
    assert GROQ_DEFAULT_MODEL == "llama-3.3-70b-versatile"
    assert GEMINI_DEFAULT_MODEL == "gemini-1.5-flash"


def test_mentor_agent_generate_response():
    memory = MockMemoryService()
    agent = MentorAgent(memory_service=memory)

    # Force mock provider for deterministic tests
    os.environ["LLM_PROVIDER"] = "mock"

    session_id = "test-session-1"
    response = agent.generate_response(
        session_id=session_id,
        user_message="Hello, can you help me with neural networks?",
        level="btech",
        language="English",
    )

    assert "neural networks" in response
    history = memory.get_conversation_history(session_id)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
    assert history[1]["content"] == response


def test_mentor_agent_streaming():
    memory = MockMemoryService()
    agent = MentorAgent(memory_service=memory)
    os.environ["LLM_PROVIDER"] = "mock"

    session_id = "test-session-stream"
    tokens = list(agent.generate_response_stream(
        session_id=session_id,
        user_message="Explain transformers",
        level="mtech",
    ))

    assert len(tokens) > 1
    full_text = "".join(tokens)
    assert "transformers" in full_text

    history = memory.get_conversation_history(session_id)
    assert len(history) == 2
    assert history[1]["content"] == full_text


def test_mentor_agent_rag_context():
    memory = MockMemoryService()
    agent = MentorAgent(memory_service=memory)
    os.environ["LLM_PROVIDER"] = "mock"

    session_id = "test-session-rag"
    response = agent.generate_response(
        session_id=session_id,
        user_message="What does section 3 discuss?",
        context="Section 3 discusses attention mechanisms in transformers.",
    )
    assert isinstance(response, str)
