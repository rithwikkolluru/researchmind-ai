# ResearchMind AI — Vaani 🎓

**Your AI Research Mentor. Like a phone call with a professor.**

Vaani is a voice-first AI mentor built for B.Tech, M.Tech, and PhD students navigating their research and study journey. Talk to it like a phone call, explore advanced research discussion modes, or generate perfectly tailored professional emails.

---

## ✨ Key Features

### 🎙️ Core Mentor
- 📞 **Phone Call Mode** — Hands-free, continuous voice conversation with your AI mentor (Interruptible just like a real human!)
- 🧠 **Level-Calibrated Themes** — Tailored UI and AI behavior for **B.Tech (Cyan)**, **M.Tech (Indigo)**, and **PhD (Emerald)** levels
- 🗣️ **Neural Text-to-Speech** — High-quality Microsoft Edge neural voices (free, no API key needed)
- 📄 **Split-Screen Document Mode** — Upload research papers (PDF) and discuss them side-by-side with the AI
- 🌐 **Multi-language** — English, Hindi, Telugu support

### 🚀 Advanced Mentor Modes
- 🎓 **Teach Mode** — Instead of just giving answers, the AI checks your understanding step-by-step
- 🧪 **Paper Discussion Room** — Socratic discussions where the AI asks *you* to critique the research
- 🗺️ **Research Roadmap** — Generates step-by-step learning paths for massive goals (e.g. "I want to build AGI")
- ⚔️ **Debate Mode** — The AI rigorously debates your ideas to sharpen your thinking
- 📊 **Research Quality Tracker** — Evaluates your research depth every 3 messages (M.Tech / PhD)

### ✉️ AI Communication Mentor
- 🤖 **Smart Email Generator** — A dedicated UI to craft professional emails
- 🎯 **Context-Aware** — Choose recipients (Professor, Recruiter, HR), purpose, tone, and outcome
- 💡 **Why it Works** — The AI doesn't just generate the email; it explains *why* the psychological and structural choices were made

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Zustand, Web Speech API
- **Backend:** FastAPI, Python 3.11, WebSockets
- **AI Core:** Groq (LLaMA 3.3 70B), Gemini 2.5 Flash, Ollama (Local)
- **DevOps:** Docker, Docker Compose, Kubernetes, Jenkins CI/CD

---

## 🚀 How to Run (New Laptop Setup)

You have multiple options to run ResearchMind AI locally. First, clone the repository and set up your `.env` file.

### 1. Initial Setup
```bash
# Clone the repository
git clone https://github.com/rithwikkolluru/researchmind-ai.git
cd researchmind-ai

# Set up environment variables
cp .env.example .env
```
Edit `.env` and add your LLM API keys:
```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Option A: The Easy Way (Docker Compose) Recommended!
Run the entire stack (Frontend + Backend) with a single command.
*Requires Docker Desktop.*
```bash
docker-compose up --build -d
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`

To stop: `docker-compose down`

### Option B: The Enterprise Way (Kubernetes)
Run a scalable, self-healing local cluster.
*Requires Kubernetes enabled in Docker Desktop.*
```bash
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```
Check status using `kubectl get pods` and `kubectl get services`.

### Option C: The Manual Way (Bare-Metal)
If you prefer running the servers manually without Docker.
*Requires Python 3.11+ and Node.js 18+.*

**Terminal 1 — Backend:**
```bash
cd apps/api
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd apps/web
npm install
npm run dev
```

---

## 🏗️ Project Structure

```
researchmind-ai/
├── ai/                          # AI layer (LLM logic, Prompts, Memory, TTS)
├── apps/
│   ├── api/                     # FastAPI backend (WebSockets, REST routers)
│   └── web/                     # Next.js frontend (Chat UI, Email UI, Hooks)
├── docker/                      # Dockerfiles for frontend and backend
├── k8s/                         # Kubernetes deployment manifests
├── docker-compose.yml           # Local multi-container orchestration
└── Jenkinsfile                  # Automated CI/CD pipeline
```

---

## 📞 How to Use Phone Call Mode

1. Open http://localhost:3000 in **Chrome or Edge** (required for Web Speech API)
2. Click the **Call Mentor (Phone icon)** — allow microphone access
3. The AI will greet you. Ask your doubt naturally — the AI listens continuously.
4. After you stop speaking for ~3 seconds, it thinks and responds with voice.
5. **Interrupt it** mid-sentence by speaking — just like a real phone call!
6. Click **End Call** to hang up.

---
*Built for the future of academic research.*
