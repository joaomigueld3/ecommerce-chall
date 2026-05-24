# Order Lifecycle: Architecture Note

## New endpoints (all under `/api`, JWT-authenticated like the rest of the API)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/orders/checkout` | Atomic multi-item checkout with server-side pricing. Optional `Idempotency-Key` header. |
| `PATCH` | `/orders/:orderId/status` | Strict status transition (409 on anything not allowed). |
| `POST` | `/orders/:orderId/cancel` | Transactional cancellation + full stock restoration. |
| `GET` | `/orders/:orderId/summary` | Order + items + recomputed vs persisted total + consistency flag. |

All pre-existing routes keep working; layering (route → controller → service → repository) is unchanged.

## Transaction boundaries

* **Checkout** (`OrderService.checkout`) runs in a single Sequelize managed transaction:
  idempotency record insert → client check → product row locks + stock validation → order insert →
  order-item inserts → stock decrements → idempotency record completion. Any failure (missing product,
  insufficient stock, FK error, unique-key conflict) rolls back every write — no partial orders, items
  or stock changes can ever be observed.
* **Cancellation** (`OrderService.cancelOrder`) runs in one transaction: lock order row → validate state →
  lock product rows → restore stock → set status `Cancelled`. The order `total` is intentionally untouched
  so the financial history stays accurate.
* **Status change** (`OrderService.changeOrderStatus`) runs in a transaction with the order row locked
  (`SELECT ... FOR UPDATE`) so a concurrent cancel/status change cannot interleave.
* The legacy `POST /order-items` flow was also moved inside a transaction (see "Bugs found and fixed").

## Locking strategy (oversell protection)

* Product rows are read with `SELECT ... FOR UPDATE` (`transaction.LOCK.UPDATE`) before stock is checked
  and decremented. Two concurrent checkouts for the same product serialize on the row lock: the second
  one re-reads the already-decremented stock after the first commits, so stock can never go negative.
* Checkout items are normalized and **sorted by `productId`** before locking, so concurrent multi-item
  checkouts always acquire locks in the same order — this prevents deadlocks.
* Cancellation uses the same per-product locking when restoring stock.

## Status state machine

```
Received ──> In Preparation ──> Dispatched ──> Delivered
   │               │
   └──────────────┴──────────> Cancelled
```

* Enforced centrally in `OrderService.assertStatusTransition`; every other transition returns **409 Conflict**.
* `Delivered` and `Cancelled` are terminal.
* `PATCH /orders/:orderId/status` with `"Cancelled"` is routed through the full cancellation flow (stock restore),
  so there is no way to mark an order cancelled without reconciling inventory.
* The legacy `PUT /orders/:orderId` and `PUT /orders/update-status/:orderId` now also validate the transition when
  the status changes (agreed behavior change). Their Joi schemas intentionally do **not** accept `Cancelled`,
  so cancellation always goes through the transactional cancel path.

## Idempotency design

* Optional `Idempotency-Key` request header on `POST /orders/checkout` (1–255 chars).
* Stored in `table_idempotency_keys` with a unique constraint on `(idempotency_key, client_id)` plus a SHA-256
  hash of the normalized payload (`clientId` + merged/sorted items) and the original response (status + JSONB body).
* Behavior:
  * Same key + equivalent payload → the original `201` body is replayed (response header `Idempotency-Replayed: true`),
    no new order, no double stock decrement.
  * Same key + different payload → **409 Conflict**.
* The record is inserted **inside** the checkout transaction, so it only becomes visible if the order committed and
  there are never half-written idempotency records. A concurrent duplicate blocks on the unique index, gets a
  unique-constraint error after the winner commits, is rolled back completely, and then replays the winner's response.

## Input normalization (documented choice)

* Duplicate `productId` entries in a checkout payload are **merged** into one line item (quantities summed).
  This keeps payload hashing deterministic for idempotency and avoids two stock decrements for the same row.
* `quantity` must be an integer ≥ 1, `items` must be a non-empty array, `clientId` a positive integer (Joi).
* Prices, subtotals and totals are **never** read from the request — always loaded from `table_products`
  inside the transaction and computed in integer cents to avoid float drift.

## Schema additions / migrations

| Migration | Change |
| --- | --- |
| `20260523180000-add-cancelled-to-order-status.cjs` | Adds `Cancelled` to the `enum_table_orders_status` Postgres enum. |
| `20260523180100-create-idempotencyKey.cjs` | Creates `table_idempotency_keys` (key, client FK, request hash, order FK, stored response, timestamps, unique `(idempotency_key, client_id)`). |

New model `IdempotencyKey` + `IdempotencyKeyRepository`, registered in `src/database/index.js`.

## Bugs found and fixed (pre-existing)

1. **Boot failures on Linux/modern Node** — `src/index.js` imported `AllRoutes.js` (file is `allRoutes.js`; case-sensitive
   filesystems fail) and used the removed `assert { type: 'json' }` import syntax (rejected by Node ≥ 22). Both fixed.
