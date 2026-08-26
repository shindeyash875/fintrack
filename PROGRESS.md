# FinTrack — Project Progress

## Phase Completed: Phase 1 — Environment & Project Scaffolding

### 1. Work Completed
- **Project Structure & Git Hygiene:**
  - Initialized root and sub-project architecture strictly following SRS Section 5 (`backend/`, `frontend/`, `DOCS/`).
  - Created all 3 `.gitignore` files (`.gitignore`, `backend/.gitignore`, `frontend/.gitignore`) guaranteeing that secrets (`.env`, `.env.*`), build artifacts (`dist/`), virtual environments (`venv/`), and dependencies (`node_modules/`) are strictly excluded from version control.
  - Created root `README.md` and `docker-compose.yml` for multi-container orchestration.
- **Backend Scaffolding (FastAPI + SQLAlchemy 2.0 Async + Alembic):**
  - Configured `backend/.env.example` with standard PostgreSQL async connection URL (`DATABASE_URL`) and CORS settings.
  - Implemented `app/core/config.py` using `pydantic-settings` to ensure zero hardcoded configurations.
  - Created `app/core/security.py` as a placeholder for future authentication.
  - Set up async database layer in `app/db/session.py` and `app/db/base.py` with DeclarativeBase and `get_db` session dependency.
  - Implemented idempotent starter categories seed script `app/db/seed.py` gated behind `SEED_STARTER_CATEGORIES=true` (FR-10).
  - Scaffolded SQLAlchemy ORM models in `app/models/` (`Category`, `Expense`, `Budget`) with required check constraints (`amount > 0`, `limit_amount > 0`), unique constraints, and foreign key rules (`ON DELETE RESTRICT` for expenses).
  - Implemented Pydantic v2 schemas in `app/schemas/` (`common`, `category`, `expense`, `budget`, `dashboard`) enforcing validation parity (positive amounts, non-future dates, max title lengths, standardized response and error envelopes).
  - Implemented business logic services in `app/services/` (`CategoryService`, `ExpenseService`, `BudgetService`, `DashboardService`).
  - Implemented REST endpoints in `app/api/v1/endpoints/` (`health`, `categories`, `expenses`, `budgets`, `dashboard`) and aggregated under `/api/v1` router.
  - Set up `app/main.py` with CORS middleware, lifespan hooks, standardized validation error handlers, and `/health` probes.
  - Configured `alembic.ini` and `app/db/alembic/env.py` for async database migrations.
  - Created `backend/Dockerfile` with Python 3.11-slim base.
- **Frontend Scaffolding (React 18 + Vite + Tailwind CSS):**
  - Created `frontend/.env.example` defining `VITE_API_BASE_URL` and `VITE_APP_ENV`.
  - Configured `package.json` with React 18, Vite, Tailwind CSS, Framer Motion, Recharts, React Router v6, Zustand, React Hook Form + Zod, and Axios.
  - Set up `vite.config.js`, `tailwind.config.js`, and `postcss.config.js` with brand tokens (`brand` emerald palette, `status` track/near/over colors) and typography (Inter, Outfit).
  - Configured `index.html` with Google Fonts and responsive viewport.
  - Implemented Axios client in `src/api/client.js` with response interceptors unpacking standardized response envelopes.
  - Created modular endpoint clients in `src/api/endpoints/` (`categories.js`, `expenses.js`, `budgets.js`, `dashboard.js`).
  - Implemented Zod validation schemas in `src/schemas/` mirroring backend validation rules.
  - Set up Zustand state stores in `src/store/` (`useUIStore`, `useCategoryStore`, `useExpenseStore`, `useBudgetStore`).
  - Built common UI components adhering strictly to "no inline styles" (`Button.jsx`, `Modal.jsx`, `Toast.jsx`, `Skeleton.jsx`, `EmptyState.jsx`).
  - Built responsive navigation layout shell (`Layout.jsx`, `Navbar.jsx`, `Sidebar.jsx`) with desktop persistent left rail (≥1024px) and mobile collapsible drawer.
  - Created core views: `DashboardPage.jsx` (summary metric cards, spending breakdown, recent transactions, honest empty state) and `ExpensesPage.jsx` (search, category filter, payment mode filter, sorting, desktop table view, mobile cards view, pagination).
  - Configured `App.jsx` with React Router v6 routes (`/` and `/expenses`).
  - Created `frontend/Dockerfile` with multi-stage build and `nginx.conf` supporting SPA fallback.

