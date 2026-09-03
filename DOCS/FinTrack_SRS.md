# Software Requirements Specification (SRS)
## FinTrack — Personal Expense Tracker (V1 / MVP)

**Companion document to:** `FinTrack PRD (V1)`
**Scope of this document:** Technical/engineering specification — stack, data layer, API contract, UI/UX behavior, folder structure, environment configuration, local & containerized run/test flow, and hosting.

---

## 1. Tech Stack

### 1.1 Frontend
| Layer | Choice | Notes |
|---|---|---|
| Framework | React 18 + Vite | Fast dev server, native ESM, small prod bundle |
| Language | JavaScript (JSX) — TypeScript optional upgrade path | Keep V1 lean; types can be added Phase 2 |
| Styling | Tailwind CSS | Utility-first, pairs well with responsive breakpoints |
| Animation | Framer Motion | Page transitions, list enter/exit, modals |
| 3D | React Three Fiber + drei (optional, isolated component) | Used sparingly — e.g. an animated budget "orb"/gauge on the dashboard, lazy-loaded so it never blocks core app performance |
| Charts | Recharts | Pie/donut (category breakdown) + bar/line (spend over time) |
| Routing | React Router v6 | Dashboard / Expenses routes |
| State | Zustand (or React Context if state stays small) | Avoids Redux boilerplate for a single-user app |
| Forms & Validation | React Hook Form + Zod | Mirrors backend Pydantic validation rules |
| HTTP Client | Axios (instance with base URL + interceptors) | Central error handling |
| Testing | Vitest + React Testing Library | Component + hook tests |

### 1.2 Backend
| Layer | Choice | Notes |
|---|---|---|
| Framework | FastAPI (Python 3.11+) | Async, auto-generated OpenAPI docs |
| Server | Uvicorn (+ Gunicorn worker manager in prod) | |
| ORM | SQLAlchemy 2.0 (async) | |
| Migrations | Alembic | Versioned, reversible schema changes |
| Validation | Pydantic v2 schemas | Request/response models, single source of truth for rules |
| Config | pydantic-settings + python-dotenv | Env-driven, see Section 6 |
| Testing | Pytest + httpx.AsyncClient | Endpoint + service-layer tests |

### 1.3 Database & Hosting
| Concern | Choice |
|---|---|
| Database | PostgreSQL, hosted on **Supabase** |
| Frontend hosting | **Vercel** |
| Backend hosting | **Render** (Web Service) |
| Containerization | Docker (backend + frontend each get their own Dockerfile — Section 9) |

This combination is chosen deliberately from V1 onward so Phase 2+ features (auth, storage, realtime) can lean on Supabase's built-in services without a data-layer migration later.

### 1.4 Universal AI Engine Layer (Multi-Model Architecture)
| Concern | Architecture / Choice | Notes |
|---|---|---|
| Design Pattern | Strategy / Adapter Pattern | Standardized abstract interface `BaseLLMProvider` |
| Supported Providers | **Google Gemini** (`gemini-2.0-flash`, `gemini-1.5-pro`), **OpenAI** (`gpt-4o-mini`, `gpt-4o`), **Anthropic** (`claude-3-5-haiku`, `claude-3-5-sonnet`) | 100% environment-variable driven (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`) |
| Structured Outputs | Pydantic JSON Schemas enforced at prompt & response validation level | Guaranteed deterministic payload structure across all LLM providers |
| Multimodal Vision | Base64 / Binary Image OCR Extraction (JPEG, PNG, WEBP) | For receipt, bill, and UPI payment screenshot scanning |
| Security & Isolation | Prompt Injection Sanitization & Strict User-Level Context Scoping | AI only receives data strictly owned by the authenticated JWT user |

---

## 2. Database, Migrations, ORM, Seed Data

### 2.1 Schema (V1 + Auth & User Isolation)

```sql
-- users
users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255),
  full_name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  google_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- refresh_tokens
refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent VARCHAR(255),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- password_reset_tokens
password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- categories (user-isolated)
categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
)

-- expenses (user-isolated)
expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(50) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL CHECK (expense_date <= CURRENT_DATE),
  notes TEXT,
  payment_mode VARCHAR(20), -- 'cash' | 'card' | 'upi' | null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- budgets (user-isolated)
budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE, -- NULL = overall/monthly budget
  period_month DATE NOT NULL, -- normalized to first of month
  limit_amount NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, period_month)
)
```

Indexes: `users(email)`, `users(google_id)`, `refresh_tokens(token_hash, user_id)`, `expenses(user_id, expense_date)`, `expenses(category_id)`, `budgets(user_id, period_month)`.

### 2.2 ORM & Data Isolation
- SQLAlchemy 2.0 async models mirror the schema above.
- Strict per-user isolation: Every query for categories, expenses, budgets, and dashboard metrics is scoped to `user_id = current_user.id`.

### 2.3 Seed Data
- On user registration or initial Google Sign-In, `AuthService.seed_user_categories` creates the 8 starter categories (`Food`, `Transport`, `Rent`, `Utilities`, `Shopping`, `Health`, `Entertainment`, `Other`) owned exclusively by that user.

---

## 3. API Contract

Base URL: `/api/v1`. All responses use a consistent envelope.

### 3.1 Authentication & Authorization Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new user + auto-seed starter categories | Public (Rate Limited) |
| POST | `/auth/login` | Email/password login → returns JWT access token + HttpOnly refresh cookie | Public (Rate Limited) |
| POST | `/auth/google` | Google OAuth 2.0 / OpenID Connect login & account linking | Public |
| POST | `/auth/refresh` | Refresh token rotation → returns new access token + rotated cookie | Cookie |
| POST | `/auth/logout` | Revoke current refresh token and clear cookie | Public / Cookie |
| POST | `/auth/logout-all` | Revoke all active sessions for current user | Bearer Token |
| GET | `/auth/me` | Retrieve current authenticated user profile | Bearer Token |
| POST | `/auth/forgot-password` | Generate password reset token / email | Public (Rate Limited) |
| POST | `/auth/reset-password` | Reset password using valid reset token | Public (Rate Limited) |
| POST | `/auth/change-password` | Change password for authenticated user | Bearer Token |
| GET | `/auth/sessions` | List active sessions/devices for authenticated user | Bearer Token |

### 3.2 Core Isolated Resource Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Health check (DB probe) | Public |
| GET | `/expenses` | List user expenses, paginated, filtered | Bearer Token |
| POST | `/expenses` | Create user expense | Bearer Token |
| GET | `/expenses/{id}` | Retrieve single user expense | Bearer Token |
| PUT | `/expenses/{id}` | Update single user expense | Bearer Token |
| DELETE | `/expenses/{id}` | Delete single user expense | Bearer Token |
| GET | `/expenses/export/csv` | Export user expenses to CSV | Bearer Token |
| GET | `/expenses/export/json` | Export user expenses to JSON | Bearer Token |
| POST | `/expenses/import/csv` | Import CSV into user account | Bearer Token |
| POST | `/expenses/import/json` | Import JSON into user account | Bearer Token |
| GET | `/categories` | List user categories with expense counts | Bearer Token |
| POST | `/categories` | Create user category (Title Case normalized) | Bearer Token |
| PUT | `/categories/{id}` | Rename user category | Bearer Token |
| DELETE | `/categories/{id}` | Delete user category with reassign option | Bearer Token |
| GET | `/budgets` | List user budgets for given month | Bearer Token |
| POST | `/budgets` | Create/upsert user budget goal | Bearer Token |
| GET | `/budgets/status` | Live remaining balance + status | Bearer Token |
| GET | `/dashboard/summary` | User dashboard summary metrics | Bearer Token |
| GET | `/dashboard/charts/by-category` | Category spending pie/donut data | Bearer Token |
| GET | `/dashboard/charts/over-time` | Spending over time data | Bearer Token |
| GET | `/dashboard/compare` | Month-over-month % change | Bearer Token |
| POST | `/ai/scan-receipt` | Multimodal Vision OCR extraction for receipts/bills/UPI | Bearer Token |
| POST | `/ai/parse-expense` | Natural Language & voice expense parsing | Bearer Token |
| POST | `/ai/chat` | FinTrack AI Financial Advisor interactive chat | Bearer Token |
| GET | `/ai/forecast` | Predictive spending forecast & anomaly detection | Bearer Token |
| GET | `/ai/monthly-digest` | Monthly financial health score & summary | Bearer Token |


### 3.3 Health endpoint contract
```json
GET /health
200 OK
{
  "status": "ok",
  "timestamp": "2026-08-26T10:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```
- Checks an actual DB round-trip (`SELECT 1`), not just process liveness — Render's health-check probe hits this to decide whether to keep the instance in rotation.
- Returns `503` with `"database": "disconnected"` if the DB check fails, so deploys never appear "healthy" against a broken DB connection.

### 3.4 Validation errors
All validation errors return `422 Unprocessable Entity` with the `error` envelope shape above, `field`-scoped where possible, so the frontend can highlight the exact form field (Section 4).

---

## 4. Validation, UI/UX, Motion & Responsiveness

### 4.1 Validation (mirrored front + back)
| Rule | Backend (Pydantic) | Frontend (Zod) |
|---|---|---|
| Amount positive | `amount: condecimal(gt=0)` | `z.number().positive()` |
| Date not in future | custom validator vs `date.today()` | `z.date().max(new Date())` |
| Title required, ≤50 chars | `title: constr(min_length=1, max_length=50)` | `z.string().min(1).max(50)` |
| Category required | FK existence check | `z.string().uuid()` |

Frontend validation gives instant inline feedback; backend validation is the source of truth and is never skipped, even if the frontend already checked.

### 4.2 UI/UX principles
- Mobile-first layout; hamburger nav collapses to icon-only on small screens, expands to a persistent left rail ≥1024px.
- Empty, loading, and error states designed for every screen (per PRD Section 6) — skeleton loaders while fetching, explicit "No expenses yet — add your first one" empty state, retry affordance on error.
- Add-expense flow optimized for the "under 30 seconds" goal (FR from PRD Section 4): category quick-create inline, date defaults to today, numeric keypad on mobile for amount.

### 4.3 Framer Motion & micro-interactions
- Route transitions: subtle fade/slide (150–200ms) between Dashboard ↔ Expenses.
- List items: `AnimatePresence` enter (fade+slide-up) / exit (fade+collapse) on add/delete, so deletions never feel like an abrupt DOM snap.
- Modals/drawers (Add/Edit expense, Delete confirmation): spring-based scale+fade.
- Buttons/inputs: tap/hover scale (0.97–1.03) for tactile feedback.
- Budget status chip animates color transition (green → amber → red) rather than hard-swapping, when crossing near-limit/over-budget thresholds.
- Toasts for save/delete success and for API errors.

### 4.4 3D (used sparingly, isolated)
- One optional 3D element: a lightweight React Three Fiber "budget gauge" on the dashboard (e.g. a rotating torus/arc that fills proportionally to budget used).
- Rendered in its own lazy-loaded component with a 2D fallback (CSS gauge) if WebGL isn't available or on low-end devices — this must never block or slow the core CRUD experience, since it's decorative, not functional.

### 4.5 Responsiveness
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px (Tailwind defaults).
- Charts resize via container queries / `ResponsiveContainer` (Recharts) rather than fixed pixel widths.
- Tables (expense list) collapse to stacked cards below `md`.

---

## 5. Standard Folder Structure

### 5.1 Backend
```
backend/
├── app/
│   ├── main.py                  # FastAPI app instance, router registration
│   ├── core/
│   │   ├── config.py            # pydantic-settings, reads .env
│   │   └── security.py          # reserved for Phase 2 auth
│   ├── api/
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── health.py
│   │           ├── expenses.py
│   │           ├── categories.py
│   │           ├── budgets.py
│   │           └── dashboard.py
│   ├── models/                  # SQLAlchemy models
│   │   ├── expense.py
│   │   ├── category.py
│   │   └── budget.py
│   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── expense.py
│   │   ├── category.py
│   │   └── budget.py
│   ├── services/                # business logic, kept out of endpoints
│   │   ├── expense_service.py
│   │   ├── category_service.py
│   │   └── budget_service.py
│   ├── db/
│   │   ├── base.py               # Base declarative class
│   │   ├── session.py            # engine + session factory
│   │   ├── seed.py
│   │   └── alembic/
│   │       ├── env.py
│   │       └── versions/
│   └── tests/
│       ├── conftest.py
│       ├── test_expenses.py
│       ├── test_categories.py
│       └── test_budgets.py
├── alembic.ini
├── requirements.txt
├── Dockerfile
├── .env.example
└── .gitignore
```

### 5.2 Frontend
```
frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── layout/               # Hamburger nav, shell
│   │   ├── expenses/             # ExpenseForm, ExpenseList, ExpenseCard
│   │   ├── categories/
│   │   ├── budgets/
│   │   ├── dashboard/            # charts, summary cards, 3D gauge
│   │   └── common/                # Button, Modal, Toast, Skeleton
│   ├── pages/
│   │   ├── DashboardPage.jsx
│   │   └── ExpensesPage.jsx
│   ├── hooks/                    # useExpenses, useCategories, useBudgets
│   ├── store/                    # Zustand slices
│   ├── api/
│   │   ├── client.js             # axios instance
│   │   └── endpoints/
│   │       ├── expenses.js
│   │       ├── categories.js
│   │       └── budgets.js
│   ├── schemas/                  # Zod validation schemas
│   ├── styles/                   # tailwind.css, global overrides
│   ├── utils/
│   └── tests/
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── Dockerfile
├── .env.example
└── .gitignore
```

### 5.3 Root
```
fintrack/
├── backend/
├── frontend/
├── docker-compose.yml            # local multi-container run (Section 7.2)
├── docker-compose.override.yml   # optional, dev-only tweaks
├── .gitignore                    # root-level ignores only
└── README.md
```

---

## 6. Environment Configuration (Env-Driven, No Hardcoding)

### 6.1 `backend/.env.example`
```
# App
ENVIRONMENT=development           # development | production
DEBUG=true

# Database (Supabase Postgres connection string)
DATABASE_URL=postgresql+asyncpg://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Supabase (only needed if using supabase-py client directly, e.g. future storage/auth)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key

# CORS
CORS_ORIGINS=http://localhost:5173,https://fintrack.vercel.app

# Seeding
SEED_STARTER_CATEGORIES=false

# App metadata
APP_VERSION=1.0.0

# Universal AI Engine (Gemini / OpenAI / Claude)
AI_PROVIDER=gemini             # gemini | openai | claude
AI_MODEL=gemini-2.0-flash      # gemini-2.0-flash | gpt-4o-mini | claude-3-5-haiku-20241022
AI_API_KEY=your_ai_api_key_here
```

### 6.2 `frontend/.env.example`
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_ENV=development
```

### 6.3 Rules
- `.env` files are **never** committed (enforced by the 3 `.gitignore` files in Section 10).
- Every config value the app reads comes through `core/config.py` (backend) or `import.meta.env` (frontend) — no literal URLs, keys, or connection strings anywhere else in code.
- Production values (Render, Vercel dashboards) are set as platform environment variables, not files, in deployment.

---

## 7. Run & Test Workflow

### 7.1 Development — without Docker

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # fill in real values
alembic upgrade head
python -m app.db.seed                                # optional, only if SEED_STARTER_CATEGORIES=true
uvicorn app.main:app --reload --port 8000
pytest                                                # run backend test suite
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev                                           # Vite dev server, http://localhost:5173
npm run test                                          # Vitest
```

At this stage the frontend talks to the local `uvicorn` server, which talks to the real Supabase Postgres instance (or a local Postgres if you prefer full isolation during early development) — no mocked data, per the PRD's data-integrity principle.

### 7.2 Deployment — with Docker

Local container verification (before pushing to Render/Vercel):
```bash
docker compose build
docker compose up
# backend → http://localhost:8000/health
# frontend → http://localhost:5173 (or the port mapped in docker-compose.yml)
```

`docker-compose.yml` (root) — for local integration testing only, mirrors prod topology:
```yaml
services:
  backend:
    build: ./backend
    env_file: ./backend/.env
    ports: ["8000:8000"]
  frontend:
    build: ./frontend
    env_file: ./frontend/.env
    ports: ["5173:80"]
    depends_on: [backend]
```

Actual deployment:
- **Backend → Render**: connect repo, set root directory to `backend/`, Render builds from `backend/Dockerfile`, health check path set to `/health`, env vars set in Render dashboard.
- **Frontend → Vercel**: connect repo, set root directory to `frontend/`, Vercel uses its native static build (Docker not required on Vercel itself — the frontend Dockerfile exists for local parity/testing per Section 9, not for the Vercel build step), env vars set in Vercel dashboard.
- **Database → Supabase**: already provisioned; `DATABASE_URL` in Render points to it.

Run → Test → Deploy is enforced per phase per the PRD's non-functional requirements: nothing moves to the next phase until this full loop passes with real data.

---

## 8. Hosting Stack: Supabase + Vercel + Render

Adopted from V1 onward (not bolted on later) so later phases don't require a data-layer migration:

| Service | Role in V1 | Why it pays off later |
|---|---|---|
| **Supabase** | Managed Postgres (via `DATABASE_URL`) | Phase 2 login/auth and Phase 2 receipt-photo storage can reuse the same Supabase project (Auth + Storage) without a new provider |
| **Vercel** | Static hosting + CDN for the React build | Zero-config previews per PR, instant rollback |
| **Render** | Web Service hosting for the FastAPI backend | Native Docker support, health-check-based zero-downtime deploys, easy env var management |

Connection pooling note: use Supabase's pooled connection string (port 6543, pgbouncer) for the app's runtime `DATABASE_URL`, and the direct connection (port 5432) only for running Alembic migrations, since migrations need a non-pooled session.

---

## 9. Docker

Two separate Dockerfiles — backend and frontend are built, scaled, and deployed independently.

### 9.1 `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 9.2 `frontend/Dockerfile`
```dockerfile
# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
(`nginx.conf` includes an SPA fallback: `try_files $uri /index.html;`, so client-side routes don't 404 on refresh.)

---

## 10. `.gitignore` Files (3, one per location)

### 10.1 `backend/.gitignore`
```
__pycache__/
*.py[cod]
venv/
.env
.env.*
!.env.example
*.egg-info/
.pytest_cache/
.coverage
htmlcov/
alembic/versions/__pycache__/
```

### 10.2 `frontend/.gitignore`
```
node_modules/
dist/
.env
.env.*
!.env.example
.vite/
coverage/
*.log
```

### 10.3 Root `.gitignore`
```
.DS_Store
Thumbs.db
.vscode/
.idea/
*.log
docker-compose.override.yml
```
Root ignores only cross-cutting/editor/OS artifacts — everything language-specific stays scoped to its own subfolder's file, so `backend/` and `frontend/` remain independently publishable if ever split into separate repos.

---

## 11. Traceability Note

Every requirement referenced above (FR-1 … FR-30) maps directly to the FinTrack PRD Section 7. This SRS does not introduce new product scope — it specifies *how* that scope is built, deployed, and operated.
