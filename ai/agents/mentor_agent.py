from ai.prompts.system_prompt import get_research_mentor_prompt
from ai.memory.memory_interface import MemoryInterface

class MentorAgent:
    def __init__(self, memory_service: MemoryInterface):
        self.memory_service = memory_service

    def generate_response(self, session_id: str, user_message: str, language: str = "English") -> str:
        # Get the system prompt
        system_prompt = get_research_mentor_prompt(language)
        
        # Save user message to memory
        self.memory_service.add_message(session_id, "user", user_message)
        
        # Retrieve context (history)
        history = self.memory_service.get_conversation_history(session_id)
        
        # In a real implementation, we would pass system_prompt + history to an LLM provider here.
        # Since we are avoiding production APIs, we mock the LLM response.
        
        response_text = (
            f"[Mock LLM Response in {language}] "
            f"I have received your message: '{user_message}'. "
            f"I see you have {len(history)} messages in your history. "
            f"As your research mentor, I advise you to review the literature thoroughly. How can I assist further?"
        )
        
        # Save AI response to memory
        self.memory_service.add_message(session_id, "assistant", response_text)
        
        return response_text