### 2. Files Created / Modified
- **Root:**
  - `d:\FinTrack\.gitignore`
  - `d:\FinTrack\README.md`
  - `d:\FinTrack\docker-compose.yml`
  - `d:\FinTrack\PROGRESS.md`
- **Backend:**
  - `d:\FinTrack\backend\.gitignore`
  - `d:\FinTrack\backend\.env.example`
  - `d:\FinTrack\backend\Dockerfile`
  - `d:\FinTrack\backend\requirements.txt`
  - `d:\FinTrack\backend\alembic.ini`
  - `d:\FinTrack\backend\app\core\config.py`
  - `d:\FinTrack\backend\app\core\security.py`
  - `d:\FinTrack\backend\app\db\base.py`
  - `d:\FinTrack\backend\app\db\session.py`
  - `d:\FinTrack\backend\app\db\seed.py`
  - `d:\FinTrack\backend\app\db\alembic\env.py`
  - `d:\FinTrack\backend\app\db\alembic\script.py.mako`
  - `d:\FinTrack\backend\app\models\category.py`
  - `d:\FinTrack\backend\app\models\expense.py`
  - `d:\FinTrack\backend\app\models\budget.py`
  - `d:\FinTrack\backend\app\schemas\common.py`
  - `d:\FinTrack\backend\app\schemas\category.py`
  - `d:\FinTrack\backend\app\schemas\expense.py`
  - `d:\FinTrack\backend\app\schemas\budget.py`
  - `d:\FinTrack\backend\app\schemas\dashboard.py`
  - `d:\FinTrack\backend\app\services\category_service.py`
  - `d:\FinTrack\backend\app\services\expense_service.py`
  - `d:\FinTrack\backend\app\services\budget_service.py`
  - `d:\FinTrack\backend\app\services\dashboard_service.py`
  - `d:\FinTrack\backend\app\api\v1\endpoints\health.py`
  - `d:\FinTrack\backend\app\api\v1\endpoints\categories.py`
  - `d:\FinTrack\backend\app\api\v1\endpoints\expenses.py`
  - `d:\FinTrack\backend\app\api\v1\endpoints\budgets.py`
  - `d:\FinTrack\backend\app\api\v1\endpoints\dashboard.py`
  - `d:\FinTrack\backend\app\api\v1\router.py`
  - `d:\FinTrack\backend\app\main.py`
  - `d:\FinTrack\backend\tests\conftest.py`
  - `d:\FinTrack\backend\tests\test_health.py`