2. **Wrong associations** — `Order.hasMany(OrderItem, { foreignKey: 'itemId' })` → `orderId`;
   `Client.hasMany(Order, { foreignKey: 'orderId' })` → `clientId`; `Order.clientId` reference key fixed.
3. **Racy stock flow in `POST /order-items`** — stock check and decrement were two separate non-transactional steps
   (oversell possible). Now wrapped in a transaction with a `FOR UPDATE` lock; insufficient stock returns 409 instead of 500.
4. Known remaining gaps (not changed, out of scope): legacy `POST /orders` still trusts a client-sent `total`
   (use `/orders/checkout` instead — the summary endpoint flags such inconsistencies); deleting an order item does not
   restore stock; the auth middleware's Client-role allowlist compares `req.originalUrl` without the `/api` prefix,
   so `Client`-type users are effectively denied these routes (Admin tokens work).

## HTTP status codes

| Case | Status |
| --- | --- |
| Validation error (Joi) | 400 |
| Unknown client / product / order | 404 |
| Insufficient stock | 409 |
| Invalid status transition / cancel not allowed | 409 |
| Idempotency key reused with different payload | 409 |
| Successful checkout | 201 |
| Status change / cancel / summary | 200 |

Error body shape follows the project standard: `{ success: false, message, errorName }`.

## Verification

> Live execution was intentionally skipped in this environment (no database was provisioned, by request).
> The automated suite below is deterministic and reproduces all required evidence.

### Automated test suite — `test/order-workflow.test.js` (run with `npm test`)

Covers, in order:

1. Successful checkout with 2 distinct items (server-computed total `80.97`, stock decremented).
2. Duplicate `productId` entries merged into one line item.
3. Insufficient stock → 409 and full rollback (no order, no items, stock untouched).
4. Invalid transition `Received → Delivered` → 409.
5. Valid chain `Received → In Preparation → Dispatched → Delivered`, terminal state frozen, summary `consistent: true`.
6. Cancellation → 200, stock restored, total preserved, second cancel → 409.
7. Idempotency-Key retry → same order replayed (`Idempotency-Replayed: true`), no duplicate, no double decrement.
8. Same Idempotency-Key with different payload → 409.
9. 10 concurrent checkouts against stock 5 → exactly 5 succeed, 5 rejected, final stock exactly 0 (no oversell).

### How to run it

```sh
npm install

# 1. Postgres (port 5432 must be free, or adjust .env accordingly)
docker compose up -d

# 2. .env (gitignored) — based on .env.example
#    PORT=9095, HOST_LOCAL=localhost, USERNAME_DB_LOCAL=postgres,
#    PASSWORD_LOCAL=123456, DATABASE_LOCAL=<a dedicated *test* database>,
#    JWT_SECRET / JWT_SECRET_REFRESH / EMAIL_SECRET = any strings,
#    GMAIL_USER / GMAIL_PASS = dummies (not used by the suite)

# 3. src/config/database.js (gitignored, required by .sequelizerc and src/database/index.js):
#    import dotenv from 'dotenv';
#    dotenv.config({ path: '.env' });
#    export default {
#      dialect: 'postgres',
#      host: process.env.HOST_LOCAL,
#      username: process.env.USERNAME_DB_LOCAL,
#      password: process.env.PASSWORD_LOCAL,
#      database: process.env.DATABASE_LOCAL,
#      define: { timestamps: true, underscored: true },
#    };
#    (sequelize-cli also needs a CommonJS copy or `module.exports` variant if it cannot load ESM —
#     `module.exports = { dialect: 'postgres', host: ..., ... }` works for both when named database.cjs is not used.)

# 4. Migrations, then the suite (it spawns the API itself)
npx sequelize-cli db:migrate
npm test          # the suite refuses to run unless the DB name contains "test" or ALLOW_DB_WIPE=1
```

Expected output: `tests 9, pass 9, fail 0` from the `node --test` runner.

> The suite **wipes** users/clients/products/orders/order-items/idempotency tables — point it at a dedicated test database.

### Manual spot-check (equivalent curl calls)

```sh
TOKEN=...   # from POST /api/login with a confirmed Admin user

# checkout (expect 201, total computed server-side)
curl -s -X POST localhost:9095/api/orders/checkout \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"clientId":1,"items":[{"productId":1,"quantity":2},{"productId":2,"quantity":3}]}'

# invalid transition (expect 409)
curl -s -X PATCH localhost:9095/api/orders/1/status \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"Delivered"}'

# cancel (expect 200 + restoredItems, stock back)
curl -s -X POST localhost:9095/api/orders/1/cancel -H "Authorization: Bearer $TOKEN"

# summary (expect consistent: true)
curl -s localhost:9095/api/orders/1/summary -H "Authorization: Bearer $TOKEN"

# idempotent retry (run twice: same orderId both times, second has Idempotency-Replayed: true)
curl -si -X POST localhost:9095/api/orders/checkout \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-1' \
  -d '{"clientId":1,"items":[{"productId":1,"quantity":1}]}'
```
