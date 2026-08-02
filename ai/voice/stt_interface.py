"""
STT Interface — Abstract contract for Speech-to-Text providers.

Single Responsibility: Define the interface that all STT adapters must implement.
Inputs: raw audio bytes + optional language hint
Outputs: transcribed text string
Failure fallback: raise STTException with a descriptive message

Swap path: replace MockSTTService with:
  - FasterWhisperSTTService (local, zero cost) for dev/self-hosted
  - GroqWhisperSTTService (cloud, free tier) for deployed environments
"""

from abc import ABC, abstractmethod


class STTException(Exception):
    """Raised when speech-to-text transcription fails."""
    pass


class STTInterface(ABC):
    @abstractmethod
    def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        """
        Transcribe audio bytes to text.

        Args:
            audio_bytes: Raw audio data (WAV/WebM/OGG format expected).
            language: BCP-47 language code hint (e.g. 'en', 'hi', 'te').

        Returns:
            Transcribed text string (may be empty if silence detected).

        Raises:
            STTException: If transcription fails unrecoverably.
        """
        pass
