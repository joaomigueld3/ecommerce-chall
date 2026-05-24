Implementation complete. Full architecture note is in `docs/order-lifecycle.md`; here's the condensed version.

## What was built

**Endpoints** (under `/api/orders`, behind the existing JWT middleware, existing routes untouched):
- `POST /orders/checkout` — atomic multi-item checkout, server-side pricing only
- `PATCH /orders/:orderId/status` — strict state machine, 409 on illegal transitions
- `POST /orders/:orderId/cancel` — transactional cancel + full stock restoration, total preserved
- `GET /orders/:orderId/summary` — items, recomputed vs persisted total, `consistent` flag + `warning` on mismatch

**Key design choices**
- **Concurrency**: product rows are locked with `SELECT … FOR UPDATE` in ascending `productId` order (deadlock-safe), and stock is decremented with a guarded `UPDATE … WHERE quantity_in_stock >= :qty` — the DB itself refuses to go negative even if a future code path skips the lock.
- **Duplicates**: duplicate `productId`s in a payload are **merged** (quantities summed). Empty arrays and non-positive/fractional quantities → 400.
- **State machine** (`src/entities/orderStatus.js`): `Received → In Preparation → Dispatched → Delivered`, with `Cancelled` reachable only from the first two. Enforced on the new PATCH route, the legacy PUT routes, and cancel. `Delivered`/`Cancelled` are terminal.
- **Idempotency**: `Idempotency-Key` header → `table_idempotency_keys` with unique `(key, client_id)`, SHA-256 payload hash, and a stored response snapshot. Retry → 200 replay; same key + different payload → 409. The record is written inside the checkout transaction, so a racing duplicate rolls back its own order and replays the winner's response.
- **Migrations**: `Cancelled` enum value + the idempotency table, following the existing `.cjs` conventions.

**Pre-existing bugs found and fixed** (called out per requirement 12):
1. `src/index.js` couldn't boot on your machine — `AllRoutes.js` import casing (file is `allRoutes.js`) and the removed `assert { type: 'json' }` syntax (Node ≥ 22 rejects it).
2. Wrong association FKs: `Order→OrderItem` used `itemId`, `Client→Order` used `orderId`, `User→Client` used `clientId`. All eager loads were broken.
3. Oversell race in the legacy `POST /order-items` flow — non-transactional read-check-write on stock. Now a transaction + guarded atomic decrement.

## Verification

Per your choice, nothing was executed against a live DB. `scripts/verify-order-lifecycle.js` (`npm run verify:orders`) is a deterministic script covering all 9 required scenarios (plus validation and summary checks) with exact assertions — including the concurrency test (stock 5, two parallel checkouts of 3 → exactly one 201, one 409, final stock 2). The runbook and expected output are in `docs/order-lifecycle.md`. Note the project's `npm run lint` was already failing with ~2,150 pre-existing `linebreak-style` errors before any of these changes; I didn't touch that.

If you later spin up a Postgres for this project, I can run the script and hand you the actual transcript.
