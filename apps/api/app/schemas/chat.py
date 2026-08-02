from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal

StudentLevel = Literal["btech", "mtech", "phd"]

class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "English"
    level: StudentLevel = "btech"

class ChatResponse(BaseModel):
    session_id: str
    response: str
    history: Optional[List[Dict[str, Any]]] = None
