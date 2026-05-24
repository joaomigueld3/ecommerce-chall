Frontend is in `frontend/` — Next.js 15 (App Router), React 19, plain JS, no extra libraries. `npm run build` passes (all routes compile and prerender). Full docs in `frontend/README.md`.

## What was built

| Route | Behavior |
| --- | --- |
| `/login` | Email/password form → `POST /api/login`, stores `token` + `user` in localStorage, redirects to `/products`. Failed login shows the backend's error message. |
| `/products` | Fetches `GET /api/products` with the bearer token. Loading, error + retry, empty, and out-of-stock states. "Add to cart" per product. A 401 clears the session and redirects to `/login`. |
| `/cart` | Lines with −/+/numeric input (clamped to a minimum of 1), remove button, running total, link to checkout. Persisted in localStorage. |
| `/checkout` | Posts `{ clientId, items: [{ productId, quantity }] }` to `POST /api/orders/checkout`. Success → green confirmation with the **server-computed** total and the cart is cleared. Failure → red alert with the backend message and the cart is kept. |

## Architecture decisions

- **API client layer** (`lib/api.js`): single `request()` wrapper — base URL from `NEXT_PUBLIC_API_URL`, attaches `Authorization: Bearer <token>`, normalizes backend errors (`message`/`error`) into an `ApiError` with the HTTP status.
- **Auth** (`context/AuthContext.js` + `components/RequireAuth.js`): token in localStorage, hydrated into context after mount; the guard waits for hydration before redirecting so refreshes on protected pages don't bounce logged-in users.
- **Cart** (`context/CartContext.js`): plain React context persisted to localStorage; `setQuantity` floors at 1.
- **Client ID for checkout**: the backend's checkout needs a `clientId` (a separate table from users, and login doesn't return it). The checkout page auto-discovers it by matching the logged-in user's id against `GET /api/clients`, with a manual input as fallback. No backend changes were made.
- **Ports**: frontend on **3001** (3000 is occupied on this machine), backend examples use **9095**. CORS is already open on the backend.

## Run steps

```sh
# Backend (repo root)
docker compose up -d db
cp .env.example .env        # PORT=9095, DB creds, JWT_SECRET, JWT_SECRET_REFRESH
npx sequelize-cli db:migrate
npm install && npm run dev

# Frontend
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                 # http://localhost:3001
```

You need a **confirmed** user (and in practice an `Admin`-type one — the backend's auth middleware compares `Client`-allowed routes against paths without the `/api` prefix, so `Client` users get 403 on everything; left untouched per the "don't rewrite backend logic" constraint).

## Manual test checklist

1. **Login success / failure** — valid credentials → redirect to `/products`, token in localStorage; wrong password → red alert, no token.
2. **Product list** — loads with spinner → cards; logged-out visit redirects to `/login`.
3. **Cart** — add two products (one twice) → badge shows 3; −/+ updates totals; − disabled at quantity 1; remove deletes the line.
4. **Checkout success** — place order → confirmation with order #, status `Received`, server total; cart cleared; stock reduced.
5. **Checkout failure** — quantity above stock → backend "Insufficient stock…" error shown, cart kept; corrupted token → logged out and redirected to `/login`.

## Verified vs. not

`npm run build` was executed and passes (compilation + prerender of all 5 routes). The browser flows above were **not** executed here because they need the backend + Postgres running (skipped per your earlier choice); the checklist is written to be reproducible step-by-step once both are up.
