"""
Voice WebSocket Router — Real-time voice session endpoint.

This router handles:
  1. WebSocket connections for voice sessions (/api/voice/ws/{session_id})
  2. REST endpoint to synthesize TTS from text (/api/voice/tts)

WebSocket protocol (JSON messages):
  Client → Server:
    { "type": "start_call", "language": "English" }
    { "type": "transcript", "text": "...", "level": "btech", "language": "English" }
    { "type": "ping" }

  Server → Client:
    { "type": "thinking" }              ← AI is processing
    { "type": "response", "text": "..." } ← AI text response
    { "type": "audio", "data": "<base64 mp3>" } ← TTS audio
    { "type": "error", "message": "..." }
    { "type": "pong" }
"""

import base64
import json
import logging
import os
import sys

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

# Allow importing from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

from ai.agents.mentor_agent import MentorAgent
from ai.memory.mock_memory import MockMemoryService
from ai.voice.edge_tts_service import EdgeTTSService
from ai.voice.tts_interface import TTSException

logger = logging.getLogger(__name__)
router = APIRouter()

# Shared services — in production these would be injected via DI container
_memory_service = MockMemoryService()
_mentor_agent = MentorAgent(memory_service=_memory_service)
_tts_service = EdgeTTSService(default_voice="default")


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "default"
    language: str = "en"


@router.websocket("/ws/{session_id}")
async def voice_websocket(websocket: WebSocket, session_id: str):
    """
    Real-time voice session WebSocket endpoint.

    Accepts transcribed text from the browser's Web Speech API,
    runs it through the MentorAgent, synthesizes TTS, and returns
    both the text response and base64-encoded MP3 audio.

    Latency target: <1.5s from transcript received → first audio byte sent.
    """
    await websocket.accept()
    logger.info("Voice WebSocket opened: session=%s", session_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON in WebSocket message."
                }))
                continue

            msg_type = message.get("type")

            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            if msg_type == "start_call":
                # Triggered when user presses "Call Mentor" — send an initial greeting
                language = message.get("language", "English")
                greeting = (
                    "Hello! I am Vaani, your AI research mentor. "
                    "I'm here to help with your studies and research journey. "
                    "Can I know what your doubt or queries are about?"
                )
                _memory_service.add_message(session_id, "assistant", greeting)
                await websocket.send_text(json.dumps({
                    "type": "response",
                    "text": greeting,
                }))
                try:
                    audio_bytes = await _tts_service.synthesize(
                        text=greeting,
                        language=language[:2].lower(),
                        voice_id="default",
                    )
                    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                    await websocket.send_text(json.dumps({
                        "type": "audio",
                        "data": audio_b64,
                        "mime_type": "audio/mpeg",
                    }))
                except TTSException as tts_err:
                    logger.warning("TTS failed for greeting: %s", tts_err)
                continue

            if msg_type == "transcript":
                transcript = message.get("text", "").strip()
                logger.info("WebSocket received transcript: %s", transcript)
                level = message.get("level", "btech")
                language = message.get("language", "English")

                if not transcript:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Empty transcript received."
                    }))
                    continue

                # Signal to frontend that we're processing
                await websocket.send_text(json.dumps({"type": "thinking"}))

                # Generate AI response
                response_text = _mentor_agent.generate_response(
                    session_id=session_id,
                    user_message=transcript,
                    level=level,
                    language=language,
                )

                # Send text response immediately (for transcript panel)
                await websocket.send_text(json.dumps({
                    "type": "response",
                    "text": response_text,
                }))

                # Synthesize TTS and send audio
                try:
                    audio_bytes = await _tts_service.synthesize(
                        text=response_text,
                        language=language[:2].lower(),
                        voice_id="default",
                    )
                    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                    await websocket.send_text(json.dumps({
                        "type": "audio",
                        "data": audio_b64,
                        "mime_type": "audio/mpeg",
                    }))
                except TTSException as tts_err:
                    logger.warning("TTS failed, sending text-only response: %s", tts_err)
                    # Don't crash the session — text response was already sent above

    except WebSocketDisconnect:
        logger.info("Voice WebSocket closed: session=%s", session_id)
    except Exception as exc:
        logger.error("Unexpected error in voice WebSocket session=%s: %s", session_id, exc)
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "An internal error occurred. Please try again."
            }))
        except Exception:
            pass


@router.post("/tts")
async def synthesize_tts(request: TTSRequest):
    """
    REST endpoint to synthesize TTS for a given text.
    Returns raw MP3 audio bytes with appropriate content-type header.

    Use case: synthesize AI responses that arrived via the text chat API
    without going through the WebSocket path.
    """
    try:
        audio_bytes = await _tts_service.synthesize(
            text=request.text,
            language=request.language,
            voice_id=request.voice_id,
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except TTSException as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/voices")
async def list_voices():
    """List available TTS voices."""
    return {"voices": _tts_service.get_available_voices()}
