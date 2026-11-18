# Ecommerce Platform

## 📌 Overview
RESTful API (Node.js / Express / PostgreSQL / Sequelize) and Next.js frontend for **Ecommerce Platform**, providing authentication, user roles, product filtering, simulated payment, order management, and SQL+CSV sales reports.

---

## 🏗 Tech Stack
- **Backend:** Node.js, Express, PostgreSQL, Sequelize, Joi, JWT, Swagger (OpenAPI)
- **Frontend:** Next.js 16 (App Router), React 19
- **Infra / Quality:** Docker Compose (with persistent volume), ESLint, Node Test Runner, Jest + React Testing Library

---

## 🚀 Installation & Local Setup

### 1️⃣ Install Dependencies
```sh
npm install
cd frontend && npm install && cd ..
```

### 2️⃣ Configure Environment Variables
Create `.env` from `.env.example`:
```sh
cp .env.example .env
```

### 3️⃣ Start PostgreSQL (Persistent Volume), Run Migrations & Seed Demo Data
```sh
docker compose up -d
npm run migrate
npm run seed
```
- **pgAdmin 4 (optional on-demand DB GUI, profile `tools`):**
  ```sh
  docker compose --profile tools up -d pgadmin
  # stop when finished:
  docker compose stop pgadmin
  ```
  Access `http://localhost:5050` (`admin@ecommerce.com` / `admin`; register server with host `db`, port `5432`, database `sqldocker`, user `postgres`, password `123456`).
Demo accounts created by `npm run seed`:
- **Admin:** `admin@loomi.dev` / `Admin@1234`
- **Client:** `client@loomi.dev` / `Client@1234`

### 4️⃣ Run Backend & Frontend
```sh
# Terminal 1 — Backend API (http://localhost:9095) & Swagger (http://localhost:9095/api-docs)
npm run swagger
npm run dev

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend && npm run dev
```

---

## 🛠 Implemented Features

### 🔐 Authentication & RBAC
- Public routes: `POST /api/login`, `POST /api/signin` (Client signup), `GET /api/confirmation/:token`, `GET|POST /api/refresh-token`.
- All other `/api/*` routes require JWT authentication.
- **Client role:** browse/filter products, manage own user & client profile, place orders, simulate payment, cancel eligible orders, view own orders.
- **Admin role:** unrestricted access to users, clients, products, order status updates, and sales reports.

### 📦 Products & Filters
- Full CRUD (`GET/POST/PUT/DELETE /api/products`) with `category`.
- Multi-criteria filtering via `GET /api/products` query params or `POST /api/products/filters` (`productName`, `category`/`categories`, `minPrice`, `maxPrice`, `available`).

### 📋 Orders, Simulated Payment & Inventory
- Atomic idempotent checkout (`POST /api/orders/checkout` with optional `Idempotency-Key`) creating `Pending Payment` orders with server-side pricing.
- Simulated payment (`POST /api/orders/:orderId/payment` with `{ action: "confirm" | "deny" }`): confirming locks and debits product stock transactionally and moves status to `Received`; denying cancels without touching stock.
- Strict order state machine (`Pending Payment -> Received -> In Preparation -> Dispatched -> Delivered`, plus transactional cancellation with stock restoration).

### 📊 Custom Sales Reports (SQL + CSV)
- `POST /api/reports` executes parameterized SQL aggregation by period/filters, generates a sanitized `.csv` file in `storage/reports/`, and persists the report in `table_sales_reports`.
- Full CRUD on `/api/reports` plus CSV download via `GET /api/reports/:reportId/download`.

### 🖥 Frontend Routes (`frontend/`)
- `/login`, `/register` (with 1-click portfolio email confirmation), `/confirm-email/[token]`
- `/products` (multi-filter catalog), `/products/[productId]`
- `/cart`, `/checkout` (idempotent checkout + simulated payment actions)
- `/orders` (status/date/client filters), `/orders/[orderId]` (payment simulation, cancel, Admin status progression)
- `/profile` (user info, password change, own Client profile)
- `/admin/products`, `/admin/clients`, `/admin/users`, `/admin/reports` (RBAC-protected)

---

## 🧪 Tests & Lint
```sh
# Backend
npm run lint
npm run test:unit       # account, order/payment, and report service unit tests (no DB)
npm run test:contract   # Express route auth & validation contracts (no DB)
npm run test:e2e        # full workflow against dedicated test DB (DATABASE_LOCAL=*test*)

# Frontend
cd frontend
npm run lint
npm test
npm run build
```
