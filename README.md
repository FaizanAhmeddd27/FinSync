# 🏦 FinSync
> Enterprise-grade Digital Banking Platform with Real-time Analytics, AI Assistance & Fraud Detection

## 🔐 Security (Enterprise-Grade)

**Authentication:** bcryptjs (12 rounds) • JWT + refresh tokens • OAuth (Google/GitHub) • 2FA (Email OTP + SMS)

**Authorization:** Role-based (user/admin) • Row-Level Security (RLS) • Resource ownership checks • Admin endpoints

**Network:** HTTPS/TLS • CORS • Helmet.js headers • Rate limiting • Parameterized queries (no SQL injection)

**Data Protection:** Immutable append-only ledger • ACID transactions • Field encryption • Anonymized logs • PII compliance

**Audit & Logging:** Complete action trail • User/admin tracking • Financial logging • Error context • Compliance reports

**Fraud Prevention:** Real-time monitoring • Velocity analysis • Amount anomalies • Location tracking • Auto-blocking

**Compliance:** 
  - Detailed transaction history
  - Categorized spending
  - Visual charts and graphs
  - Export functionality
- **Analytics Dashboard**:
  - Income vs Expense comparison
  - Pie charts for category breakdown
  - Monthly trend analysis
  - Year-over-year comparisons

### 📈 Investment & Portfolio Management
- **Portfolio Tracking**:
  - Stocks (real-time quotes)
  - Bonds (YTM calculations)
  - Crypto (blockchain integration)
  - Mutual Funds (NAV tracking)
  - Fixed Deposits (automated interest)
- **Performance Metrics**:
  - Gain/Loss calculations
  - ROI percentage
  - Dividend tracking
  - Distribution analysis
- **Risk Assessment**:
  - Risk categorization (Low/Medium/High)
  - Diversification analysis
  - Portfolio rebalancing suggestions

### 🔐 Security & Access Control
- **Authentication Methods**:
  - Email/Password (bcrypt hashed)
  - OAuth 2.0 (Google, GitHub)
  - Session management
  - JWT tokens
- **Two-Factor Authentication**:
  - Email OTP verification
  - SMS 2FA via Twilio
  - Time-based one-time passwords
- **Row-Level Security (RLS)**:
  - Fine-grained database access
  - User-specific data isolation
  - Admin role management
- **Audit Logging**:
  - Every action tracked
  - Metadata capture (IP, device, timestamp)
  - Complete audit trail
  - Compliance reporting

### 📱 User Experience
- **QR Code Integration**:
  - QR generation for quick payments
  - QR scanning for transfers
  - Dynamic QR encoding
- **Real-Time Notifications**:
  - Transaction alerts
  - Fraud warnings
  - Budget limit notifications
  - System announcements
  - OTP delivery notifications
- **Responsive Design**:
  - Mobile-first layout
  - Desktop optimization
  - Tablet support
  - Progressive enhancement
- **Dark Mode Support**:
  - Theme context system
  - Persistent preferences
  - Smooth transitions

### 🏢 Admin Features
- **User Management**:
  - Account approval/rejection
  - User suspension/activation
  - RoleRole assignment
  - Profile verification
- **System Monitoring**:
  - KYC verification workflow
  - Fraud alert review
  - Transaction oversight
  - System health dashboard
- **Report Generation**:
  - User activity reports
  - Transaction summaries
  - Fraud statistics
  - Revenue analytics

### 🔄 Advanced Features
- **QR-based Transfers**: Peer-to-peer payments via QR codes
- **Search Functionality**: Global search across transactions, users, and accounts
- **Currency Conversion**: Real-time rates with historical tracking
- **Email Notifications**: Transactional emails with templates
- **Document Upload**: KYC document storage in Supabase
- **PDF Statements**: Auto-generated financial documents

---

## 🛠️ Technology Stack

### **Backend Architecture**
```
Language:           TypeScript / JavaScript (Node.js)
Runtime:            Node.js 18+
Framework:          Express.js 5.x
Package Manager:    npm / yarn
```

