# Ecommerce Chall — Frontend

A minimal Next.js (App Router) storefront for the `ecommerce-chall` API: login, product list, cart, checkout, order history, product admin, and profile.

## Stack

- Next.js 15 (App Router), React 19, plain JavaScript
- React Context for auth and cart state (no Redux)
- ESLint via `next/core-web-vitals`
- Jest + React Testing Library (`next/jest`)
- No design system — a single `globals.css`

## Architecture

Code lives under `src/` and is grouped by layer, with feature-specific code under `src/features/<feature>/`:

```
frontend/src/
  app/                     Routes only — each page composes feature + UI modules
    login/page.js
    products/page.js
    cart/page.js
    checkout/page.js
    orders/page.js         order list (id, status, date, total)
    orders/[orderId]/      order summary: items, recomputed vs persisted totals
    admin/products/        product admin: create / edit / delete + list refresh
    profile/page.js        current user profile: load + update name/email
    layout.js              app shell: providers + header + <main>
  components/
    layout/Header.js       nav (Products / Cart / Checkout / Orders / Admin / Profile),
                           cart badge, logout
    ui/                    reusable state primitives: Loading, ErrorMessage,
                           EmptyState, StatusBadge
  features/
    auth/                  AuthContext (token+user in localStorage), RequireAuth
                           route guard, login API call
    cart/                  CartContext (localStorage persistence, quantity >= 1)
    products/api.js        GET/POST/PUT/DELETE /products
    checkout/api.js        POST /orders/checkout, GET /clients (clientId lookup)
    orders/api.js          GET /orders, GET /orders/:id/summary
    profile/api.js         GET/PUT /users/:id
  hooks/
    useApiQuery.js         fetch-on-mount + { data, loading, error, reload };
                           handles 401 by logging out and redirecting to /login
  lib/
    apiClient.js           request() wrapper: base URL from NEXT_PUBLIC_API_URL,
                           bearer token injection, ApiError normalization
    format.js              formatPrice / formatDate
```

Conventions:

- **Imports** always use the `@/` alias (mapped to `./src` in `jsconfig.json`).
- **Pages never call `fetch` directly** — they go through a `features/*/api.js` module, which goes through `lib/apiClient.js`.
- **Loading / error / empty UI** always uses the `components/ui` primitives so every page behaves the same.
- **Route protection**: any page wrapped in `RequireAuth` redirects unauthenticated visitors to `/login` after client-side hydration. `/login` is the only public page.

## Pages

| Route | Behavior |
| --- | --- |
| `/login` | Email/password → `POST /api/login`; token + user stored in localStorage |
| `/products` | Product list, add to cart, out-of-stock handling |
| `/cart` | Quantity controls (floor of 1), remove, totals |
| `/checkout` | Posts `{ clientId, items }`; shows the server-computed total; clears the cart on success |
| `/orders` | All orders visible to the account (the API has no per-user scoping), newest first, linking to details |
| `/orders/[orderId]` | Order metadata, item lines, recomputed vs persisted total with a consistency warning; dedicated not-found state |
| `/admin/products` | Create, edit, and delete products; the list refreshes after every mutation; success/error feedback |
| `/profile` | Loads `GET /users/:id` for the logged-in user; updates name/email via `PUT /users/:id` and keeps the header email in sync |

## Running locally

### 1. Backend

```sh
# from the repository root
docker compose up -d db                 # Postgres on 5432
cp .env.example .env                    # PORT=9095, DB credentials, JWT_SECRET, JWT_SECRET_REFRESH
npx sequelize-cli db:migrate
npm install
npm run dev                             # API on http://localhost:9095
```

You need a **confirmed** user to log in (`table_users.confirmed = true`) and a client row linked to it for checkout. Note: the backend's auth middleware effectively only lets `Admin`-type users through to `/api/products` and `/api/orders/*` (its per-route allowances for `Client` users compare against paths without the `/api` prefix), so test with an Admin user.

### 2. Frontend

```sh
cd frontend
npm install
cp .env.local.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:9095/api
npm run dev                             # http://localhost:3001
```

### Checks

```sh
npm run lint    # next lint (next/core-web-vitals)
npm run build   # production build
npm test        # Jest + React Testing Library
```

## Tests

`npm test` runs Jest (configured through `next/jest`, jsdom environment). Tests live next to the code they cover:

- `src/features/cart/CartContext.test.js` — unit: merging repeated additions, the quantity floor of 1, removal, localStorage persistence.
- `src/features/auth/RequireAuth.test.js` — unit: redirects to `/login` without a token, renders children with one.
- `src/app/products/page.test.js` — integration-like: renders the products page against a mocked `fetch`, asserts the bearer token is sent, adds an item to the cart, and exercises the error + retry path.

Backend tests are run from the repository root with `npm test` (`node --test`).

## Manual verification checklist

| # | Flow | Steps | Expected |
| --- | --- | --- | --- |
| 1a | Login success | `/login` with a confirmed user | Redirect to `/products`, email in header, token in localStorage |
| 1b | Login failure | Wrong password | Red alert with the backend message, no token stored |
| 2 | Products | Visit `/products` logged in | Cards with name, price, stock; add-to-cart updates the header badge |
| 3 | Cart | Add items, use −/+/input, remove | Quantity never drops below 1; totals update; empty state when cleared |
| 4 | Checkout success | Place an order from `/checkout` | Confirmation with order #, server total, "View order" link; cart cleared |
| 5 | Checkout failure | Quantity above stock, or corrupt the token | Backend error shown and the cart is kept; a bad token logs you out to `/login` |
| 6 | Orders list | Visit `/orders` | Rows with id, status badge, date, total, newest first; empty state when there are no orders; error state with Retry if the API is down |
| 7 | Order details | Click an order, then try `/orders/999999` and `/orders/abc` | Items + totals + consistency note for a real order; "Order not found" for 999999; a clear error for a non-numeric id |
| 8 | Route protection | Open `/products`, `/cart`, `/checkout`, `/orders`, `/orders/1`, `/admin/products`, `/profile` logged out | Each redirects to `/login`; after logging in, navigation works without further redirects |
| 9 | Product admin | On `/admin/products`: create a product, edit it, delete it | List refreshes after each mutation; success message shown; API validation errors (e.g. price 0) surface in the red alert |
| 10 | Profile | On `/profile`: change the name and save | Success message; the email/name persist after a reload; the header email updates immediately |

## What was verified vs. not

`npm run lint`, `npm run build`, and `npm test` all pass (all routes compile; `/orders/[orderId]` is a dynamic route, the rest are prerendered; 9 Jest tests green). The browser checklist above was **not** executed end-to-end in this environment because it requires the backend running against Postgres; follow the steps above to reproduce each flow.
