# FinTrack — AI Features Overview & Documentation

FinTrack integrates an enterprise-grade, privacy-first **Multi-Model Universal AI Engine** supporting **Google Gemini**, **OpenAI GPT-4o**, and **Anthropic Claude 3.5 Sonnet** with zero-failure local NLP fallbacks.

Below is the complete summary of all AI-powered capabilities implemented in FinTrack.

---

## 1. 📷 Smart Receipt & Invoice Vision Scanner (OCR)

### 📌 Overview
Enables users to digitize physical receipts, paper restaurant/grocery bills, and UPI payment screenshots (*Google Pay, PhonePe, Paytm, CRED, BHIM*) instantly.

### ⚙️ How It Works
1. User uploads an image (`.png`, `.jpg`, `.jpeg`, `.webp`, `.pdf`).
2. Vision AI parses the document layout, extracts text and tabular structures.
3. Automatically identifies:
   - **Merchant / Store Name**: e.g., *"Starbucks Coffee"*, *"D-Mart"*, *"HP Petrol Pump"*.
   - **Total Monetary Amount (INR)**: Validated positive decimal.
   - **Transaction Date**: YYYY-MM-DD (with relative date resolution; guards against future dates).
   - **Payment Mode**: Detects `upi`, `card`, or `cash`.
   - **Matching Category**: Automatically links the expense to the user's existing categories.
4. Returns an interactive pre-filled confirmation card where users can verify and edit before saving.

### 🔗 Technical Details
- **API Endpoint**: `POST /api/v1/ai/scan-receipt` (Multipart form-data)
- **Frontend Component**: `frontend/src/components/expenses/ReceiptScannerModal.jsx`
- **Backend Service**: `AIService.scan_receipt` (`backend/app/services/ai_service.py`)

---

## 2. ⚡ AI Quick-Add & Voice Expense Parser (with Auto-Category Allocation)

### 📌 Overview
Allows users to log expenses in seconds by typing natural language phrases or speaking via Web Speech voice input, without filling out complex multi-field forms.

### ⚙️ How It Works
- **Examples**:
  - *"Spent 350 on Uber to office via UPI today"* ➔ `₹350.00` | `Transportation` | `UPI` | `Today`
  - *"Dinner at Barbeque Nation 2450 on credit card yesterday"* ➔ `₹2,450.00` | `Food & Dining` | `Card` | `Yesterday`
  - *"Paid 12000 electricity bill through bank transfer"* ➔ `₹12,000.00` | `Bills & Utilities` | `Bank Transfer`
- **Smart Category Auto-Allocation**:
  - Semantic keyword matching across 9 universal Indian expense domains (*Food & Dining, Transportation, Groceries, Bills & Utilities, Shopping, Entertainment, Health & Medical, Education, Personal Care*).
  - If a matched category does not exist in the user's account, **it is automatically created in the database and allocated on the fly**.
- **Interactive Quick Card**:
  - Previews parsed values with an interactive category selector dropdown and one-click **"Save Expense"**.
- **Resilient Fallback**:
  - Built-in regex and local NLP engine guarantees instant parsing even if the external LLM provider experiences throttling.

### 🔗 Technical Details
- **API Endpoint**: `POST /api/v1/ai/parse-expense`
- **Frontend Component**: `frontend/src/components/expenses/AIQuickInput.jsx`
- **Backend Service**: `AIService.parse_natural_language_expense` (`backend/app/services/ai_service.py`)

---

## 3. 💬 AI Personal Financial Advisor (Interactive Chatbot)

### 📌 Overview
An intelligent conversational copilot grounded in the user's **live financial ground truth** (monthly spend velocity, category rankings, overspending alerts, budget caps, and recent transactions).

### ⚙️ How It Works
- Provides grounded, actionable financial advice using Markdown formatting with Indian Rupee (`₹`) citations.
- **Example Queries**:
  - *"How much did I spend this month vs last month?"*
  - *"Am I on track with my monthly dining budget?"*
  - *"Give me 3 specific tips to cut my spending on Groceries by ₹2,000."*
  - *"What were my highest 3 expenses recently?"*