### **Database & Storage**
```
Primary DB:         PostgreSQL 15+ (via Supabase)
Object Storage:     Supabase Storage (AWS S3 backed)
Cache Layer:        Redis (Upstash)
## ✨ Features at a Glance

### 🛡️ Core Banking
- Immutable append-only ledger with full audit trail
- ACID multi-account transfers (race condition safe)
- Multi-currency support with real-time rates
- Account types: Savings, Checking, Wallet, Fixed Deposits
- Auto-generated PDF statements

### 🤖 Intelligence & Detection  
- **AI Chatbot** (Groq): Financial queries & budget recommendations
- **Fraud Engine**: Velocity analysis, amount anomalies, location tracking
- Predictive spending trends & risk scoring

### 💰 Financial Management
- Smart budgeting with real-time alerts
- Expense tracking & categorization
- Income vs Expense dashboards with visualizations
- Year-over-year comparisons

### 📈 Investments
- Portfolio tracking (Stocks, Bonds, Crypto, Mutual Funds, Fixed Deposits)
- Live gain/loss & ROI calculations
- Risk categorization & diversification analysis

### 🔐 Security (Enterprise-Grade)
- **Auth**: OAuth (Google, GitHub) + Email/Password (bcrypt)
- **2FA**: Email OTP + SMS via Twilio
- **Access**: Row-Level Security (RLS) + Role-based control
- **Audit**: Complete immutable action logging with metadata

### 📱 User Experience
- QR code generation & scanning for fast transfers
- Real-time notifications (transactions, fraud alerts, budget limits)
- Dark mode with persistent preferences
- Fully responsive (mobile, tablet, desktop)

### **Backend Structure (`/backend`)**
```
backend/
## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React/Vite)                      │
│                   Deployment: Vercel                        │
└──────────────────────┬──────────────────────────────────────┘
           │ HTTPS + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│ Express.js API (Render.com) + Auth + Rate Limit + CORS      │
│ Controllers → Services → Database / External APIs           │
└──────────────────────┬──────────────────────────────────────┘
           │
  ┌──────────────┼──────────────┐
  │              │              │
   PostgreSQL        Redis          External
   (Supabase)       (Cache)   (Groq, Twilio, Email)
```

### Request Flow:
Client → Auth Middleware → Validation → Controller → Service → DB → Response

### Transfer Data Flow:
User Request → Frontend Validation → **JWT Auth** → **Rate Limit** → **Balance Check** → **Fraud Detection** → **ACID DB Transaction** (lock accounts, update balance, create ledger, record transfer) → **Notifications** (email, SMS, in-app) → **Cache Invalidation** → **Response**
│   │
│   └── utils/                          # Utility functions
│       ├── constants.ts               # App constants
│       ├── errors.ts                  # Custom error classes
│       ├── helpers.ts                 # Helper functions
│       ├── logger.ts                  # Logging utility
│       └── upload.ts                  # File upload helpers
│
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
└── check_balances.js                   # Balance checking cron job
```

### **Frontend Structure (`/frontend`)**
```
frontend/
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Main App component
│   ├── App.css                         # Global styles
│   ├── index.css                       # Base CSS
│   │
│   ├── assets/                         # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/                     # Reusable components
│   │   ├── animations/                # GSAP/Framer Motion animations
│   │   ├── chatbot/                   # AI chatbot UI
│   │   ├── common/                    # Shared components
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── ...
│   │   ├── dashboard/                 # Dashboard components
│   │   ├── layout/                    # Layout wrappers
│   │   └── ui/                        # UI primitives (buttons, inputs, modals)
│   │
│   ├── context/                        # React Context
│   │   └── ThemeContext.jsx           # Dark/Light theme
│   │
│   ├── hooks/                          # Custom React hooks
│   │   ├── useDebouncedDimensions.js
│   │   └── useScreenSize.js
│   │
│   ├── lib/                            # Utility libraries
│   │   ├── api.js                     # Axios instance & endpoints
│   │   └── utils.js                   # Helper functions
│   │
│   ├── pages/                          # Page components
│   │   ├── OAuthCallback.jsx          # OAuth redirect handler
│   │   ├── Accounts/                  # Account pages
│   │   │   ├── AccountList.jsx
│   │   │   ├── AccountDetail.jsx
│   │   │   └── CreateAccount.jsx
│   │   ├── Admin/                     # Admin dashboard
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UserManagement.jsx
│   │   │   └── FraudAlerts.jsx
│   │   ├── Auth/                      # Authentication pages
## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript / Node.js 18+ |
| **Backend** | Express.js 5.x |
| **Frontend** | React 19 + Vite 7 |
| **Database** | PostgreSQL 15+ (Supabase) |
| **Cache** | Redis (Upstash) |
| **Storage** | Supabase (AWS S3) |
| **Auth** | JWT + OAuth (Google, GitHub) + bcryptjs |
| **AI/LLM** | Groq SDK |
| **Styling** | Tailwind CSS v4 |
| **State Mgmt** | Zustand |
| **Charts** | Recharts |
| **Animations** | Framer Motion, GSAP |
| **Notifications** | Sonner + Socket.io |
| **SMS/Email** | Twilio + Nodemailer |
| **PDF** | PDFKit |
| **Deploy** | Render (backend) + Vercel (frontend) |
- `status` (active/frozen/closed)
## 📁 Folder Structure

### **Backend** (`/src`)
- **config/** - Environment, OAuth, Redis, Supabase setup
- **controllers/** - 16 modules (auth, accounts, transfers, budgets, fraud, investments, etc.)
- **services/** - 10 core services (AI, Auth, Fraud, Currency, Email, OTP, PDF, SMS, Storage, Cron)
- **routes/** - API endpoint definitions (16 route files)
- **middleware/** - Auth, error handling, rate limiting, validation
- **database/** - schema.sql + migration runner
- **types/** - TypeScript definitions
- **utils/** - Constants, errors, helpers, logger, upload

### **Frontend** (`/src`)
- **pages/** - 16+ page modules (Auth, Dashboard, Accounts, Transfers, Budgets, Investments, Fraud, Admin, etc.)
- **components/** - Reusable UI (animations, chatbot, common, dashboard, layout, ui primitives)
- **hooks/** - Custom React hooks (screen size, debounce)
- **stores/** - Zustand state management
- **context/** - Theme provider (dark/light mode)
- **lib/** - Axios API client & utilities
- **assets/** - Images, icons, fonts
GET    /investments/portfolio     - Portfolio summary
GET    /investments/performance   - Performance metrics
GET    /investments/allocations   - Asset allocation chart
```

