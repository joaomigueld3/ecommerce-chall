# Ecommerce Platform

## 📌 Overview
RESTful API (Node.js / Express / PostgreSQL / Sequelize) and Next.js frontend for **Ecommerce Platform**, built for small-to-medium online stores and developers looking for a full-stack e-commerce + backoffice reference with authentication, user roles, product filtering, simulated payment, order management, and SQL+CSV sales reports.

- **Architecture (As-Is & To-Be):** `docs/architecture.md`
- **Order Workflow & Locking Notes:** `docs/order-workflow.md`
- **Project Backlog & Roadmap:** `BACKLOG.md`

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

- **Optional full-stack Docker demo (profile `full` — starts PostgreSQL, Backend and Frontend together):**
  ```sh
  docker compose --profile full up --build
  ```
Demo accounts created by `npm run seed`:
- **Admin:** `admin@ecommerce.dev` / `Admin@1234`
- **Client:** `client@ecommerce.dev` / `Client@1234`

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
- Public routes: `POST /api/login`, `POST /api/signin` (Client signup), `GET /api/confirmation/:token`, `GET|POST /api/refresh-token`, and public catalog reads (`GET /api/products`, `GET /api/products/categories`, `GET /api/products/:productId`, `POST /api/products/filters`).
- All write/admin/account `/api/*` routes require JWT authentication.
- **Client role:** browse/filter products, manage own user & client profile, place orders, simulate payment, cancel eligible orders, view own orders.
- **Admin role:** unrestricted access to users, clients, products, order status updates, and sales reports.

### 📦 Products, Departments, Filters, Sorting & Pagination
- Full CRUD (`GET/POST/PUT/DELETE /api/products`) with `category` and `GET /api/products/categories` department summary.
- Multi-criteria filtering (`productName`, `category`/`categories`, `minPrice`, `maxPrice`, `available`), sorting (`sortBy`, `sortOrder`) and pagination (`page`, `limit` + `X-Total-Count` headers) across `/products`, `/clients`, `/orders`, `/reports`, and `/users`.

### 📋 Orders, Simulated Payment & Inventory
- Atomic idempotent checkout (`POST /api/orders/checkout` with optional `Idempotency-Key`) creating `Pending Payment` orders with server-side pricing.
- Simulated payment (`POST /api/orders/:orderId/payment` with `{ action: "confirm" | "deny" }`): confirming locks and debits product stock transactionally and moves status to `Received`; denying cancels without touching stock.
- Strict order state machine (`Pending Payment -> Received -> In Preparation -> Dispatched -> Delivered`, plus transactional cancellation with stock restoration).

### 📊 Custom Sales Reports (SQL + CSV)
- `POST /api/reports` executes parameterized SQL aggregation by period/filters, generates a sanitized `.csv` file in `storage/reports/`, and persists the report in `table_sales_reports`.
- Full CRUD on `/api/reports` plus CSV download via `GET /api/reports/:reportId/download`.

### 🖥 Frontend Routes (`frontend/`)
- `/` (Amazon-inspired public storefront homepage with departments, deals and latest arrivals)
- `/products` (public multi-filter, sortable, paginated catalog), `/products/[productId]` (public detail + Buy Box), `/cart` (guest-friendly cart)
- `/login` (with `?next=` redirect), `/register` (with 1-click portfolio email confirmation), `/confirm-email/[token]`
- `/checkout` (idempotent checkout + simulated payment actions)
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

---

## 🗺 Roadmap & Planned Work
Active development plans and future milestones are tracked in [BACKLOG.md](./BACKLOG.md), including:
- **P0 — Storefront & API Foundation:** public catalog access, API pagination/sorting, Amazon-inspired navigation/home, and optional full-stack Docker Compose profile.
- **P1–P2 — Catalog, Social Proof, Inventory & CRM:** hierarchical categories, brands, multi-image/variant products, verified reviews & Q&A, Kardex stock tracking, address book, wallet, and wishlists.
- **P3–P4 — Checkout, Logistics, RMA & BI:** multi-step checkout, coupons, shipping quotes, order status timeline, returns/refunds, executive analytics dashboard, and multi-type SQL/CSV reports.
- **Production Deployment:** serverless API adaptation for Vercel + managed PostgreSQL (`bcryptjs`, `DATABASE_URL` SSL, persisted CSV reports).

---

## 📄 License
Licensed under the [MIT License](./LICENSE).
