# Ecommerce Chall — Frontend

Next.js (App Router) frontend for the `ecommerce-chall` Express API, covering the core user flows:
login, product listing, cart, checkout and order tracking.

## Stack

- Next.js 16 (App Router, JavaScript, Turbopack)
- React 19 with plain `useState` / Context (no Redux)
- Plain CSS (`src/app/globals.css`), no design system
- Feature-oriented API modules on top of a small shared API client (`src/lib/api-client.js`), base URL via env var

## Pages

| Route | Description |
| --- | --- |
| `/login` | Email/password form; stores the JWT in `localStorage`. |
| `/products` | Lists products from `GET /api/products`; add to cart. |
| `/cart` | Shows selected items; change quantity (min 1) or remove. |
| `/checkout` | Sends `POST /api/orders/checkout` with `{ clientId, items }`; shows success/failure; clears the cart on success; links to the created order. |
| `/orders` | Lists orders from `GET /api/orders` (id, status, date, total) with loading/empty/error states. |
| `/orders/[orderId]` | Order details from `GET /api/orders/:orderId/summary`: items, persisted vs recomputed totals, consistency warning, not-found handling. |
| `/admin/products` | Product admin: create, edit and delete products (`POST/PUT/DELETE /api/products`), list refreshed after every mutation. |
| `/profile` | Current user profile: loads `GET /api/users/:id` (id from the login payload) and updates name/email via `PUT /api/users/:id`. |

All pages except `/login` redirect unauthenticated users to `/login`.
The home page `/` redirects to `/products`.

> Note: the backend has no "my orders" filter — `/orders` lists all orders visible to the authenticated user
> (in practice an Admin token, see the seed-data note below).

## Project structure

```
frontend/
  src/
    app/                     # routes only (thin pages)
      layout.js              # app shell: providers + navbar
      providers.js           # AuthProvider + CartProvider composition
      page.js                # redirects to /products
      login/  products/  cart/  checkout/
      orders/                # orders list
      orders/[orderId]/      # order details
      admin/products/        # product admin (create/edit/delete)
      profile/               # current user profile
    components/
      layout/NavBar.js       # navigation (Products, Cart, Checkout, Orders, Admin, Profile, Login/Logout)
      ui/                    # reusable state primitives: Loading, ErrorMessage, EmptyState
    features/                # grouped by feature
      auth/                  # AuthContext, RequireAuth guard, login API call
      cart/                  # CartContext (localStorage persistence)
      products/api.js        # GET/POST/PUT/DELETE /products
      clients/api.js         # GET /clients
      orders/api.js          # checkout, GET /orders, GET /orders/:id/summary
      users/api.js           # GET/PUT /users/:id (profile)
    lib/
      api-client.js          # request() helper, ApiError, NEXT_PUBLIC_API_URL base
      format.js              # formatPrice, formatDate
    __tests__/               # Jest + Testing Library tests
  jest.config.mjs            # next/jest config (jsdom, @/ alias)
  jest.setup.js              # @testing-library/jest-dom
```

Path alias: `@/*` → `./src/*` (see `jsconfig.json`).

## Running locally

### 1. Backend (from the repository root)

```sh
npm install
docker compose up -d                      # PostgreSQL 14 on port 5432
# create .env (see .env.example) and src/config/database.js (see docs/order-workflow.md)
npx sequelize-cli db:migrate
npm run dev                               # API on http://localhost:9095
```

You also need seed data to exercise the flows:

1. A **confirmed** user — `POST /api/signin`, then open the confirmation `url` returned in the response
   (or set `confirmed = true` directly in `table_users`). Use type `Admin`: the current auth middleware
   effectively blocks `Client`-type users on most routes.
2. A client linked to that user — `POST /api/clients` with `{ userId, fullName, contact }`.
3. A few products — `POST /api/products` with `{ productName, price, quantityInStock, description }`.

### 2. Frontend

```sh
cd frontend
npm install
cp .env.local.example .env.local   # optional; defaults to http://localhost:9095/api
npm run dev                        # http://localhost:3000
```

Production build: `npm run build` then `npm start`.
Checks: `npm run lint` and `npm run build`.

### Tests

