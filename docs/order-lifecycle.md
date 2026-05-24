# Order Lifecycle: Architecture Note

## New endpoints (all under `/api`, JWT-authenticated)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/orders/checkout` | Atomic multi-item checkout with server-side pricing |
| `PATCH` | `/orders/:orderId/status` | Strict status transition |
| `POST` | `/orders/:orderId/cancel` | Transactional cancellation + stock restoration |
| `GET` | `/orders/:orderId/summary` | Order + items + recomputed vs persisted total |

All existing routes are preserved.

## Transaction boundaries

- **Checkout** (`OrderService.checkout`) runs inside a single `sequelize.transaction()` covering: client existence check, product row locks, stock validation, order insert, order-item inserts, guarded stock decrements, and the idempotency record insert. Any failure (missing product, insufficient stock, constraint violation) rolls back every write — no partial orders, no partial stock decrements.
- **Cancellation** (`OrderService.cancelOrder`) runs in one transaction: lock the order row, verify it is cancellable, restore stock for every item, flip status to `Cancelled`. The persisted `total` is never modified, so the financial record stays historically accurate.
- **Status change** (`OrderService.changeStatus`) locks the order row (`SELECT … FOR UPDATE`) before validating the transition, so two concurrent transitions cannot both read the same "from" state.
- The legacy `POST /order-items` flow was also wrapped in a transaction (it previously created the item and then decremented stock in two unrelated statements).

## Locking / oversell-prevention strategy

Two complementary mechanisms:

1. **Pessimistic row locks** — checkout locks all referenced product rows with `SELECT … FOR UPDATE` (`ProductRepository.findAllByIdsForUpdate`), always ordered by ascending `productId` to prevent deadlocks between competing checkouts. A second checkout touching the same product blocks until the first commits, then re-reads the *post-commit* stock.
2. **Guarded atomic decrement** — stock is decremented with a single conditional `UPDATE … SET quantity_in_stock = quantity_in_stock - :qty WHERE product_id = :id AND quantity_in_stock >= :qty`. If the guard matches 0 rows the transaction aborts. Even if the row lock were bypassed by a future code path, the database itself refuses to drive stock negative.

Cancellation acquires product locks implicitly via the atomic `UPDATE` increments, also applied in ascending `productId` order, so it cannot deadlock against checkout.

## Input normalization (documented choice)

**Duplicate `productId` entries in a checkout payload are merged** into a single line item with the summed quantity (`normalizeItems` in `OrderService`). Normalization sorts by `productId`, which also makes the idempotency request hash order-independent. Quantities must be integers `> 0` and the items array must be non-empty (Joi, 400 otherwise). Client-sent prices/totals are not accepted by the schema; all monetary values are computed from the current DB price inside the transaction.

## Status state machine

Defined in `src/entities/orderStatus.js`:

```
Received ──► In Preparation ──► Dispatched ──► Delivered (terminal)
   │                │
   └──► Cancelled ◄─┘                          Cancelled (terminal)
```

Any other transition returns **409 Conflict**. The state machine is enforced in three places so it cannot be bypassed: `PATCH /orders/:orderId/status`, the legacy `PUT /orders/:orderId` / `PUT /orders/update-status/:orderId` (only when the payload changes `status`), and `POST /orders/:orderId/cancel`. A `PATCH` to `Cancelled` routes through the cancellation logic so stock is always restored regardless of which endpoint triggered the cancellation.

## Idempotency design

- Optional `Idempotency-Key` request header on `POST /orders/checkout`.
- Stored in `table_idempotency_keys` with a **unique constraint on `(idempotency_key, client_id)`**, the SHA-256 hash of the normalized payload, the resulting `order_id`, and a snapshot of the success response.
- Retry with the same key + equivalent payload → **200** with the original response (`idempotentReplay: true`), no new order, no double stock decrement.
- Same key + different payload → **409**.
- The record is inserted **inside the checkout transaction**. If two requests race on the same key, the loser hits the unique constraint at commit, its entire transaction (including its duplicate order) rolls back, and the winner's stored response is replayed.

## Schema additions

| Migration | Change |
| --- | --- |
| `20260523000001-add-cancelled-status-to-orders.cjs` | Adds `Cancelled` to `enum_table_orders_status` |
| `20260523000002-create-idempotencyKey.cjs` | Creates `table_idempotency_keys` (+ unique `(idempotency_key, client_id)`) |

## Pre-existing bugs found and fixed

1. **`src/index.js` could not boot on this machine** — it imported `AllRoutes.js` (the file is `allRoutes.js`; case-sensitive on Linux) and used the removed `assert { type: 'json' }` import-assertion syntax (rejected by Node ≥ 22). Both fixed.
2. **Wrong association foreign keys** — `Order.hasMany(OrderItem, { foreignKey: 'itemId' })` → `orderId`; `Client.hasMany(Order, { foreignKey: 'orderId' })` → `clientId`; `User.hasOne(Client, { foreignKey: 'clientId' })` → `userId`. These broke any eager-loaded include.
3. **Oversell race in the legacy stock flow** — `OrderItemService.createOrderItem` did a non-transactional read-check-write (`SELECT` stock, compare, `UPDATE` to an absolute value). Two concurrent requests could both pass the check and drive stock negative. Replaced with a transaction + guarded atomic decrement. `ProductService.updateProductQuantity` no longer writes an absolute value computed from a stale read.

## Verification

No test framework exists in the project, so verification is a deterministic script that exercises the real API against a real Postgres: `scripts/verify-order-lifecycle.js`.

### Runbook

```sh
# 1. Postgres (the project compose binds 5432)
docker compose up -d db

# 2. .env (copy .env.example) — at minimum:
#    PORT=9095  HOST_LOCAL=localhost  USERNAME_DB_LOCAL=postgres
#    PASSWORD_LOCAL=123456  DATABASE_LOCAL=sqldocker  JWT_SECRET=...  JWT_SECRET_REFRESH=...

# 3. Schema
npx sequelize-cli db:migrate

# 4. API
npm run dev

# 5. In another shell
npm run verify:orders
```

### Scenarios covered and expected output

```
Verifying against http://localhost:9095/api
Seeded clientId=<N> products=[A, B, S]

  PASS  1. successful checkout with 2 distinct items
  PASS  2. duplicate productIds are merged into a single line item
  PASS  3. insufficient stock rolls back the entire checkout
  PASS  3b. empty items array and quantity <= 0 are rejected with 400
  PASS  4. invalid status transition returns 409
  PASS  5. valid transitions Received -> In Preparation -> Dispatched -> Delivered
  PASS  6. cancellation restores stock and is terminal
  PASS  6b. summary reports recomputed vs persisted total
  PASS  7. idempotency key retry returns the original order, no duplicate
  PASS  8. idempotency key reused with a different payload returns 409
  PASS  9. two concurrent checkouts cannot drive stock negative

11/11 scenarios passed.
```

The script exits non-zero if any scenario fails. Scenario 9 creates a product with stock 5 and fires two concurrent checkouts of 3 units each: exactly one must return 201, the other 409, and the final stock must be exactly 2.