### **Fraud (`/api/fraud`)**
```
GET    /fraud/alerts              - Fraud alerts list
PUT    /fraud/alerts/:id/resolve  - Mark alert as resolved
GET    /fraud/statistics          - Fraud stats dashboard
POST   /fraud/report              - Report suspicious activity
```

### **Notifications (`/api/notifications`)**
```
GET    /notifications             - User notifications
PUT    /notifications/:id/read    - Mark as read
DELETE /notifications/:id         - Delete notification
PUT    /notifications/read-all    - Mark all as read
```

### **Dashboard (`/api/dashboard`)**
```
GET    /dashboard/overview        - Dashboard metrics
GET    /dashboard/charts          - Chart data
GET    /dashboard/insights        - AI insights
GET    /dashboard/trends          - Spending trends
```

### **Currency (`/api/currency`)**
```
GET    /currency/rates            - Exchange rates
POST   /currency/convert          - Convert amount
GET    /currency/supported        - Supported currencies
```

### **ChatBot (`/api/chatbot`)**
```
POST   /chatbot/message           - Send message
GET    /chatbot/history           - Conversation history
```

### **Admin (`/api/admin`)**
```
GET    /admin/users               - All users
GET    /admin/users/:id           - User details
PUT    /admin/users/:id/kyc       - Approve/reject KYC
PUT    /admin/users/:id/suspend   - Suspend user
GET    /admin/transactions        - All transactions
GET    /admin/fraud-alerts       - System fraud alerts
```

### **Other**
```
GET    /search                    - Global search
POST   /qr/generate               - Generate QR codes
GET    /statements/:id            - Statement document
POST   /statements/email          - Email statement
```

---

## 🎨 Frontend Pages & Components

### **Authentication Pages**
- **Login**: Email/password + OAuth options (Google, GitHub)
- **Register**: User signup with email verification
- **Forgot Password**: Password reset flow
- **2FA Verification**: OTP entry for two-factor auth
- **OAuth Callback**: Redirect handler for OAuth signin

### **Dashboard Pages**
- **Main Dashboard**: 
  - Account summary cards
  - Recent transactions
  - Spending charts (pie, bar, line)
  - Quick action buttons
  - AI Insights widget
  ## 📡 API Endpoints (60+ endpoints)

  | Module | Endpoints |
  |--------|-----------|
  | **Auth** | register, login, logout, google, github, request-otp, verify-otp, refresh-token, me |
  | **Accounts** | list, get, create, update, delete, balance, ledger |
  | **Transfers** | list, create, get, cancel, verify-otp, qr/generate, qr/scan |
  | **Transactions** | list, get, export/csv, export/pdf |
  | **Budgets** | list, create, update, delete, analytics, insights |
  | **Investments** | list, create, update, delete, portfolio, performance, allocations |
  | **Fraud** | alerts/list, alerts/resolve, statistics, report |
  | **Notifications** | list, read, delete, read-all |
  | **Dashboard** | overview, charts, insights, trends |
  | **Currency** | rates, convert, supported |
  | **ChatBot** | message, history |
  | **Admin** | users/list, users/detail, users/kyc, users/suspend, transactions, fraud-alerts |
  | **Other** | search, qr/generate, statements, statements/email |
