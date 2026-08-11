# ResearchMind AI — Vaani 

**Your AI Research Mentor. Like a phone call with a professor.**

Vaani is a voice-first AI mentor built for B.Tech, M.Tech, and PhD students navigating their research and study journey. Talk to it like a phone call — no typing required.


## DevOps & CI/CD Architecture

**Vaani** incorporates an automated continuous integration and continuous deployment (CI/CD) pipeline powered by **Jenkins**, **Docker**, **Kubernetes (Kind)**, and **GitHub Webhooks**. Every code push automatically builds, tests, package-checks, and deploys updated frontend and backend services to a local Kubernetes cluster.

---

### Tech Stack & Tools

* **CI/CD Engine:** Jenkins (Declarative Pipeline)

* **Trigger Mechanism:** GitHub Webhooks exposed locally via `ngrok` HTTPS tunnel

* **Containerization:** Docker (Multi-service build: FastAPI API & Next.js Web App)

* **Orchestration:** Kubernetes via `kind` (*Kubernetes in Docker*) cluster

* **Secret Management:** Jenkins Encrypted Credentials Manager (`groq-api-key`)

---

###  CI/CD Pipeline Workflow

When code is pushed to `main`, GitHub notifies the local Jenkins instance via an `ngrok` reverse proxy webhook, executing the following 5-stage automated pipeline:


---

##  Features

-  **Phone Call Mode** — Hands-free, continuous voice conversation with your AI mentor
-  **Level-Calibrated Responses** — Tailored explanations for B.Tech, M.Tech, and PhD levels
-  **Neural Text-to-Speech** — High-quality Microsoft Edge neural voices (free, no API key needed)
-  **Smart Silence Detection** — Automatically detects when you stop speaking and responds
-  **Duplex Interruption** — Interrupt the AI mid-sentence just like a real phone call
-  **Document Mode** — Upload research papers and discuss them via text chat
-  **Multi-language** — English, Hindi, Telugu support

---

##  Quick Setup (New Laptop)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/researchmind-ai.git
cd researchmind-ai
```

### 2. Set up environment variables
```bash
copy .env.example .env
```
Edit `.env` and add your Groq API key:
```
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
```
Get a free Groq key at: https://console.groq.com

### 3. Install backend dependencies
```bash
cd apps/api
pip install -r requirements.txt
```

### 4. Install frontend dependencies
```bash
cd apps/web
npm install
```

### 5. Start both servers

**Terminal 1 — Backend:**
```bash
cd apps/api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd apps/web
npm run dev
```

### 6. Open the app
Go to http://localhost:3000 in Chrome or Edge (required for Web Speech API).

---

##  Project Structure

```
researchmind-ai/
├── ai/                          # AI core logic (LLMs, memory, speech synthesis)
│   ├── agents/
│   │   └── mentor_agent.py      # Core AI mentor orchestrator & Groq integration
│   ├── memory/
│   │   └── mock_memory.py       # In-memory session & conversation history state
│   ├── voice/
│   │   ├── tts_interface.py     # Abstract base contract for TTS services
│   │   └── edge_tts_service.py  # Microsoft Edge Neural TTS service implementation
│   └── prompts/                 # Level-calibrated system prompts (B.Tech, M.Tech, PhD)
├── apps/
│   ├── api/                     # FastAPI backend application
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   └── config.py    # Environment settings & credentials loader
│   │   │   ├── routers/
│   │   │   │   ├── chat.py      # REST endpoints for text chat
│   │   │   │   └── voice.py     # WebSocket endpoints & TTS audio streaming
│   │   │   └── main.py          # FastAPI application entry point
│   │   ├── tests/               # Pytest automated test suite
│   │   │   └── test_api.py
│   │   └── requirements.txt     # Python runtime dependencies
│   └── web/                     # Next.js frontend web app
│       ├── src/
│       │   ├── components/
│       │   │   ├── chat/
│       │   │   │   └── ChatInterface.tsx # Primary chat dashboard UI
│       │   │   └── voice/
│       │   │       └── VoiceOrb.tsx      # Animated interactive voice orb component
│       │   └── hooks/
│       │       └── useVoice.ts  # WebSockets voice recording & audio streaming hook
│       ├── package.json         # Node.js dependencies & scripts
│       └── package-lock.json
├── docker/                      # Containerization configurations
│   ├── Dockerfile.backend       # Multi-stage Dockerfile for FastAPI
│   └── Dockerfile.frontend      # Multi-stage Dockerfile for Next.js
├── k8s/                         # Kubernetes deployment manifests
│   ├── backend.yaml             # Deployment & Service specs for backend API
│   └── frontend.yaml            # Deployment & Service specs for Next.js web app
├── .env.example                 # Template for required environment variables
├── .gitignore                   # Git ignore patterns
├── Jenkinsfile                  # Declarative CI/CD pipeline configuration
└── README.md                    # Project documentation & DevOps overview
```

---

##  API Keys Required

| Service | Required | Where to Get |
|---------|----------|--------------|
| Groq (LLaMA 3.3 70B) |  Yes (for real AI) | https://console.groq.com |
| Gemini | Optional | https://aistudio.google.com |
| ElevenLabs | Optional | https://elevenlabs.io |
| Edge TTS (voice) | None needed | Built-in, completely free |

---

##  Test Without API Keys

Set `LLM_PROVIDER=mock` in `.env` to use a mock AI that echoes responses — useful for testing the voice pipeline without any API key.

---

## How to Use Call Mode

1. Open http://localhost:3000 in **Chrome or Edge** (required)
2. Click **"Call Mentor"** — allow microphone access when prompted
3. The AI will greet you with "Hello! I'm Vaani, your AI research mentor..."
4. Ask your doubt naturally — the AI listens continuously
5. After you stop speaking for ~3 seconds, it thinks and responds with voice
6. Interrupt it mid-sentence by speaking — just like a real phone call
7. Click **"End Call"** (red button) to hang up

---

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Web Speech API, Web Audio API
- **Backend:** FastAPI, Python 3.11, WebSockets
- **AI:** Groq (LLaMA 3.3 70B) / Gemini / Ollama
- **TTS:** Microsoft Edge Neural TTS (edge-tts, free)
- **Memory:** In-memory session store (SQLite/Redis planned for production)
