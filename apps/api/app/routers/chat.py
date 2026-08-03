import io
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import process_chat_message, memory_service
import logging
import PyPDF2

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        response = process_chat_message(
            session_id=request.session_id,
            message=request.message,
            language=request.language,
            level=request.level,
        )
        return response
    except Exception as e:
        logger.error(f"Error processing chat: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/upload")
async def upload_document(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        text = ""
        
        if file.filename.endswith(".pdf"):
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                # Limit to first ~10 pages to avoid context bloat
                num_pages = min(len(pdf_reader.pages), 10)
                for page_num in range(num_pages):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
            except Exception as e:
                logger.error(f"Error reading PDF: {e}")
                raise HTTPException(status_code=400, detail="Could not read PDF file.")
        elif file.filename.endswith(".txt"):
            text = content.decode("utf-8")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or TXT.")

        if not text.strip():
             raise HTTPException(status_code=400, detail="Document appears to be empty or unreadable.")

        # Limit text length to ~20,000 characters to prevent overwhelming the LLM
        if len(text) > 20000:
            text = text[:20000] + "\n...[Content truncated due to length limits]"

        # Inject into memory as a system/context message
        context_msg = f"[Document Uploaded: {file.filename}]\n\n{text}"
        memory_service.add_message(session_id, "user", context_msg)
        
        # Add a mock assistant response acknowledging the document
        ack_msg = f"I have received and read the document '{file.filename}'. What would you like to know about it?"
        memory_service.add_message(session_id, "assistant", ack_msg)

        return {"status": "success", "message": "Document processed and added to context.", "filename": file.filename}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