- Velocity analysis (rapid transactions)
- Amount anomaly detection
- Location tracking
- Pattern recognition
- Machine learning predictions
- Alert severity calculation
- Fraud rule engine

### **AI Service** (`ai.service.ts`)
- Groq LLM API integration
- Financial query processing
## 📱 Frontend Pages (16+ Modules)

| Category | Pages |
|----------|-------|
| **Auth** | Login, Register, Forgot Password, 2FA, OAuth Callback |
| **Dashboard** | Overview, Charts, AI Insights, Spending Trends |
| **Accounts** | List, Detail, Create, Settings |
| **Transactions** | History, Detail, Export (CSV/PDF/Email) |
| **Transfers** | List, Create, QR Scan/Generate, Confirmation |
| **Budgets** | List, Create, Analytics, Budget vs Actual Charts |
| **Investments** | Portfolio, Add, Performance, Allocations, Dividend Tracker |
| **Fraud** | Alerts List, Alert Details, Resolution |
| **Admin** | Dashboard, User Management, KYC Approval, Fraud Analysis |
| **Settings** | Profile, Security, Preferences, Devices, API Keys |
| **Other** | Landing, Notifications, Statements, Chatbot |
## 🔧 Core Services (10 services)

| Service | Key Responsibilities |
|---------|----------------------|
| **Auth** | JWT generation, bcrypt hashing, session, OAuth, permissions |
| **Fraud** | Risk scoring, velocity analysis, anomaly detection, ML predictions |
| **AI** | Groq LLM integration, financial queries, contextual responses |
| **Currency** | Real-time rates, Redis caching, conversion, validation |
| **Email** | Template rendering, Nodemailer, SMTP, bulk sending |
| **OTP** | 6-digit code generation, expiration, rate limiting, 2FA |
| **PDF** | Statement generation, PDFKit rendering, formatting |
| **SMS** | Twilio integration, templating, delivery tracking |
| **Storage** | File upload (Supabase), validation, access control |
| **Cron** | Scheduled tasks (interest, statements, rate updates) |

2. **Environment Configuration**
```bash
cp .env.example .env.local
```

Add:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

3. **Start Development Server**
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

4. **Build for Production**
```bash
npm run build
# Outputs to dist/
```

### **Running Tests**

**Backend:**
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
```

**Frontend:**
```bash
npm run test              # Run test suite
```

---

## 🚀 Deployment

### **Backend Deployment (Render.com)**

1. **Create Render Account** and connect GitHub
2. **Create New Web Service**
   - Connect GitHub repository
   - Set Runtime: Node.js
   - Set Build Command: `npm install && npm run build`
   - Set Start Command: `npm start`
   - Auto-deploy: Enabled
   
3. **Set Environment Variables** in Render dashboard
   - Copy all `.env` variables
   - Add production values

4. **Deploy**
   - Push to main branch
   - Render auto-deploys
   - View logs in dashboard

### **Frontend Deployment (Vercel)**

1. **Create Vercel Account** and import project
2. **Configure Project**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output: `dist`
   
3. **Set Environment Variables**
   - `VITE_API_BASE_URL` = your Render backend URL
   
4. **Auto-Deploy**
   - Push to main to trigger deployment
   - Automatic HTTPS and CDN

### **Database (Supabase)**
- Already hosted (no additional setup required)
- Automatic backups
- Point-in-time recovery

### **Redis (Upstash)**
- Fully managed cloud Redis
- Connection string in environment variables
- Auto-scaling

---

## 🛠️ Development Workflow

### **Project Scripts**
## ⚡ Quick Start

**Prerequisites:** Node 18+ • Supabase • Redis/Upstash • Git

### Backend
```bash
git clone <repo> && cd backend
npm install
cp .env.example .env  # Add: SUPABASE_URL, JWT_SECRET, GOOGLE/GITHUB keys, etc.
npm run db:migrate
npm run dev  # Runs on localhost:5000
```
## 🚀 Deployment

### **Backend** → Render.com
1. Create account, connect GitHub repo
2. Create Web Service
  - Runtime: Node.js
  - Build: `npm install && npm run build`
  - Start: `npm start`
3. Add environment variables in dashboard
4. Push to main → Auto-deploys

### **Frontend** → Vercel
1. Create account, import GitHub repo
2. Framework: Vite | Build: `npm run build` | Output: `dist`
3. Set `VITE_API_BASE_URL` to Render backend URL
4. Push to main → Auto-deploys with HTTPS + CDN

### **Database** (Supabase)
Fully hosted PostgreSQL • Auto backups • Point-in-time recovery

### **Cache** (Upstash)
Managed Redis • Connection string in env vars • Auto-scaling