- **Frontend:**
  - `d:\FinTrack\frontend\.gitignore`
  - `d:\FinTrack\frontend\.env.example`
  - `d:\FinTrack\frontend\Dockerfile`
  - `d:\FinTrack\frontend\nginx.conf`
  - `d:\FinTrack\frontend\package.json`
  - `d:\FinTrack\frontend\vite.config.js`
  - `d:\FinTrack\frontend\tailwind.config.js`
  - `d:\FinTrack\frontend\postcss.config.js`
  - `d:\FinTrack\frontend\index.html`
  - `d:\FinTrack\frontend\src\styles\index.css`
  - `d:\FinTrack\frontend\src\api\client.js`
  - `d:\FinTrack\frontend\src\api\endpoints\categories.js`
  - `d:\FinTrack\frontend\src\api\endpoints\expenses.js`
  - `d:\FinTrack\frontend\src\api\endpoints\budgets.js`
  - `d:\FinTrack\frontend\src\api\endpoints\dashboard.js`
  - `d:\FinTrack\frontend\src\schemas\categorySchema.js`
  - `d:\FinTrack\frontend\src\schemas\expenseSchema.js`
  - `d:\FinTrack\frontend\src\schemas\budgetSchema.js`
  - `d:\FinTrack\frontend\src\store\useUIStore.js`
  - `d:\FinTrack\frontend\src\store\useCategoryStore.js`
  - `d:\FinTrack\frontend\src\store\useExpenseStore.js`
  - `d:\FinTrack\frontend\src\store\useBudgetStore.js`
  - `d:\FinTrack\frontend\src\components\common\Button.jsx`
  - `d:\FinTrack\frontend\src\components\common\Modal.jsx`
  - `d:\FinTrack\frontend\src\components\common\Toast.jsx`
  - `d:\FinTrack\frontend\src\components\common\Skeleton.jsx`
  - `d:\FinTrack\frontend\src\components\common\EmptyState.jsx`
  - `d:\FinTrack\frontend\src\components\layout\Sidebar.jsx`
  - `d:\FinTrack\frontend\src\components\layout\Navbar.jsx`
  - `d:\FinTrack\frontend\src\components\layout\Layout.jsx`
  - `d:\FinTrack\frontend\src\pages\DashboardPage.jsx`
  - `d:\FinTrack\frontend\src\pages\ExpensesPage.jsx`
  - `d:\FinTrack\frontend\src\App.jsx`
  - `d:\FinTrack\frontend\src\main.jsx`
  - `d:\FinTrack\frontend\src\tests\setup.js`
  - `d:\FinTrack\frontend\src\tests\App.test.jsx`

### 3. Tests & Verification Performed
- **Backend Test Suite:** Executed `pytest` in isolated `backend/venv`:
  - `test_root_health`: PASSED (verifies `/health` returns status, version, and db connection state).
  - `test_api_v1_health`: PASSED (verifies `/api/v1/health` deep probe).
  - 2 passed in 5.77s.
- **Frontend Test Suite:** Executed `vitest run`:
  - `App.test.jsx`: PASSED (verifies layout, brand header, and navigation render).
  - 1 passed in 6.92s.
- **Frontend Production Build:** Executed `vite build`:
  - Successfully transformed 2005 modules and generated production bundle in `dist/` (zero build errors, built in 4.40s).
- **Git Hygiene Verification:**
  - Ran `git status -u` to verify no untracked `.env`, credentials, `venv`, or `node_modules` are exposed.
  - Verified 100% adherence to AGENTS.md rule 2 (no inline styling) across all frontend components.

### 4. Important Technical Decisions
- All Phase 1 scaffolding adheres directly to the architectural decisions established in the SRS and Phase 0 planning. No new architectural divergence occurred.

### 5. Known Issues
- None.

### 6. Pending Work
- None from Phase 1 or Phase 2.

---

## Phase Completed: Phase 2 — Database Setup, Migrations & Starter Seed Data (Local PostgreSQL)

### 1. Work Completed
- **Local PostgreSQL Provisioning & Verification:**
  - Connected to local PostgreSQL 18 on port 5432 using discrete environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
  - Idempotently checked and created the target `fintrack` database.
  - Strictly respected security guidelines: `.env` was read locally, never committed, never staged, and no credentials exposed.
- **Alembic Database Migration:**
  - Generated initial migration revision `backend/app/db/alembic/versions/449007dda940_initial_schema.py` from declarative SQLAlchemy 2.0 models.
  - Verified constraints:
    - Check constraint `amount > 0` on `expenses`.
    - Check constraint `limit_amount > 0` on `budgets`.
    - Unique constraint on `budgets(category_id, period_month)`.
    - Foreign key rule `ON DELETE RESTRICT` on `expenses.category_id`.
    - Foreign key rule `ON DELETE CASCADE` on `budgets.category_id`.
    - Indexes on `categories(name)`, `expenses(expense_date)`, `expenses(category_id)`, `expenses(payment_mode)`.
  - Executed `alembic upgrade head` successfully against local PostgreSQL database.
