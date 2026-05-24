Two new screens (Product Admin, Profile), a `node --test` baseline for the backend, and a Jest + React Testing Library baseline for the frontend. All checks pass: **backend 17/17 tests, frontend 9/9 tests, lint clean, build clean (10 routes)**.

## 1. New frontend pages

- **`/admin/products`** — create / edit / delete products against the existing `POST/PUT/DELETE /products` endpoints. One form serves both create and edit (Edit pre-fills it), the list refetches after every mutation, deletes ask for confirmation, and success/error feedback comes from the API response. Behind the same `RequireAuth` guard; linked from the header as "Admin".
- **`/profile`** — loads `GET /users/:id` using the id stored at login, lets the user edit **name** and **email** (the only fields `PUT /users/:id` accepts), and patches the stored user so the header email updates immediately. Linked from the header (the email itself is the link).
- Both reuse the existing feature-module pattern: `features/products/api.js` gained the mutation calls, `features/profile/api.js` is new, and `AuthContext` gained a small `patchUser()`.

## 2. Backend tests — `npm test` (root, `node --test`, no DB required)

- `test/orderStatus.test.js` — 5 unit tests of the order-status state machine (allowed transitions, cancellation rules, terminal states, unknown statuses).
- `test/orderService.test.js` — 7 unit tests of `OrderService` business rules against in-memory repository stubs: duplicate-product merging + server-side pricing, insufficient stock → 409 with nothing persisted, unknown product → 404, invalid status transition → 409, summary consistency flag.
- `test/api.routes.test.js` — 5 integration-style tests that mount the **real Express routers** on an ephemeral port and assert the HTTP contract: missing token → 400, invalid login payload → 400 with the project error shape, checkout with empty items / zero quantity / client-sent price → 400. (Full DB-backed flows remain covered by `scripts/verify-order-lifecycle.js`.)

**Result: 17 tests, 17 pass.**

## 3. Frontend tests — `cd frontend && npm test` (Jest via `next/jest` + RTL)

- `CartContext.test.js` — merging repeated additions, the quantity floor of 1 (0, negative, garbage input), removal/clearing, localStorage persistence.
- `RequireAuth.test.js` — redirects to `/login` with no token; renders protected content with one.
- `app/products/page.test.js` — integration-like: renders the page against a mocked `fetch`, asserts the bearer token is sent, out-of-stock products are disabled, add-to-cart updates the UI and localStorage, and the error → retry → success path works.

**Result: 3 suites, 9 tests, all pass.**

## Pre-existing blocker found and fixed

`jsonwebtoken → jwa → buffer-equal-constant-time` dereferences `SlowBuffer.prototype` at import time, and `SlowBuffer` no longer exists in Node 25 — **the backend could not even be imported on this machine** (every published version of that transitive package is affected). Fixed with an npm `overrides` entry pointing at `vendor/buffer-equal-constant-time/` — a drop-in shim with the identical public API that uses `crypto.timingSafeEqual` and guards the `SlowBuffer` access. No backend source code changed. Revert by removing the `overrides` block and the `vendor/` folder if you'd rather pin Node ≤ 22.

## Validation summary

| Command | Result |
| --- | --- |
| `npm test` (root) | 17/17 pass |
| `cd frontend && npm test` | 9/9 pass (3 suites) |
| `cd frontend && npm run lint` | No warnings or errors |
| `cd frontend && npm run build` | Compiles; 10 routes (`/admin/products` and `/profile` added) |

Browser flows still require the backend + Postgres running — the manual checklist in `frontend/README.md` now covers the admin and profile pages (items 9 and 10) alongside the existing flows. Run commands are documented in both READMEs.
