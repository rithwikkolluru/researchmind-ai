"""
TTS Interface — Abstract contract for Text-to-Speech providers.

Single Responsibility: Define the interface that all TTS adapters must implement.
Inputs: text string + optional language/voice hints
Outputs: audio bytes (MP3/WAV)
Failure fallback: raise TTSException with a descriptive message

Swap path: replace MockTTSService with:
  - EdgeTTSService (free, high quality, Microsoft neural voices) — primary
  - PiperTTSService (fully local, ONNX-based, zero network) — offline fallback
  - ElevenLabsTTSService (paid, highest quality) — demo/premium path
"""

from abc import ABC, abstractmethod


class TTSException(Exception):
    """Raised when text-to-speech synthesis fails."""
    pass


class TTSInterface(ABC):
    @abstractmethod
    async def synthesize(self, text: str, language: str = "en", voice_id: str = "default") -> bytes:
        """
        Convert text to audio bytes.

        Args:
            text: The text to synthesize.
            language: BCP-47 language code (e.g. 'en', 'hi').
            voice_id: Provider-specific voice identifier.

        Returns:
            Raw audio bytes (MP3 format preferred for browser compatibility).

        Raises:
            TTSException: If synthesis fails unrecoverably.
        """
        pass

    @abstractmethod
    def get_available_voices(self) -> list[dict]:
        """Return list of available voice dicts with keys: id, name, language, gender."""
        pass
