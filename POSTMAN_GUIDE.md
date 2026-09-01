# FinTrack FastAPI Backend — Step-by-Step Postman Testing Guide

This guide is a beginner-friendly tutorial for manually testing your **FinTrack FastAPI Backend** using Postman.

It accompanies the ready-to-import Postman files located in your project root:
- Collection file: [`FinTrack.postman_collection.json`](file:///d:/FinTrack/FinTrack.postman_collection.json)
- Environment file: [`FinTrack.postman_environment.json`](file:///d:/FinTrack/FinTrack.postman_environment.json)
- Detailed endpoint schema reference: [`COLLECTION.md`](file:///d:/FinTrack/COLLECTION.md)

---

## Table of Contents
1. [1-Minute Quick Start: Import Collection & Environment](#1-1-minute-quick-start-import-collection--environment)
2. [Switching Between Local and Render Production](#2-switching-between-local-and-render-production)
3. [Authentication Notice](#3-authentication-notice)
4. [Step-by-Step Testing Flow (Click-by-Click)](#4-step-by-step-testing-flow-click-by-click)
   - [Step 1: Check System Health](#step-1-check-system-health)
   - [Step 2: Create a Category](#step-2-create-a-category)
   - [Step 3: Test Duplicate Category Protection](#step-3-test-duplicate-category-protection)
   - [Step 4: List Categories](#step-4-list-categories)
   - [Step 5: Log an Expense / Transaction](#step-5-log-an-expense--transaction)
   - [Step 6: List & Filter Expenses](#step-6-list--filter-expenses)
   - [Step 7: Set a Monthly Budget](#step-7-set-a-monthly-budget)
   - [Step 8: Check Live Budget Status](#step-8-check-live-budget-status)
   - [Step 9: Inspect Dashboard Metrics & Charts](#step-9-inspect-dashboard-metrics--charts)
   - [Step 10: Test CSV / JSON Export](#step-10-test-csv--json-export)
   - [Step 11: Cleanup / Delete Resources](#step-11-cleanup--delete-resources)
5. [Specific Manual Tests for Recent Fixes](#5-specific-manual-tests-for-recent-fixes)
6. [Common Errors & Troubleshooting](#6-common-errors--troubleshooting)
7. [Testing Checklist](#7-testing-checklist)

---

## 1. 1-Minute Quick Start: Import Collection & Environment

Instead of typing 23 requests by hand, import the pre-built files:

1. Open **Postman**.
2. In the top-left corner, click the **Import** button (or press `Ctrl + O` / `Cmd + O`).
3. Click **Choose Files** (or drag and drop):
   - Select [`d:\FinTrack\FinTrack.postman_collection.json`](file:///d:/FinTrack/FinTrack.postman_collection.json)
   - Select [`d:\FinTrack\FinTrack.postman_environment.json`](file:///d:/FinTrack/FinTrack.postman_environment.json)
4. Click **Import**.
5. You will see:
   - A new collection named **`FinTrack API Collection`** in the left sidebar with 7 organized folders.
   - An environment named **`FinTrack Local`** in your Environments tab.

---

## 2. Switching Between Local and Render Production

### For Local Testing (`http://localhost:8000`)
1. In the top-right corner of Postman, click the Environment dropdown.
2. Select **`FinTrack Local`**.
3. Ensure your local backend is running in your terminal:
   ```bash
   cd d:\FinTrack\backend
   venv\Scripts\activate
   uvicorn app.main:app --reload
   ```

### For Deployed Render Testing (`https://<your-service>.onrender.com`)
1. In Postman, click **Environments** on the left sidebar.
2. Click on **`FinTrack Local`** $\rightarrow$ click the three dots ($\dots$) $\rightarrow$ **Duplicate**.
3. Rename the copy to: **`FinTrack Render`**.
4. Change the `base_url` value:
   - **Initial & Current Value**: `https://<your-backend-service>.onrender.com`
5. Click **Save** (`Ctrl + S`).
6. Select **`FinTrack Render`** in the top-right environment dropdown.

---

## 3. Authentication Notice

- **No login or bearer token is required!**
- All 23 API endpoints are public REST routes for single-user expense management.
- You do **not** need to enter anything in Postman's **Authorization** tab. Leave it as `Inherit auth from parent` or `No Auth`.

---

## 4. Step-by-Step Testing Flow (Click-by-Click)

### Step 1: Check System Health
Before testing any features, verify that your server is running and connected to PostgreSQL.

1. In Postman, open folder: `1. System Health`.
2. Click request: **`Platform Root Health Check`** (`GET {{base_url}}/health`).
3. Click the blue **Send** button.
4. **Inspect the response**:
   - Status code: **`200 OK`**
   - Response body:
     ```json
     {
       "status": "ok",
       "database": "connected",
       "version": "1.0.0"
     }
     ```
   *(If `"database": "disconnected"`, your PostgreSQL or Supabase instance is offline).*

---

### Step 2: Create a Category
Every expense must belong to a category, so create one first.

1. Open folder: `2. Categories`.
2. Click request: **`Create Category`** (`POST {{base_url}}/api/v1/categories`).
3. Click the **Body** tab:
   - Ensure **raw** and **JSON** are selected.
   - Body content:
     ```json
     {
       "name": "Groceries"
     }
     ```
4. Click **Send**.
5. **Inspect the response**:
   - Status code: **`201 Created`**
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "id": "e3b0c442-98fc-1c14-9afbf4c8996fb924",
         "name": "Groceries",
         "expense_count": 0
       }
     }
     ```
6. **Smart Feature**: The pre-configured Postman test script automatically captures the generated `id` and saves it to your `{{category_id}}` environment variable!

---

### Step 3: Test Duplicate Category Protection
Verify that duplicate categories cannot be created.

1. Immediately click **Send** on `Create Category` again without changing anything.
2. **Inspect the response**:
   - Status code: **`409 Conflict`**
   - Message: `"Category already exists."`
   - Notice: **Zero database tracebacks** are leaked.

---

### Step 4: List Categories
1. In folder `2. Categories`, click **`List All Categories`** (`GET {{base_url}}/api/v1/categories`).
2. Click **Send**.
3. **Inspect the response**:
   - Status code: **`200 OK`**
   - Shows all categories with real-time `expense_count`.

---

### Step 5: Log an Expense / Transaction
1. Open folder: `3. Expenses & Transactions`.
2. Click request: **`Create Expense`** (`POST {{base_url}}/api/v1/expenses`).
3. Click the **Body** tab:
   ```json
   {
     "title": "Weekly Organic Supermarket",
     "category_id": "{{category_id}}",
     "amount": 1450.50,
     "expense_date": "2026-08-27",
     "notes": "Vegetables and dairy items",
     "payment_mode": "upi"
   }
   ```
   *(Postman automatically fills `{{category_id}}` with the ID from Step 2!)*
4. Click **Send**.
5. **Inspect the response**:
   - Status code: **`201 Created`**
   - Contains generated expense `id` (auto-saved as `{{expense_id}}`), formatted amount `"1450.50"`, and category name `"Groceries"`.

---

### Step 6: List & Filter Expenses
1. In folder `3. Expenses & Transactions`, click **`List Paginated Expenses`** (`GET {{base_url}}/api/v1/expenses`).
2. Click **Params** to inspect query parameters:
   - `page`: `1`
   - `page_size`: `20`
   - `sort_by`: `expense_date`
   - `sort_dir`: `desc`
3. Click **Send**.
4. **Inspect the response**:
   - Returns array of expenses in `data`.
   - Returns pagination metadata in `meta` (`total`, `page`, `page_size`, `total_pages`).

---

### Step 7: Set a Monthly Budget
1. Open folder: `4. Budgets & Goals`.
2. Click request: **`Create or Upsert Budget`** (`POST {{base_url}}/api/v1/budgets`).
3. Click **Body**:
   ```json
   {
     "category_id": "{{category_id}}",
     "period_month": "2026-08-01",
     "limit_amount": 5000.00
   }
   ```
4. Click **Send**.
5. **Inspect the response**:
   - Status: **`201 Created`**
   - Automatically saves `{{budget_id}}`.

---

### Step 8: Check Live Budget Status
1. In folder `4. Budgets & Goals`, click **`Get Live Budget Status`** (`GET {{base_url}}/api/v1/budgets/status?period_month=2026-08-01`).
2. Click **Send**.
3. **Inspect the response**:
   - `spent_amount`: Shows the total spent in this category (from Step 5: `1450.50`).
   - `remaining_amount`: `3549.50`
   - `percentage_used`: `29.01%`
   - `status`: `"on_track"`

---

### Step 9: Inspect Dashboard Metrics & Charts
1. Open folder: `5. Dashboard & Analytics`.
2. Test the following requests one by one by clicking **Send**:
   - **`Dashboard Summary`**: Returns total spent lifetime, this month, 5 recent transactions, and daily average.
   - **`Spend by Category`**: Returns percentage and amount breakdown for the pie chart.
   - **`Spending Over Time`**: Returns time-series trend data for bar/line charts.
   - **`Month-over-Month Comparison`**: Compares current month vs previous month with percentage change.

---

### Step 10: Test CSV / JSON Export
1. Open folder: `6. Data Export & Import`.
2. Click **`Export Expenses CSV`**.
3. In Postman, click the downward arrow next to **Send** $\rightarrow$ click **Send and Download**.
4. Choose a folder on your computer to save `fintrack_expenses_....csv`.
5. Open the downloaded file in Notepad or Excel to verify it has your headers:
   `Date, Title, Category, Amount, Payment Mode, Notes`.

---

### Step 11: Cleanup / Delete Resources
When you want to remove test data:
1. `DELETE {{base_url}}/api/v1/expenses/{{expense_id}}` $\rightarrow$ Returns `{"deleted": true}`.
2. `DELETE {{base_url}}/api/v1/budgets/{{budget_id}}` $\rightarrow$ Returns `{"deleted": true}`.
3. `DELETE {{base_url}}/api/v1/categories/{{category_id}}` $\rightarrow$ Returns `{"deleted": true}`.

---

## 5. Specific Manual Tests for Recent Fixes

All tests in folder `7. Verification Tests (Recent Fixes)` test the edge cases we recently resolved:

| Request Name | What It Tests | Expected Result |
| :--- | :--- | :--- |
| **Category - Duplicate Same Case** | Adding `"Groceries"` again | **`409 Conflict`** with message `"Category already exists."` |
| **Category - Duplicate Lowercase** | Adding `"groceries"` | **`409 Conflict`** (case-insensitive duplicate check) |
| **Category - Duplicate Spaces** | Adding `"   Groceries   "` | **`409 Conflict`** (whitespace trimmed before check) |
| **Budget - Negative Amount** | Budget with `limit_amount: -500` | **`422 Unprocessable Entity`** (`"Input should be greater than 0"`) |
| **Expense - Future Date** | Expense with year 2099 | **`422 Unprocessable Entity`** (`"Expense date cannot be in the future"`) |
| **Expense - Invalid Payment Mode** | `payment_mode: "bitcoin"` | **`422 Unprocessable Entity`** (`"Payment mode must be 'cash', 'card', 'upi', or null"`) |

---

## 6. Common Errors & Troubleshooting

### 1. "Could not send request" / Network Error in Postman
- **If testing local (`localhost:8000`)**:
  - Open terminal and confirm FastAPI is running: `uvicorn app.main:app --reload`.
- **If testing Render (`onrender.com`)**:
  - Check your internet connection.
  - Render's free tier spins down backends after 15 minutes of inactivity. The first request takes **15 to 30 seconds** to wake up. Wait 30 seconds and click **Send** again.

### 2. 404 Not Found
- In FastAPI, all business endpoints are mounted under `/api/v1`.
- **Incorrect URL**: `http://localhost:8000/categories`
- **Correct URL**: `http://localhost:8000/api/v1/categories`

### 3. 409 Conflict
- Occurs when adding a duplicate category name (regardless of casing or surrounding spaces).
- Also occurs if you try to delete a category that currently has transactions linked to it. (To delete anyway, pass query param `?cascade=true`).

### 4. 422 Unprocessable Entity
- Pydantic validation failed. Scroll down to the response body and look at `"field"` and `"message"` to see exactly which field failed validation.

### 5. Why Postman is NOT affected by Browser CORS
- In web browsers (like Chrome), cross-origin requests are checked against the server's `Access-Control-Allow-Origin` header.
- **Postman is a desktop HTTP client**, not a web browser. Postman does not enforce browser CORS restrictions. If an endpoint works in Postman but fails in your browser, the issue is browser CORS configuration (which we fixed in `backend/app/main.py` with `CORS_ORIGIN_REGEX`).

---

## 7. Testing Checklist

Use this checklist as you test each endpoint in Postman:

- [ ] **Import**: Imported `FinTrack.postman_collection.json` into Postman.
- [ ] **Environment**: Selected `FinTrack Local` (or `FinTrack Render`).
- [ ] **Health Probe**: `GET /health` returned `200 OK` with `"database": "connected"`.
- [ ] **Deep Health**: `GET /api/v1/health` returned `200 OK`.
- [ ] **Create Category**: Created category, status `201 Created`.
- [ ] **Duplicate Test**: Same category returned `409 Conflict` (no raw DB tracebacks).
- [ ] **Case Insensitive Test**: Lowercase category returned `409 Conflict`.
- [ ] **Space Normalization**: Padded category returned `409 Conflict`.
- [ ] **List Categories**: `GET /api/v1/categories` returned array with `expense_count`.
- [ ] **Create Expense**: Logged expense with `{{category_id}}`, status `201 Created`.
- [ ] **Validation Test 1**: Future expense date returned `422 Unprocessable Entity`.
- [ ] **Validation Test 2**: Invalid payment mode returned `422 Unprocessable Entity`.
- [ ] **List Expenses**: `GET /api/v1/expenses` returned paginated transactions.
- [ ] **Create Budget**: Set monthly budget goal, status `201 Created`.
- [ ] **Budget Status**: `GET /api/v1/budgets/status` returned spent and remaining amounts.
- [ ] **Dashboard Summary**: `GET /api/v1/dashboard/summary` returned metrics and top categories.
- [ ] **CSV Export**: `GET /api/v1/expenses/export/csv` downloaded valid CSV.
- [ ] **Delete Cleanup**: Verified DELETE on expense, budget, and category.
