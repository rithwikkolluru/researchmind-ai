from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal

StudentLevel = Literal["btech", "mtech", "phd"]
MentorMode = Literal["default", "teach", "paper_discussion", "roadmap", "debate"]


class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "English"
    level: StudentLevel = "btech"
    mode: MentorMode = "default"
    enable_quality_tracker: bool = False


class ChatResponse(BaseModel):
    session_id: str
    response: str
    history: Optional[List[Dict[str, Any]]] = None


class SessionSummary(BaseModel):
    session_id: str
    level: str
    language: str
    mode: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    message_count: int = 0
    last_message: Optional[str] = ""


class ChatMessageOut(BaseModel):
    id: Optional[int] = None
    session_id: Optional[str] = None
    role: str
    content: str
    timestamp: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    status: str
    message: str
    filename: str
    chunk_count: int
