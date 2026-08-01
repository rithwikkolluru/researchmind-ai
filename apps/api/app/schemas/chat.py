from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "English"

class ChatResponse(BaseModel):
    session_id: str
    response: str
    history: Optional[List[Dict[str, Any]]] = None