```sh
# frontend (from frontend/): Jest + React Testing Library, jsdom, mocked API
npm test

# backend (from the repository root): Node's built-in test runner
npm run test:unit       # pure business rules (status state machine, checkout normalization, idempotency hash)
npm run test:contract   # mounts the real /api routes and asserts auth/validation contracts (no database needed)
npm run test:e2e        # full order-workflow suite — requires PostgreSQL + migrations (see docs/order-workflow.md)
```

Frontend test coverage: `CartContext` rules (merge, min quantity 1, totals, clear), `RequireAuth` redirect behavior,
and a products-page flow with a mocked API (list load, add to cart, error + retry + empty state).

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:9095/api` | Base URL of the Express API. |

## Architecture decisions

- **Routes vs features**: `src/app` holds only route-level pages; reusable state, guards and API calls live in
  `src/features/<feature>`, shared helpers in `src/lib`, and presentational primitives in `src/components/ui`.
- **Everything is a client component**: authentication lives in `localStorage`, so pages render client-side
  and guard themselves with `RequireAuth` (`src/features/auth/RequireAuth.js`), which redirects to `/login`.
- **State**: two small React contexts — `AuthContext` (token + user, login/logout, localStorage persistence)
  and `CartContext` (items, add/remove/update with a minimum quantity of 1, totals, localStorage persistence).
- **API layer**: `lib/api-client.js` exposes a single `request()` helper (auth header injection, env-based base URL,
  errors normalized into `ApiError`); each feature exposes its own thin API module on top of it.
- **Checkout payload**: only `{ clientId, items: [{ productId, quantity }] }` is sent — prices and totals are
  computed by the backend. The order details page reuses the backend summary endpoint, including its
  persisted-vs-recomputed total consistency flag.
- **UI states**: `Loading`, `ErrorMessage` (with optional retry) and `EmptyState` are shared primitives used by
  every API-dependent page.

## Manual verification checklist

| # | Flow | Steps | Expected |
| --- | --- | --- | --- |
| 1a | Login success | `/login` with a confirmed user | Redirect to `/products`, navbar shows email + Logout |
| 1b | Login failure | Wrong password | API error message shown, stays on `/login` |
| 2 | Product list | Open `/products` while logged in | Loading state, then products with name, price, stock |
| 3 | Cart operations | Add a product twice, open `/cart`, use `+`/`-`/input, try to go below 1, remove an item | Quantity merges, never drops below 1, totals update, remove works |
| 4 | Checkout success | `/checkout` with items, keep detected client, "Place order" | Success card with order id/status/total, cart emptied, "View order details" opens `/orders/<id>` |
| 5 | Checkout failure | Quantity above stock, or token cleared from `localStorage` | Error message shown, cart **not** cleared |
| 6 | Orders list | Open `/orders` | Loading state, then table with id, status, date, total; empty state when there are no orders |
| 7 | Order details | Open a `Details` link, and also `/orders/999999` | Details show items + consistent totals; unknown id shows "Order not found" with a link back |
| 8 | Product admin | On `/admin/products`: create a product, edit its price, then delete it | Success message after each action and the list refreshes; invalid values (e.g. price 0) show the API error |
| 9 | Profile | On `/profile`: change name/email and save | Success message, navbar email updates, reload shows the persisted values |
| 10 | Route protection | Logout (or clear `localStorage`) and open `/products`, `/cart`, `/checkout`, `/orders`, `/admin/products` or `/profile` directly | Redirect to `/login` |
| 11 | Error states | Stop the backend and open `/products`, `/orders` or `/admin/products` | "Could not reach the API" error with a retry button |

## What was verified in this environment

- `npm run lint` — clean.
- `npm run build` — compiles; all routes prerender (`/orders/[orderId]` is dynamic, as expected).
- `npm test` — 7 Jest tests passing (3 suites: cart context, auth guard, products page with mocked API).
- Backend `npm run test:unit` (7 tests) and `npm run test:contract` (4 tests) — passing.
- Production server smoke test — all routes, including `/admin/products` and `/profile`, return HTTP 200.
- The end-to-end flows against the live API were **not** executed here because no PostgreSQL database was
  provisioned for the backend; use the checklist above once the backend is running with seed data.