- Features one-click suggestion chips, Web Speech voice recording, and conversation history context (last 8 turns).
- **Grounded Fallback Protection**: If LLM connectivity drops, the chatbot automatically generates a live financial snapshot from database statistics.

### 🔗 Technical Details
- **API Endpoint**: `POST /api/v1/ai/chat`
- **Frontend Component**: `frontend/src/components/ai/AIChatAdvisorModal.jsx` & `AIFloatingTrigger.jsx`
- **Backend Service**: `AIService.chat_with_advisor` (`backend/app/services/ai_service.py`)

---

## 4. 🔮 Predictive Spending Forecast & Anomaly Detection

### 📌 Overview
A proactive cash flow forecasting engine that projects month-end spending trajectories, detects statistical anomalies, and calculates safe daily allowances.

### ⚙️ How It Works
1. **Month-End Spend Velocity Projection**:
   - Calculates daily spending run-rate and forecasts total spend by the last calendar day of the month.
   - Compares trajectory against historical baseline and overall budget limit.
2. **Category Risk Classification**:
   - Evaluates each category run-rate as `Low`, `Medium`, or `High` risk (`within_budget`, `at_risk`, or `exceeded`).
3. **Statistical Anomaly & Spike Detection**:
   - Identifies outlier transactions exceeding `> 2.5x` the 30-day mean transaction value with plain-English explanations (e.g., *"3.4x above your typical dining expense"*).
4. **🎯 Safe Daily Allowance**:
   - Computes recommended maximum daily spend (`₹/day`) for remaining days in the month to stay strictly within budget.
5. **Proactive AI Tips**:
   - Generates 3 strategic suggestions for cash flow optimization.

### 🔗 Technical Details
- **API Endpoint**: `GET /api/v1/ai/forecast`
- **Frontend Component**: `frontend/src/components/dashboard/AIForecastCard.jsx`
- **Backend Service**: `AIService.get_spending_forecast` (`backend/app/services/ai_service.py`)

---

## 5. 🎭 Financial Mood Mascot & Sentiment Avatar ("Finny")

### 📌 Overview
A dynamic, expressive dashboard companion that reflects the user's real-time financial health through reactive emojis, speech bubbles, and bilingual commentary.

### ⚙️ How It Works
- **5 Dynamic Sentiment States**:
  - 🥳 **Celebratory & Thriving** (*Spent < 60% of budget*): *"You're crushing your savings goals!"*
  - 😌 **Content & On-Track** (*Spent 60% – 85% of budget*): *"Healthy pacing, everything looks good."*
  - 😬 **Cautious & Warning** (*Spent 85% – 100% of budget*): *"Approaching your budget ceiling! Watch discretionary expenses."*
  - 😱 **Alarmed & Over-Budget** (*Spent > 100% of budget*): *"Budget exceeded! Tap me for recovery tips."*
  - 🤔 **Curious & Prompting** (*No budget set*): *"Set a budget so I can track your financial health!"*
- **Interactive Features**:
  - **Financial Health Score Meter** (0% – 100%).
  - **Interactive Pokes**: Clicking the avatar triggers random motivational quotes and tips.
  - **🌐 Bilingual Toggle**: Switch seamlessly between **मराठी (Marathi)** and **English** dialogues.

### 🔗 Technical Details
- **Frontend Component**: `frontend/src/components/dashboard/FinancialMoodAvatar.jsx`
- **Integration**: Mounted in the hero section of `frontend/src/pages/DashboardPage.jsx`.

---

## 🛡️ Privacy & Architecture Principles
- **No Direct Database Access**: React communicates strictly with PostgreSQL via FastAPI REST endpoints.
- **Provider Agnostic**: Switch between Gemini, OpenAI, and Claude via `AI_PROVIDER` without code modifications.
- **Strict Multi-Tenant Isolation**: AI prompts and context queries are strictly scoped to `current_user.id`.
- **Zero Inline Styles**: All UI components use Tailwind CSS glassmorphic tokens and design variables.
