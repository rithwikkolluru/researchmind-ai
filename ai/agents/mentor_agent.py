"""
MentorAgent — Core orchestrator for the Vaani voice research mentor.

Single Responsibility: Given a student's message + context, produce a
level-calibrated, memory-aware, LLM-powered text response.

Inputs:
  - session_id: unique conversation identifier
  - user_message: transcribed text from STT or typed input
  - level: student academic level (btech/mtech/phd)
  - language: preferred response language

Outputs:
  - response text (to be passed to TTS or returned as chat text)

Failure fallback: returns a graceful error message rather than crashing,
so the voice pipeline can still speak something to the student.

LLM swap path:
  - Currently uses Groq (Llama 3.3 70B) — requires GROQ_API_KEY in .env
  - Gemini 2.5 Flash: set LLM_PROVIDER=gemini in .env for document-heavy sessions
  - Ollama (local): set LLM_PROVIDER=ollama for fully offline / privacy mode
"""

import json
import logging
import os
from typing import Generator, Optional

from ai.prompts.system_prompt import get_system_prompt, StudentLevel
from ai.memory.memory_interface import MemoryInterface

logger = logging.getLogger(__name__)

# Maximum number of history turns to include in context (to control token cost)
MAX_HISTORY_TURNS = 10

GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile"
GEMINI_DEFAULT_MODEL = "gemini-1.5-flash"


