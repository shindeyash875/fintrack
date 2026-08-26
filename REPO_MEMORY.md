# FinTrack — Repository Memory & Architecture Decisions

This document preserves persistent, long-term technical context, design rationale, and architectural decisions for FinTrack. It serves as the single source of truth for architectural continuity across development sessions.

---

## 1. Project Context & Boundary Definition

* **Domain:** Personal expense and budget tracking web application with immediate visual feedback and live budget goal monitoring.
* **Core Loop:** Log an expense $\rightarrow$ see totals & charts update instantly $\rightarrow$ track live remaining budget against goals.
* **Localization & Format:** Fixed single currency: Indian Rupee (₹ / INR), formatted to 2 decimal places with standard Indian numbering where appropriate.
* **V1 / MVP Scope Boundary:** Single-user experience. No user login, no authentication layer, no bank syncing, and no multi-currency in V1.
* **Future Evolution Path:** Built deliberately on Supabase-compatible PostgreSQL so Phase 2+ features (Supabase Auth, receipt image storage in Supabase Storage, real-time sync) require no data-layer migrations.

---

## 2. System Architecture & Topology

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (React 18)                  │
│   Vite • Tailwind CSS • Framer Motion • Recharts       │
│   React Router v6 • Zustand • React Hook Form + Zod    │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (Axios, /api/v1)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                    │
│   Python 3.11+ • Uvicorn • Pydantic v2 • Alembic       │
│   SQLAlchemy 2.0 (Async) • Pytest                      │
└───────────────────────────┬────────────────────────────┘
                            │ Asyncpg / SQLAlchemy ORM
                            ▼
┌────────────────────────────────────────────────────────┐
│               Data Layer (PostgreSQL)                  │
│   Hosted on Supabase (or local Postgres container)     │
└────────────────────────────────────────────────────────┘
```

---

## 3. Data Layer Decisions & Schema Invariants

### 3.1 Dual Database URL Strategy (Supabase Compatibility)
* **Runtime Queries (`DATABASE_URL`):** Connects to Supabase's transaction pooler (port `6543`, PgBouncer/Supavisor) for application server connection pooling.
* **Migrations (`DIRECT_URL`):** Connects directly to PostgreSQL (port `5432`). Alembic migrations require direct connections because transactional DDL operations and advisory locks fail over transaction poolers.

### 3.2 Data Integrity Principle (PRD FR-30 / SRS Section 9.1)
* **Zero Dummy / Mock Data:** No mock expenses, mock charts, or fake users in the application at any stage. All screens render from actual database queries.
* **Genuine Empty States:** Empty states, skeleton loaders, and error states are first-class architectural requirements for every view.
* **Starter Category Seeding:** Idempotent seed script (`seed.py`) provisions standard categories (`Food`, `Transport`, `Rent`, `Utilities`, `Shopping`, `Health`, `Entertainment`, `Other`) only when explicitly enabled via `SEED_STARTER_CATEGORIES=true`.

### 3.3 Relational Model & Referential Integrity
* **Entities:**
  * `categories`: `id` (UUID PK), `name` (VARCHAR(50) UNIQUE), timestamps.
  * `expenses`: `id` (UUID PK), `title` (VARCHAR(50)), `category_id` (UUID FK), `amount` (NUMERIC(12,2)), `expense_date` (DATE), `notes` (TEXT), `payment_mode` (`cash` | `card` | `upi` | NULL), timestamps.
  * `budgets`: `id` (UUID PK), `category_id` (UUID FK, nullable), `period_month` (DATE), `limit_amount` (NUMERIC(12,2)), timestamps.
* **Deletion Semantics:**
  * `expenses.category_id` references `categories(id)` with `ON DELETE RESTRICT`.
  * If a user deletes a category with linked expenses, backend returns `409 Conflict` unless explicit query parameters (`?reassign_to={id}` or `?cascade=true`) are provided with explicit client confirmation.
* **Budget Period Normalization:**
  * `budgets.period_month` is always normalized to the 1st of the month (`YYYY-MM-01`).
  * `UNIQUE(category_id, period_month)`: When `category_id` is `NULL`, this represents the overall monthly budget limit.
* **Database Check Constraints:**
  * `expenses.amount > 0`
  * `expenses.expense_date <= CURRENT_DATE` (no future-dated expenses)
  * `budgets.limit_amount > 0`

---

## 4. API & Backend Design Invariants

* **Base URL:** All REST endpoints are versioned under `/api/v1`.
* **Standard Response Envelope:**
  * Success: `{ "success": true, "data": <payload>, "meta": { "page": 1, "page_size": 20, "total": 134 } }`
  * Error: `{ "success": false, "error": { "code": "<CODE>", "message": "<desc>", "field": "<field_name>" } }`
* **Deep Health Check (`GET /api/v1/health`):**
  * Performs an active database query (`SELECT 1`) to verify roundtrip health.
  * Returns `200 OK` with `{ database: "connected" }` or `503 Service Unavailable` with `{ database: "disconnected" }`.
* **Validation Parity:**
  * Backend validation via Pydantic v2 is the definitive authority.
  * Frontend validation via Zod mirrors backend constraints for instant feedback.
* **Budget Status Thresholds:**
  * `on_track`: Spend $< 80\%$ of budget limit.
  * `near_limit`: Spend between $80\%$ and $100\%$ of budget limit.
  * `over_budget`: Spend $> 100\%$ of budget limit.

---

## 5. Frontend & UI/UX Architectural Invariants

* **Responsive Layout:** Mobile-first architecture. Collapsible hamburger menu on screens $<1024$px; persistent left rail navigation on desktop ($\ge 1024$px).
* **Navigation Structure:** Two core views in V1: **Dashboard** (visual summary, analytics, budget gauges) and **Expenses** (CRUD, search, filtering, sorting).
* **Styling Strategy:** Tailwind CSS exclusively. Design tokens and color themes are defined in Tailwind configuration; component styles use utility classes.
* **Micro-interactions:** Framer Motion handles page transitions (150–200ms), list item entrance and exit (`AnimatePresence` to prevent DOM snapping on delete), modal springs, and smooth budget status color transitions.
* **Performance & 3D Element:** The 3D budget gauge (React Three Fiber) is isolated in a lazy-loaded component with an automatic 2D CSS fallback to guarantee accessibility and performance across low-end devices.

---

## 6. Containerization & Deployment Model

* **Independent Containerization:**
  * `backend/Dockerfile`: Minimal `python:3.11-slim` container running Uvicorn.
  * `frontend/Dockerfile`: Multi-stage build (`node:20-alpine` build stage $\rightarrow$ `nginx:alpine` runtime) with SPA fallback (`try_files $uri /index.html;`).
* **Local Integration:** `docker-compose.yml` in root wires frontend, backend, and environment files for full local stack validation.
* **Production Targets:** Frontend on Vercel, Backend Web Service on Render, Database on Supabase.
