"""
BrowserSTTService — Development STT stub for server-side use.

For the voice pipeline, STT is handled client-side via the browser's
Web Speech API (SpeechRecognition) to avoid any latency from audio
upload. The transcribed text is sent over WebSocket as a string.

This stub exists to represent the server-side STT slot in the architecture.
It can be replaced with FasterWhisperSTTService when the server needs to
process raw audio (e.g., for mobile apps that can't use Web Speech API).

TODO(scale): Replace with FasterWhisperSTTService for:
  - Mobile app support (no Web Speech API)
  - Hindi/Telugu code-mixed speech (browser STT is weak here)
  - Server-side VAD and chunking pipeline
  See docs/tech-debt.md #STT-001
"""

import logging
from .stt_interface import STTInterface, STTException

logger = logging.getLogger(__name__)


class BrowserSTTService(STTInterface):
    """
    Stub STT service for architectures where the browser handles transcription.

    The browser's Web Speech API sends text directly via WebSocket,
    so this service simply echoes the pre-transcribed text through
    the standard interface — preserving the swap-ready architecture.
    """

    def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        # Browser-side STT: audio_bytes is actually a UTF-8 encoded transcript string.
        # This is a stopgap for the current browser-STT architecture.
        # TODO(scale): STT-001 — replace with FasterWhisperSTTService for raw audio input.
        try:
            return audio_bytes.decode("utf-8").strip()
        except Exception as exc:
            raise STTException(f"Failed to decode transcript: {exc}") from exc
