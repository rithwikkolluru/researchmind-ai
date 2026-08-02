from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import create_db
from app.routers import health, chat, voice


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_db()


app.include_router(
    health.router,
    prefix="/health",
    tags=["Health"]
)

app.include_router(
    chat.router,
    prefix="/api/chat",
    tags=["Chat"]
)

app.include_router(
    voice.router,
    prefix="/api/voice",
    tags=["Voice"]
)


@app.get("/")
def root():
    return {
        "message": "Welcome to ResearchMind AI"
    }