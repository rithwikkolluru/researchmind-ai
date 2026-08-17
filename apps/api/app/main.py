from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import create_db
from app.routers import health, chat, voice, fun, communicate

# Build CORS origins — always allow localhost, plus any origins set in env
_extra_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
]
if _extra_origins:
    ALLOWED_ORIGINS += [o.strip() for o in _extra_origins.split(",") if o.strip()]

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

app.include_router(
    fun.router,
    prefix="/api/fun",
    tags=["Fun Zone"]
)

app.include_router(
    communicate.router,
    prefix="/api/communicate",
    tags=["Communicate"]
)


@app.get("/")
def root():
    return {
        "message": "Welcome to ResearchMind AI"
    }