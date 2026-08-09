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
