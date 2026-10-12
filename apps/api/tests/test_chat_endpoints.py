import pytest
import os
import sys
import io
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Use mock provider for tests
os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATABASE_URL"] = "sqlite:///./test_researchmind.db"

from app.main import app
from app.database.database import create_db


@pytest.fixture(autouse=True)
def setup_db():
    create_db()
    yield
    # Cleanup test db file if exists
    try:
        if os.path.exists("./test_researchmind.db"):
            os.remove("./test_researchmind.db")
    except Exception:
        pass


@pytest.fixture
def client():
    return TestClient(app)


def test_sync_chat_endpoint(client):
    payload = {
        "session_id": "test-sync-1",
        "message": "Explain deep learning basics",
        "level": "btech",
        "language": "English",
        "mode": "default",
    }
    response = client.post("/api/chat/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test-sync-1"
    assert "response" in data
    assert len(data["history"]) >= 2


def test_stream_chat_endpoint(client):
    payload = {
        "session_id": "test-stream-1",
        "message": "What is backpropagation?",
        "level": "btech",
        "language": "English",
    }
    response = client.post("/api/chat/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    content = response.text
    assert "data: " in content
    assert '"done": true' in content


def test_sessions_and_messages_endpoints(client):
    session_id = "test-history-sess"
    # Send a message to populate history
    client.post("/api/chat/", json={
        "session_id": session_id,
        "message": "Hello mentor!",
        "level": "phd",
        "language": "English",
    })

    # Fetch sessions
    sessions_res = client.get("/api/chat/sessions")
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert any(s["session_id"] == session_id for s in sessions)

    # Fetch messages
    msgs_res = client.get(f"/api/chat/sessions/{session_id}/messages")
    assert msgs_res.status_code == 200
    messages = msgs_res.json()
    assert len(messages) >= 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Hello mentor!"


def test_document_upload_success(client):
    session_id = "test-doc-sess"
    file_content = b"Introduction to Transformer Architecture.\n\nTransformers rely on self-attention mechanisms."
    files = {"file": ("paper.txt", io.BytesIO(file_content), "text/plain")}
    data = {"session_id": session_id}

    response = client.post("/api/chat/upload", data=data, files=files)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "success"
    assert res_json["chunk_count"] >= 1


def test_document_upload_unsupported_format(client):
    session_id = "test-doc-err"
    files = {"file": ("binary.exe", io.BytesIO(b"binary content"), "application/octet-stream")}
    data = {"session_id": session_id}

    response = client.post("/api/chat/upload", data=data, files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_document_upload_empty_file(client):
    session_id = "test-doc-empty"
    files = {"file": ("empty.txt", io.BytesIO(b"   \n  "), "text/plain")}
    data = {"session_id": session_id}

    response = client.post("/api/chat/upload", data=data, files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_document_upload_size_limit(client):
    session_id = "test-doc-oversized"
    # Create content larger than 10MB (10MB + 100KB)
    large_content = b"A" * (10 * 1024 * 1024 + 102400)
    files = {"file": ("large.txt", io.BytesIO(large_content), "text/plain")}
    data = {"session_id": session_id}

    response = client.post("/api/chat/upload", data=data, files=files)
    assert response.status_code == 413
    assert "exceeds maximum allowed size" in response.json()["detail"].lower()


def test_communicate_generate_and_history(client):
    req_data = {
        "recipient": "professor",
        "recipient_label": "Professor",
        "purpose": "project_guidance",
        "purpose_label": "Ask for Project Guidance",
        "context": "I would like guidance on implementing diffusion models for medical imaging.",
        "tone": "academic",
        "experience_level": "M.Tech Student",
        "desired_outcome": "Schedule a meeting",
    }
    gen_res = client.post("/api/communicate/generate", json=req_data)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert "subject" in gen_data
    assert "email" in gen_data
    assert "id" in gen_data

    # Fetch email history
    hist_res = client.get("/api/communicate/history")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) >= 1
    assert any(e["id"] == gen_data["id"] for e in hist)
