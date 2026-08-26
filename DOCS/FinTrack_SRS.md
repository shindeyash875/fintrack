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

---

## 2. Database, Migrations, ORM, Seed Data

### 2.1 Schema (V1)

```sql
-- categories
categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- expenses
expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(50) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL CHECK (expense_date <= CURRENT_DATE),
  notes TEXT,
  payment_mode VARCHAR(20), -- 'cash' | 'card' | 'upi' | null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- budgets
budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE, -- NULL = overall/monthly budget
  period_month DATE NOT NULL, -- normalized to first of month
  limit_amount NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, period_month)
)
```

Indexes: `expenses(expense_date)`, `expenses(category_id)`, `expenses(payment_mode)` — supports FR-12–FR-16 (filter/sort) efficiently.

Category delete rule (FR-8): `ON DELETE RESTRICT` on `expenses.category_id` — the API layer checks usage count first and either blocks deletion, or offers reassignment/cascade with an explicit confirmation, per the PRD.

### 2.2 ORM
- SQLAlchemy 2.0 declarative models mirror the schema above 1:1.
- One model file per table under `app/models/`.
- Relationships: `Category.expenses`, `Category.budgets` (both lazy="selectin" to avoid N+1 on dashboard queries).

### 2.3 Migrations (Alembic)
- `alembic init app/db/alembic` on project setup.
- Every schema change = one migration file, generated via `alembic revision --autogenerate -m "message"`, reviewed by hand before commit (autogenerate can miss constraints).
- `alembic upgrade head` is part of both the dev bootstrap and the deployment pipeline — schema state must always be migration-driven, never manual `CREATE TABLE`.

### 2.4 Seed Data
Per PRD's non-functional principle (FR-30 / Section 9.1: **no hardcoded/dummy data**), seeding is treated carefully:

- A seed script (`app/db/seed.py`) exists **only** to insert the small set of starter categories referenced in FR-10 (Food, Transport, Rent, Utilities, Shopping, Health, Entertainment, Other) — this is real, permanent app data, not test/demo data.
- It is idempotent (checks existence before insert) and gated behind an explicit env flag: `SEED_STARTER_CATEGORIES=true`.
- **No** demo expenses, demo budgets, or fake users are ever seeded — the app must show a genuine empty state on first run, per FR-30.
- A separate `tests/fixtures/` seed exists strictly for the Pytest suite and never touches the dev/prod database.

---

## 3. API Contract

Base URL: `/api/v1`. All responses use a consistent envelope; all list endpoints are paginated.

### 3.1 Response envelope
```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "page_size": 20, "total": 134 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "amount must be positive", "field": "amount" } }
```

### 3.2 Core endpoints

| Method | Path | Purpose | Priority |
|---|---|---|---|
| GET | `/health` | Health check (see 3.3) | P0 |
| GET | `/expenses` | List, paginated; query params: `search`, `date_from`, `date_to`, `category_id`, `amount_min`, `amount_max`, `payment_mode`, `sort_by`, `sort_dir` | P0 |
| POST | `/expenses` | Create expense | P0 |
| GET | `/expenses/{id}` | Retrieve one | P0 |
| PUT | `/expenses/{id}` | Update (full) | P0 |
| DELETE | `/expenses/{id}` | Delete (confirmation handled client-side) | P0 |
| GET | `/categories` | List, with `expense_count` per category (FR-9) | P0 |
| POST | `/categories` | Create | P0 |
| PUT | `/categories/{id}` | Rename | P0 |
| DELETE | `/categories/{id}` | Delete; `409 Conflict` if in use unless `?reassign_to={category_id}` or `?cascade=true` provided | P0 |
| GET | `/budgets` | List budgets (overall + per-category) for a given `period_month` | P0 |
| POST | `/budgets` | Create/upsert a budget goal | P0 |
| GET | `/budgets/status` | Live remaining balance + status (`on_track` / `near_limit` / `over_budget`) per FR-27/28 | P0 |
| GET | `/dashboard/summary` | Total spend (overall + current month), recent expenses, top categories | P0 |
| GET | `/dashboard/charts/by-category` | Data for pie/donut chart | P0 |
| GET | `/dashboard/charts/over-time` | Data for bar/line chart, `granularity=daily\|weekly\|monthly` | P0 |
| GET | `/dashboard/compare` | Month-over-month % change (FR-23) | P1 |

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