- **Idempotent Starter Seed Data (FR-10 & FR-30):**
  - Executed `app/db/seed.py` inserting the 8 starter categories (`Food`, `Transport`, `Rent`, `Utilities`, `Shopping`, `Health`, `Entertainment`, `Other`).
  - Verified idempotency: consecutive runs detect existing records and skip cleanly without error or duplication.
  - Enforced FR-30: zero dummy expenses or demo budgets were seeded; database reflects true initial state.
- **Live Integration & Verification:**
  - Executed deep health check probes (`/health` and `/api/v1/health`), verifying live round-trip query (`SELECT 1`) returning `200 OK` with `"database": "connected"`.
  - Verified `/api/v1/categories` endpoint returning all 8 starter categories with `expense_count: 0`.
  - Verified `/api/v1/dashboard/summary` endpoint returning honest empty state metrics (`total_spent: 0.00`, empty lists).

### 2. Files Created / Modified
- `d:\FinTrack\backend\app\db\alembic\versions\449007dda940_initial_schema.py`
- `d:\FinTrack\PROGRESS.md`

### 3. Tests & Verification Performed
- **Pytest Suite:** 2 of 2 tests passed against live local database (`test_root_health`, `test_api_v1_health`).
- **Live Endpoints Verification:**
  - `/health` -> 200 OK, database: connected
  - `/api/v1/categories` -> 200 OK, 8 starter categories retrieved
  - `/api/v1/dashboard/summary` -> 200 OK, empty metrics data
- **Vitest Suite:** 1 of 1 passed.
- **Git Hygiene:** Verified `backend/.env` remains strictly ignored and uncommitted.

### 4. Exact Next Phase & Recommended Next Steps
- Completed in Phase 3.

---

## Phase Completed: Phase 3 — Core Expense CRUD, Categories Management & Live Frontend Integration

