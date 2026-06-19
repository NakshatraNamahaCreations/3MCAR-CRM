# Car Workshop CRM & Workshop Management System

Full-stack workshop CRM: **MongoDB + Mongoose + Express (REST API)** backend and a **React + Vite + Tailwind** admin panel. JWT auth with role-based access (Admin, Manager, Technician, Service Advisor, Accountant, HR). Single-workshop — no multi-tenant, subscription, or platform-admin layers.

## Workflow covered
Enquiry → Followup → Quote → Quote Accept (auto-creates Customer + Vehicle + draft Appointment) → Job Card → Technician assignment → Product/PPF usage → Completion (stock deducts) → Invoice → Payment (split supported) → Delivery (blocked until paid). Plus Inventory, PPF tracking, Expenses, Petty Cash, full HR (Employees, Attendance, Salary, Advance, Leave), Dashboard, and Reports.

## Prerequisites
- Node.js 18+
- A MongoDB instance (local `mongod` or Atlas)

## Backend
```bash
cd backend
npm install
cp .env.example .env        # set MONGO_URI and a strong JWT_SECRET
npm run seed                # creates admin -> admin@workshop.com / Admin@123
npm run dev                 # http://localhost:5000  (REST under /api/*)
```

### Tests (use in-memory Mongo, no setup needed)
```bash
node test/pipeline.test.mjs  # full CRM->delivery pipeline (29 checks)
node test/hr.test.mjs        # HR + petty cash (10 checks)
node test/http.test.mjs      # real HTTP stack (8 checks)
```

## Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api -> :5000)
```
Log in with the seeded admin. Sidebar menu items are filtered by role.

## Structure
```
backend/src
  config/        db connection
  models/        23 Mongoose schemas
  services/      business logic (incl. conversionService for quote->customer)
  controllers/   thin request handlers
  routes/        per-module routers + index.js
  middlewares/   auth (JWT), role, error
  utils/         invoice/salary/stock/ppf/attendance/pettyCash helpers, number generator, seed
frontend/src
  api/           axios instance + per-module API wrappers
  components/    common UI kit, layout (sidebar/topbar), DataTable
  context/       AuthContext
  routes/        navConfig + ProtectedRoute
  pages/         21 feature pages + Login
```

## API response format
```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "...", "error": {} }
```
