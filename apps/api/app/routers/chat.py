import io
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
import PyPDF2

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    SessionSummary,
    ChatMessageOut,
    DocumentUploadResponse,
)
from app.services.chat_service import (
    process_chat_message,
    stream_chat_message,
    memory_service,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Maximum file upload limit: 10MB
MAX_UPLOAD_SIZE = 10 * 1024 * 1024


def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """
    Split long document text into overlapping chunks (~500-1000 tokens).
    """
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: List[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]

        if end < text_len:
            # Try to break on paragraph or sentence boundary
            last_break = max(chunk.rfind("\n\n"), chunk.rfind("\n"), chunk.rfind(". "), chunk.rfind(" "))
            if last_break > chunk_size // 2:
                chunk = chunk[:last_break]
                start += last_break + 1
            else:
                start += chunk_size - overlap
        else:
            start = end

        cleaned = chunk.strip()
        if cleaned:
            chunks.append(cleaned)

    return chunks


# ── Chat Endpoints ────────────────────────────────────────────────────────────

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Standard synchronous chat endpoint.
    Processes user message and returns mentor response + updated history.
    """
    try:
        response = process_chat_message(
            session_id=request.session_id,
            message=request.message,
            language=request.language,
            level=request.level,
            mode=request.mode,
            enable_quality_tracker=request.enable_quality_tracker,
        )
        return response
    except Exception as e:
        logger.error("Error processing chat: %s", e)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    Server-Sent Events (SSE) streaming chat endpoint.
    Streams response tokens to the frontend in real time.
    """
    def event_generator():
        try:
            for token in stream_chat_message(
                session_id=request.session_id,
                message=request.message,
                language=request.language,
                level=request.level,
                mode=request.mode,
                enable_quality_tracker=request.enable_quality_tracker,
            ):
                payload = json.dumps({"token": token, "done": False})
                yield f"data: {payload}\n\n"
            yield f"data: {json.dumps({'done': True, 'session_id': request.session_id})}\n\n"
        except Exception as exc:
            logger.error("Error in chat stream: %s", exc)
            err_payload = json.dumps({"error": str(exc), "done": True})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Session & History Endpoints ───────────────────────────────────────────────

@router.get("/sessions", response_model=List[SessionSummary])
async def list_sessions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Fetch list of past chat sessions with summary metadata.
    """
    try:
        sessions = memory_service.list_sessions(limit=limit, offset=offset)
        return sessions
    except Exception as e:
        logger.error("Error listing sessions: %s", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions.")


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def get_session_messages(session_id: str):
    """
    Fetch all chat messages for a specific session ID.
    """
    try:
        messages = memory_service.get_session_messages(session_id)
        return messages
    except Exception as e:
        logger.error("Error retrieving session messages for %s: %s", session_id, e)
        raise HTTPException(status_code=500, detail="Failed to retrieve session messages.")


@router.delete("/sessions/{session_id}")
async def clear_session_history(session_id: str):
    """
    Clear conversation history for a specific session.
    """
    try:
        memory_service.clear_history(session_id)
        return {"status": "success", "message": f"History cleared for session {session_id}"}
    except Exception as e:
        logger.error("Error clearing session history: %s", e)
        raise HTTPException(status_code=500, detail="Failed to clear session history.")


# ── Document Upload & RAG Endpoint ───────────────────────────────────────────

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload and index PDF/TXT/MD documents for RAG.
    Validates file format, enforces 10MB size limit, chunks content,
    and persists segments in the database tied to the session.
    """
    try:
        filename = file.filename or "uploaded_file"
        lower_name = filename.lower()

        # Format validation
        allowed_extensions = (".pdf", ".txt", ".md")
        if not any(lower_name.endswith(ext) for ext in allowed_extensions):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload PDF, TXT, or MD files."
            )

        # Read content and enforce size limits
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum allowed size of 10MB ({len(content) / (1024 * 1024):.1f}MB)."
            )

        text = ""
        if lower_name.endswith(".pdf"):
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                num_pages = len(pdf_reader.pages)
                for page_num in range(num_pages):
                    page = pdf_reader.pages[page_num]
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            except Exception as e:
                logger.error("Error reading PDF %s: %s", filename, e)
                raise HTTPException(status_code=400, detail="Could not read or parse PDF file.")
        else:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = content.decode("latin-1")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Document appears to be empty or unreadable.")

        # Chunk into 500-1000 token segments (~2000 chars)
        chunks = chunk_text(text, chunk_size=2000, overlap=200)
        if not chunks:
            raise HTTPException(status_code=400, detail="No readable content found to index.")

        # Persist chunks to the document table tied to the session
        num_chunks = memory_service.store_document_chunks(session_id, filename, chunks)

        # Record upload in conversation history without dumping 20k chars
        upload_notification = (
            f"[Document Uploaded: {filename} ({num_chunks} sections indexed)]"
        )
        memory_service.add_message(session_id, "user", upload_notification)

        ack_msg = (
            f"I have received and indexed the document '{filename}' into {num_chunks} searchable sections. "
            "What would you like to explore or discuss regarding it?"
        )
        memory_service.add_message(session_id, "assistant", ack_msg)

        return DocumentUploadResponse(
            status="success",
            message=f"Document processed and indexed into {num_chunks} chunks.",
            filename=filename,
            chunk_count=num_chunks,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error processing document upload: %s", e)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
