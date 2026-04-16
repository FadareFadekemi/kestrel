<<<<<<< HEAD
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
<div align="center">

# ⚡ Kestrel

**AI-powered B2B sales development platform**

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

Enter a company name or URL. Kestrel researches it, scores it, writes a personalised cold email, and sends it — automatically.

</div>

---

## What it does

Kestrel runs a **four-agent pipeline** on any company you point it at:

| Agent | What it does |
|---|---|
| Research | Pulls company intelligence — funding, tech stack, growth signals, recent news |
| Profiling | Scores the lead across tech fit, timing, size, and growth indicators |
| Email Writer | Writes a personalised cold email in your tone using your sender profile |
| Tracker | Logs the lead to the CRM with score, status, and email history |

---

## Features

- **Four-agent pipeline** — fully automated from research to draft
- **Email sending** — Hunter.io finds the contact email, SendGrid delivers it
- **A/B variants** — generate two email angles and pick the better one
- **Follow-up sequences** — 3-touch follow-up built automatically from the first email
- **Leads CRM** — track status, engagement, pain points, and tech stack per lead
- **Batch mode** — upload a CSV and run the pipeline on multiple companies at once
- **Sender profile** — configure your product once, every email pitches it correctly
- **JWT authentication** — secure signup, login, and protected routes

---

## Tech Stack

**Frontend**
- React + Vite
- Recharts (dashboard charts)
- Lucide React (icons)

**Backend**
- FastAPI (Python)
- SQLAlchemy 2.0
- Supabase (PostgreSQL)
- slowapi (rate limiting)

**AI & APIs**
- OpenAI GPT-4o (profiling + email generation)
- Tavily (company research)
- Exa (technographic enrichment)
- Hunter.io (contact email lookup)
- SendGrid (email delivery)

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+

### 1. Clone the repo

```bash
git clone https://github.com/FadareFadekemi/Kestrel.git
cd Kestrel
2. Install frontend dependencies

npm install
3. Set up Python environment

python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
4. Create a .env file in the project root

VITE_OPENAI_API_KEY=sk-...
VITE_TAVILY_API_KEY=tvly-...
VITE_EXA_API_KEY=...
HUNTER_API_KEY=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=you@yourdomain.com
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your-secret-key
Generate a JWT secret key:


python -c "import secrets; print(secrets.token_hex(32))"
5. Run the database migration

cd backend
python migrate.py
6. Start the backend

cd backend
uvicorn main:app --reload --port 8000
7. Start the frontend

npm run dev
Open http://localhost:5173

Deployment
Designed to run on Render + Supabase.

<details> <summary>Render setup</summary>
Backend — Web Service

Build command: pip install -r requirements.txt
Start command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
Frontend — Static Site

Build command: npm run build
Publish directory: dist
Add all .env variables in the Render dashboard under Environment.

</details>
Project Structure

kestrel-app/
├── backend/
│   ├── main.py               # FastAPI app, all routes
│   ├── models.py             # SQLAlchemy models
│   ├── crud.py               # Database operations
│   ├── auth.py               # JWT + bcrypt
│   ├── database.py           # SQLite (dev) / PostgreSQL (prod)
│   ├── migrate.py            # Schema migration script
│   └── services/
│       ├── research.py       # Tavily + Exa + Hunter.io
│       ├── profiling.py      # GPT-4o lead profiling
│       ├── email_writer.py   # GPT-4o email generation
│       └── email_sender.py   # SendGrid integration
├── src/
│   ├── pages/                # Dashboard, Agent, Leads, Sequences, Batch, Settings
│   ├── components/           # UI components
│   └── services/             # API clients
├── requirements.txt
└── vite.config.js
API Keys
Service	Purpose	Free Tier
OpenAI	Email and profile generation	Pay per use
Tavily	Company research	1,000 searches/month
Exa	Technographic enrichment	1,000 searches/month
Hunter.io	Contact email lookup	25 searches/month
SendGrid	Email delivery	100 emails/day
License
MIT


>>>>>>> f23f55c245ee819a0ef30cac4db3b62dd5be465c
