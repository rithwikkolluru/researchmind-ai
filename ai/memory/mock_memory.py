from typing import List, Dict, Any
from .memory_interface import MemoryInterface

class MockMemoryService(MemoryInterface):
    """
    An in-memory dictionary-based implementation of MemoryInterface.
    Useful for local development and testing without a real database.
    """
    def __init__(self):
        self._store: Dict[str, List[Dict[str, Any]]] = {}

    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        return self._store.get(session_id, [])

    def add_message(self, session_id: str, role: str, content: str) -> None:
        if session_id not in self._store:
            self._store[session_id] = []
        self._store[session_id].append({"role": role, "content": content})

    def clear_history(self, session_id: str) -> None:
        if session_id in self._store:
            del self._store[session_id]
