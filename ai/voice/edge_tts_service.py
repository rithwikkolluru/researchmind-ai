"""
EdgeTTSService — Free, high-quality TTS using Microsoft Edge neural voices.

Uses the `edge-tts` Python library which wraps the same neural TTS engine
used by Microsoft Edge browser — no API key required, completely free.

Voice quality is significantly better than pyttsx3/gTTS and approaches
ElevenLabs quality for many use cases.

TODO(scale): If we ever need custom voice cloning or ultra-low-latency
  streaming TTS at scale, swap this for ElevenLabsTTSService.
  See docs/tech-debt.md for details.
"""

import asyncio
import io
import logging

from .tts_interface import TTSInterface, TTSException

logger = logging.getLogger(__name__)


# Map of friendly voice names to edge-tts voice IDs
# Prioritizing clear, academic-sounding voices suitable for long study sessions
VOICE_MAP = {
    "default": "en-US-JennyNeural",          # Warm, clear female voice
    "professional": "en-US-GuyNeural",        # Professional male voice
    "indian-female": "en-IN-NeerjaNeural",    # Indian English female
    "indian-male": "en-IN-PrabhatNeural",     # Indian English male
    "british": "en-GB-SoniaNeural",           # British English female
}


class EdgeTTSService(TTSInterface):
    """
    Production-grade TTS using Microsoft Edge neural voices (free, no API key).

    Inputs: text string + optional language/voice hints
    Outputs: MP3 audio bytes ready for browser playback
    Failure fallback: raises TTSException with original error wrapped
    """

    def __init__(self, default_voice: str = "default"):
        self._default_voice = VOICE_MAP.get(default_voice, VOICE_MAP["default"])

    def synthesize(self, text: str, language: str = "en", voice_id: str = "default") -> bytes:
        """Synthesize text to MP3 bytes using edge-tts neural voices."""
        try:
            import edge_tts  # lazy import so the app starts even if edge-tts isn't installed
        except ImportError:
            raise TTSException(
                "edge-tts is not installed. Run: pip install edge-tts"
            )

        if not text or not text.strip():
            raise TTSException("Cannot synthesize empty text.")

        voice = VOICE_MAP.get(voice_id, self._default_voice)

        # edge-tts is async-native; run it in a fresh event loop
        try:
            audio_bytes = asyncio.run(self._synthesize_async(text, voice))
            return audio_bytes
        except Exception as exc:
            logger.error("EdgeTTS synthesis failed: %s", exc)
            raise TTSException(f"EdgeTTS synthesis failed: {exc}") from exc

    async def _synthesize_async(self, text: str, voice: str) -> bytes:
        import edge_tts
        buffer = io.BytesIO()
        communicate = edge_tts.Communicate(text, voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])
        return buffer.getvalue()

    def get_available_voices(self) -> list[dict]:
        return [
            {"id": k, "name": v, "language": "en", "gender": "varies"}
            for k, v in VOICE_MAP.items()
        ]