### 1. Work Completed
- **Expense CRUD & Fast Logging (< 30s) (FR-2, FR-4, FR-5, FR-6):**
  - Built `ExpenseModal.jsx` powered by `react-hook-form` + `@hookform/resolvers/zod` with [expenseSchema.js](file:///d:/FinTrack/frontend/src/schemas/expenseSchema.js).
  - Implemented inline quick category creation directly within the expense form so users can create and select a new category without breaking the logging flow (FR-6).
  - Enforced client-side validation rules in strict parity with backend Pydantic models:
    - Title: 1–50 characters, trimmed.
    - Category: required valid UUID.
    - Amount: positive number strictly greater than 0, formatted with ₹ currency prefix.
    - Expense Date: required, defaults to today, disallows future dates.
    - Notes: optional, max 500 characters.
    - Payment Mode: optional pill selection (Cash, Card, UPI, None).
  - Built Edit Expense flow pre-populating fields and updating via `updateExpense(id, payload)` and live database refresh.
  - Built `DeleteConfirmModal.jsx` with Framer Motion spring entrance/exit, danger styling, and action confirmation (FR-5).
- **Category Management & Safe Deletion (FR-6, FR-7, FR-8, FR-9, FR-10):**
  - Built `CategoryManageModal.jsx` displaying all categories with live `expense_count` badges (FR-9).
  - Inline category rename feature using `updateCategory(id, { name })` (FR-7).
  - Safe category deletion handling (FR-8):
    - When `expense_count == 0`, confirms and deletes directly.
    - When `expense_count > 0`, warns the user of linked transactions and presents a replacement category dropdown selector to reassign linked expenses before deletion, preventing orphaned records or PostgreSQL foreign key violations.
- **Search, Filtering, Sorting & Responsive UI (FR-11 to FR-16):**
  - Search by title or notes with instant clear button (FR-11).
  - Category filtering with active category count badges (FR-13).
  - Payment mode filtering (Cash, Card, UPI) (FR-15).
  - Collapsible Advanced Filters panel for Date Range (`from_date`, `to_date`) (FR-12) and Amount Range (`min_amount`, `max_amount`) (FR-14).
  - Multi-column sorting (Date newest/oldest, Amount highest/lowest, Title A-Z) (FR-16).
  - Desktop table view and responsive mobile cards view with edit/delete actions on each card.
  - Active filter badge counter and "Reset All Filters" button.
- **Backend Enhancements:**
  - Configured `passive_deletes=True` on `Category` relationships in `app/models/category.py` to delegate foreign key constraint handling to PostgreSQL.
  - Implemented SQLAlchemy 2.0 ORM `delete(Category).where(Category.id == category.id)` construct in `CategoryService.delete` to cleanly avoid synchronous lazy-load triggers in async sessions.

### 2. Files Created / Modified
- **Frontend:**
  - `d:\FinTrack\frontend\src\components\expenses\ExpenseModal.jsx` [NEW]
  - `d:\FinTrack\frontend\src\components\categories\CategoryManageModal.jsx` [NEW]
  - `d:\FinTrack\frontend\src\components\common\DeleteConfirmModal.jsx` [NEW]
  - `d:\FinTrack\frontend\src\pages\ExpensesPage.jsx` [MODIFIED]
  - `d:\FinTrack\frontend\src\tests\schemas.test.js` [NEW]
- **Backend:**
  - `d:\FinTrack\backend\app\models\category.py` [MODIFIED]
  - `d:\FinTrack\backend\app\services\category_service.py` [MODIFIED]
  - `d:\FinTrack\backend\tests\conftest.py` [MODIFIED]
  - `d:\FinTrack\backend\tests\test_categories.py` [NEW]
  - `d:\FinTrack\backend\tests\test_expenses.py` [NEW]
- **Documentation:**
  - `d:\FinTrack\PROGRESS.md` [MODIFIED]

### 3. Tests & Verification Performed
- **Frontend Unit Tests (Vitest):**
  - `schemas.test.js`: 7 of 7 passed (title length, positive amount, non-future dates, payment modes, category length).
  - `App.test.jsx`: 1 of 1 passed.
  - Total: 8 of 8 passed.
- **Frontend Production Build (Vite):**
  - `npm run build`: 2023 modules transformed, compiled in 2.66s with 0 errors.
- **Backend Integration Tests (Pytest):**
  - `test_list_categories`: PASSED (returns 8 starter categories with counts).
  - `test_create_rename_and_delete_category`: PASSED (creates, renames, deletes empty category).
  - `test_category_in_use_reassignment`: PASSED (verifies 409 conflict when in use, reassigns linked expenses to target category, and deletes successfully).
  - `test_expense_crud_and_filters`: PASSED (creates expense, tests search/category/payment mode/amount range filters, updates expense, deletes expense).
  - `test_root_health`: PASSED.
  - `test_api_v1_health`: PASSED.
  - Total: 6 of 6 passed in 2.17s.
- **Git Hygiene:**
  - `git status` verified no `.env` files are tracked or staged. Zero credentials exposed.

### 4. Important Technical Decisions
- **ORM Delete Construct over Instance Nullification:**
  - In async SQLAlchemy, calling `session.delete(instance)` on an entity with loaded `lazy="selectin"` relationships can trigger synchronous lazy-loads. Using `delete(Category).where(Category.id == category.id)` with `passive_deletes=True` ensures clean, non-blocking DB execution while adhering strictly to Rule 3 (prefer ORM over raw SQL).
- **Inline Category Quick-Create:**
  - Integrated directly inside `ExpenseModal.jsx` so users can create a category on the fly without abandoning an in-progress expense form.

### 5. Known Issues
- None. All tests pass across frontend and backend.

### 6. Exact Next Phase & Recommended Next Steps
- **Exact Next Phase:** **Phase 4 — Budgets, Spending Limits & Overspending Warnings**
- **Recommended Next Steps for Phase 4:**
  1. Build Budget Set/Edit modal component with month selector (defaults to current month `YYYY-MM`), category dropdown, and monthly limit amount.
  2. Implement Budget list view showing visual progress bars with three status tiers:
     - On Track (≤ 80%): Emerald green
     - Near Limit (80%–100%): Amber warning
     - Exceeded (> 100%): Rose danger
  3. Wire up `/api/v1/budgets` endpoints with live calculations comparing monthly expenses to active budget limits.
  4. Display overspending banner notifications when any category limit is breached.

