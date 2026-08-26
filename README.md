# FinTrack — Personal Expense Tracker

FinTrack is a personal finance web application that lets a user log daily expenses, organize them into self-created categories, and instantly see the impact on totals, charts, and a live budget goal.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, Recharts, React Router v6, Zustand, React Hook Form + Zod, Axios.
- **Backend:** FastAPI (Python 3.11+ / 3.13), Uvicorn, SQLAlchemy 2.0 (Async), Alembic, Pydantic v2 schemas.
- **Database:** PostgreSQL (local PostgreSQL during development or hosted in production).
- **Deployment:** Render (Backend Web Service), Vercel (Frontend SPA), PostgreSQL Database.

## Architecture & Conventions

- **Zero Mock / Dummy Data:** All screens render from actual database queries. No demo expenses or fake charts.
- **Strict Separation of Concerns:** React communicates exclusively with FastAPI via `/api/v1`. React never directly connects to PostgreSQL.
- **Styling:** Utility-first Tailwind CSS without inline styles.
- **Security:** `.env` files are strictly excluded from version control. Configuration is loaded via environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`), with the backend dynamically assembling the async database connection string.

## Project Structure

```text
FinTrack/
├── backend/                  # FastAPI backend service
│   ├── app/                  # Application code (api, core, db, models, schemas, services)
│   ├── tests/                # Pytest test suite
│   ├── Dockerfile            # Container definition
│   ├── requirements.txt      # Python dependencies
│   ├── alembic.ini           # Migration configuration
│   └── .env.example          # Environment template
├── frontend/                 # React 18 + Vite frontend
│   ├── src/                  # Application source (components, pages, store, api, schemas)
│   ├── Dockerfile            # Multi-stage container definition with Nginx SPA routing
│   ├── package.json          # Node dependencies
│   ├── vite.config.js        # Vite build configuration
│   ├── tailwind.config.js    # Tailwind configuration
│   └── .env.example          # Frontend environment template
├── DOCS/                     # PRD and SRS specifications
├── docker-compose.yml        # Local container orchestration
├── AGENTS.md                 # Agent guidelines & golden rules
└── PROGRESS.md               # Phase milestone tracking
```

## Quick Start (Development)

### Backend
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