class MentorAgent:
    """
    Level-calibrated, memory-aware research mentor agent.

    Uses an injected MemoryInterface for conversation history.
    """

    def __init__(self, memory_service: MemoryInterface):
        self.memory_service = memory_service

    @property
    def _llm_provider(self) -> str:
        return os.getenv("LLM_PROVIDER", "gemini").lower()

    @property
    def _groq_api_key(self) -> str:
        return os.getenv("GROQ_API_KEY", "")

    @property
    def _gemini_api_key(self) -> str:
        return os.getenv("GEMINI_API_KEY", "")

    def generate_response(
        self,
        session_id: str,
        user_message: str,
        level: StudentLevel = "btech",
        language: str = "English",
        mode: str = "default",
        enable_quality_tracker: bool = False,
        context: Optional[str] = None,
    ) -> str:
        """
        Generate a mentor response for the given student message.

        Args:
            session_id: Unique session/conversation ID.
            user_message: The student's transcribed or typed message.
            level: Academic level for persona calibration.
            language: Preferred response language.
            mode: Mentor active mode.
            enable_quality_tracker: Score intellectual quality.
            context: Optional retrieved document context for RAG.

        Returns:
            Response text string suitable for TTS or text display.
        """
        # Save user turn to memory
        self.memory_service.add_message(session_id, "user", user_message)

        # Build prompt context from history (sliding window for token efficiency)
        history = self.memory_service.get_conversation_history(session_id)
        recent_history = history[-(MAX_HISTORY_TURNS * 2):]  # user+assistant pairs

        system_prompt = get_system_prompt(level, language, mode, enable_quality_tracker)
        if context:
            system_prompt += f"\n\n[RELEVANT CONTEXT FROM UPLOADED DOCUMENTS]:\n{context}"

        # Generate response via LLM
        try:
            response_text = self._call_llm(
                system_prompt=system_prompt,
                history=recent_history,
                user_message=user_message,
            )
        except Exception as exc:
            logger.error("LLM call failed for session %s: %s", session_id, exc)
            # Graceful fallback — always give the student something
            error_details = str(exc)
            response_text = (
                f"I'm having a moment of difficulty connecting to my knowledge base right now. "
                f"Error details for debugging: {error_details}"
            )

        # Save assistant turn to memory
        self.memory_service.add_message(session_id, "assistant", response_text)

        return response_text

    def generate_response_stream(
        self,
        session_id: str,
        user_message: str,
        level: StudentLevel = "btech",
        language: str = "English",
        mode: str = "default",
        enable_quality_tracker: bool = False,
        context: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Stream a mentor response token-by-token for the given student message.

        Yields:
            Token chunks as strings.
        """
        # Save user turn to memory
        self.memory_service.add_message(session_id, "user", user_message)

        # Build prompt context from history
        history = self.memory_service.get_conversation_history(session_id)
        recent_history = history[-(MAX_HISTORY_TURNS * 2):]

        system_prompt = get_system_prompt(level, language, mode, enable_quality_tracker)
        if context:
            system_prompt += f"\n\n[RELEVANT CONTEXT FROM UPLOADED DOCUMENTS]:\n{context}"

        accumulated: list[str] = []
        try:
            for token in self._stream_llm(
                system_prompt=system_prompt,
                history=recent_history,
                user_message=user_message,
            ):
                accumulated.append(token)
                yield token
        except Exception as exc:
            logger.error("LLM stream failed for session %s: %s", session_id, exc)
            error_msg = (
                f"I'm having a moment of difficulty connecting to my knowledge base right now. "
                f"Error details for debugging: {str(exc)}"
            )
            accumulated.append(error_msg)
            yield error_msg

        # Save assistant turn to memory once stream completes
        full_response = "".join(accumulated)
        self.memory_service.add_message(session_id, "assistant", full_response)

    def _call_llm(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
    ) -> str:
        """
        Route to the configured LLM provider.

        Provider selection is driven by LLM_PROVIDER env var:
          - 'groq'   → Groq API (Llama 3.3 70B) — default, fast
          - 'gemini' → Gemini 1.5 Flash / 2.0 Flash — better for document tasks
          - 'ollama' → Local Ollama — fully offline, zero cost
          - 'mock'   → Deterministic mock — for tests / no API key
        """
        if self._llm_provider == "gemini" and self._gemini_api_key:
            try:
                return self._call_gemini(system_prompt, history, user_message)
            except Exception as e:
                logger.error("Gemini API failed: %s. Attempting fallback to Groq...", e)
                if self._groq_api_key:
                    return self._call_groq(system_prompt, history, user_message)
                raise e
        elif self._llm_provider == "groq" and self._groq_api_key:
            try:
                return self._call_groq(system_prompt, history, user_message)
            except Exception as e:
                logger.error("Groq API failed: %s. Attempting fallback to Gemini...", e)
                if self._gemini_api_key:
                    return self._call_gemini(system_prompt, history, user_message)
                raise e
        elif self._llm_provider == "ollama":
            return self._call_ollama(system_prompt, history, user_message)
        else:
            logger.warning(
                "No LLM provider configured (LLM_PROVIDER=%s). Using mock response.",
                self._llm_provider,
            )
            return self._mock_response(user_message, history)

    def _stream_llm(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
    ) -> Generator[str, None, None]:
        """Route streaming to configured LLM provider."""
        if self._llm_provider == "gemini" and self._gemini_api_key:
            try:
                yield from self._stream_gemini(system_prompt, history, user_message)
                return
            except Exception as e:
                logger.error("Gemini stream failed: %s. Attempting fallback to Groq...", e)
                if self._groq_api_key:
                    yield from self._stream_groq(system_prompt, history, user_message)
                    return
                raise e
        elif self._llm_provider == "groq" and self._groq_api_key:
            try:
                yield from self._stream_groq(system_prompt, history, user_message)
                return
            except Exception as e:
                logger.error("Groq stream failed: %s. Attempting fallback to Gemini...", e)
                if self._gemini_api_key:
                    yield from self._stream_gemini(system_prompt, history, user_message)
                    return
                raise e
        elif self._llm_provider == "ollama":
            yield from self._stream_ollama(system_prompt, history, user_message)
        else:
            logger.warning(
                "No LLM provider configured (LLM_PROVIDER=%s). Using mock streaming.",
                self._llm_provider,
            )
            yield from self._stream_mock(user_message, history)

    def _call_groq(self, system_prompt: str, history: list[dict], user_message: str) -> str:
        """Call Groq API with Llama 3.3 70B — optimized for low latency conversational turns."""
        from groq import Groq  # lazy import

        client = Groq(api_key=self._groq_api_key)
        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[:-1]:  # exclude last (current) user message — already in history
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        model = os.getenv("GROQ_MODEL", GROQ_DEFAULT_MODEL)
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=600,
            temperature=0.7,
        )
        return completion.choices[0].message.content

    def _stream_groq(
        self, system_prompt: str, history: list[dict], user_message: str
    ) -> Generator[str, None, None]:
        """Stream response tokens from Groq API."""
        from groq import Groq  # lazy import

        client = Groq(api_key=self._groq_api_key)
        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[:-1]:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        model = os.getenv("GROQ_MODEL", GROQ_DEFAULT_MODEL)
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=600,
            temperature=0.7,
            stream=True,
        )
        for chunk in stream:
            content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
            if content:
                yield content

    def _call_gemini(self, system_prompt: str, history: list[dict], user_message: str) -> str:
        """Call Gemini API — preferred for document-heavy sessions."""
        import google.generativeai as genai  # lazy import

        genai.configure(api_key=self._gemini_api_key)
        model_name = os.getenv("GEMINI_MODEL", GEMINI_DEFAULT_MODEL)
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt,
        )

        # Convert history to Gemini format
        chat_history = []
        for turn in history[:-1]:
            role = "user" if turn["role"] == "user" else "model"
            chat_history.append({"role": role, "parts": [turn["content"]]})

        chat = model.start_chat(history=chat_history)
        response = chat.send_message(user_message)
        return response.text

    def _stream_gemini(
        self, system_prompt: str, history: list[dict], user_message: str
    ) -> Generator[str, None, None]:
        """Stream response tokens from Gemini API."""
        import google.generativeai as genai  # lazy import

        genai.configure(api_key=self._gemini_api_key)
        model_name = os.getenv("GEMINI_MODEL", GEMINI_DEFAULT_MODEL)
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt,
        )

        chat_history = []
        for turn in history[:-1]:
            role = "user" if turn["role"] == "user" else "model"
            chat_history.append({"role": role, "parts": [turn["content"]]})

        chat = model.start_chat(history=chat_history)
        response = chat.send_message(user_message, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text

    def _call_ollama(self, system_prompt: str, history: list[dict], user_message: str) -> str:
        """Call local Ollama instance — fully offline, zero cost, privacy-preserving."""
        import httpx  # lazy import

        ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[:-1]:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        response = httpx.post(
            f"{ollama_url}/api/chat",
            json={"model": ollama_model, "messages": messages, "stream": False},
            timeout=60.0,
        )
        response.raise_for_status()
        return response.json()["message"]["content"]

    def _stream_ollama(
        self, system_prompt: str, history: list[dict], user_message: str
    ) -> Generator[str, None, None]:
        """Stream tokens from local Ollama instance."""
        import httpx  # lazy import

        ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[:-1]:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        with httpx.stream(
            "POST",
            f"{ollama_url}/api/chat",
            json={"model": ollama_model, "messages": messages, "stream": True},
            timeout=60.0,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            yield chunk
                    except json.JSONDecodeError:
                        continue

    def _mock_response(self, user_message: str, history: list[dict]) -> str:
        """Deterministic mock response for testing without an API key."""
        turn_count = len(history)
        return (
            f"I hear you, and this is turn {turn_count} of our conversation. "
            f"You asked about: '{user_message[:80]}'. "
            "To get real AI responses, add your GROQ_API_KEY to the .env file. "
            "I'm here and ready to guide your research journey!"
        )

    def _stream_mock(
        self, user_message: str, history: list[dict]
    ) -> Generator[str, None, None]:
        """Deterministic token-by-token mock stream for testing."""
        response = self._mock_response(user_message, history)
        tokens = response.split(" ")
        for i, word in enumerate(tokens):
            yield word + (" " if i < len(tokens) - 1 else "")
