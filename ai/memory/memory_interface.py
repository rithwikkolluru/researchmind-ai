from abc import ABC, abstractmethod
from typing import List, Dict, Any

class MemoryInterface(ABC):
    @abstractmethod
    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve the conversation history for a given session."""
        pass
    
    @abstractmethod
    def add_message(self, session_id: str, role: str, content: str) -> None:
        """Add a message to the conversation history."""
        pass
    
    @abstractmethod
    def clear_history(self, session_id: str) -> None:
        """Clear the conversation history for a session."""
        pass
