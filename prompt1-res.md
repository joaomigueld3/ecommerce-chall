# Order Lifecycle Implementation — Summary

Implementation complete. Summary of the deliverable:

## New endpoints (wired in `OrderRoutes.js`, same auth/validation/controller→service→repository style)
- `POST /api/orders/checkout` — atomic multi-item checkout, server-side pricing only, optional `Idempotency-Key` header
- `PATCH /api/orders/:orderId/status` — strict state machine, 409 on invalid transitions
- `POST /api/orders/:orderId/cancel` — transactional cancel + full stock restoration, total preserved
- `GET /api/orders/:orderId/summary` — items, recomputed vs persisted total, `consistent` flag + warning on mismatch

## Key design points (full detail in `docs/order-workflow.md`)
- **Transactions/locking**: checkout, cancel and status changes each run in one Sequelize transaction; product rows are locked with `SELECT … FOR UPDATE`, locks acquired in sorted `productId` order to prevent deadlocks — concurrent checkouts cannot oversell.
- **State machine**: enforced centrally in `OrderService.assertStatusTransition`; `Delivered`/`Cancelled` are terminal; per your choice, the legacy `PUT /orders/:orderId` and `PUT /orders/update-status/:orderId` now also validate transitions; `PATCH … status=Cancelled` routes through the full cancel flow so stock is always reconciled.
- **Idempotency**: `table_idempotency_keys` (new migration + model + repository), unique `(key, client_id)`, payload SHA-256 hash, stored response replayed with `Idempotency-Replayed: true`; same key + different payload → 409. Record is written inside the checkout transaction, so concurrent retries can't double-create.
- **Normalization (documented choice)**: duplicate `productId`s are **merged** (quantities summed); quantity must be integer ≥ 1; empty `items` rejected; money computed in integer cents.
- **Migrations**: `20260523180000-add-cancelled-to-order-status.cjs`, `20260523180100-create-idempotencyKey.cjs`.

## Pre-existing bugs fixed (called out explicitly)
1. App couldn't boot here: `AllRoutes.js` import case mismatch + removed `assert { type: 'json' }` syntax (Node ≥ 22) — both fixed in `src/index.js`/`src/swagger.js`.
2. Wrong associations: `Order.hasMany(OrderItem)` keyed on `itemId` and `Client.hasMany(Order)` keyed on `orderId` — corrected.
3. Racy stock flow in `POST /order-items` (check-then-decrement, no transaction) — now transactional with a row lock; insufficient stock returns 409 instead of 500.

## Verification
Per your choice, nothing was executed against a live DB. The automated suite is in `test/order-workflow.test.js` (`npm test`, built-in `node --test`, zero new dependencies) — it spawns the API, seeds data, and covers all 9 required scenarios including a 10-way concurrent checkout against stock 5 (expects exactly 5 successes, final stock 0). The runbook with the required `.env`/`src/config/database.js` (both gitignored) contents, migration command, and expected output (`tests 9, pass 9, fail 0`) is in `docs/order-workflow.md`. All changed files pass `node --check`; eslint was not run since `node_modules` isn't installed and the repo's `linebreak-style: windows` rule conflicts with its own LF files.
