You are working in an existing Node.js + Express + Sequelize e-commerce backend.

Before writing code, inspect the repository structure and the current flow for orders, order-items, products, auth middleware, and validation/error patterns. Then implement a production-grade order lifecycle with transactional checkout, reservation-like stock protection, and cancellation/reconciliation behavior.

Goal:
Design and implement a robust order workflow that supports:
- atomic multi-item checkout,
- safe inventory updates under concurrency,
- strict order status transitions,
- full stock restoration on cancellation,
- and auditable consistency guarantees between order total and order items.

Requirements:

1) New Endpoints (Authenticated)
- Add endpoints under existing /api routes for:
  - POST /orders/checkout
  - PATCH /orders/:orderId/status
  - POST /orders/:orderId/cancel
  - GET /orders/:orderId/summary
- Keep compatibility with existing route style and middleware.

2) Checkout Payload and Server-Side Pricing
- Checkout request body must include:
  - clientId
  - items: array of { productId, quantity }
- Do not trust any client-sent price, subtotal, or total values.
- Load current product prices from DB and compute all monetary fields server-side.

3) Atomic Transactional Checkout
- Implement checkout as a single DB transaction covering:
  - order creation,
  - order-item creation,
  - stock decrement,
  - final order total persistence.
- If any product is missing or has insufficient stock, rollback everything.
- No partial writes are allowed.

4) Concurrency Safety / Oversell Protection
- Implement a stock update strategy that is safe under concurrent checkout attempts.
- Use transaction-safe locking or equivalent Sequelize-supported mechanism.
- Demonstrate in verification that two competing checkouts cannot drive stock negative.

5) Input Normalization Rules
- For duplicated productId entries in the same checkout payload, either:
  - reject with 400 and clear message, OR
  - merge duplicates into a single effective line item.
- Choose one behavior and document it.
- Quantity must be integer > 0.
- Empty items array must be rejected.

6) Order Status State Machine (Strict)
- Enforce allowed transitions only:
  - Received -> In Preparation
  - In Preparation -> Dispatched
  - Dispatched -> Delivered
  - Received -> Cancelled
  - In Preparation -> Cancelled
- All other transitions must fail with 409 Conflict.
- Once Delivered or Cancelled, no further status changes are allowed.

7) Cancellation and Stock Reconciliation
- Implement order cancellation endpoint with business rules:
  - cancellation allowed only from Received or In Preparation,
  - cancellation must be transactional,
  - restore stock for every order item,
  - update order status to Cancelled,
  - preserve financial integrity (order total remains historically accurate).

8) Summary Endpoint
- GET /orders/:orderId/summary must return:
  - order metadata,
  - list of items (productId, quantity, unit price, subtotal),
  - recomputed total,
  - persisted total,
  - consistency flag indicating whether recomputed total matches persisted total.
- If mismatch exists, include a warning field in response.

9) Idempotency Guard (Advanced)
- Add support for an optional Idempotency-Key request header on checkout.
- If the same key is retried for the same client and equivalent payload, return the original successful result instead of creating duplicates.
- If the same key is reused with a different payload, return 409.
- Implement persistence for idempotency records in a way consistent with project architecture.

10) Data Model / Migration Work
- Add or update migrations/models needed for:
  - cancelled status support,
  - idempotency storage,
  - any additional integrity fields you introduce.
- Maintain naming conventions already used in the project.

11) Validation and Error Handling
- Extend Joi validations following existing middleware pattern.
- Use project-consistent error shape and HTTP status codes.
- Business-rule failures should be clear and actionable.

12) Backward Compatibility and Refactor Discipline
- Do not break existing routes unintentionally.
- If you detect current bugs in order/order-item associations or stock flow, fix them as part of this implementation and call them out explicitly.
- Keep layers coherent (controller/service/repository) and avoid leaking DB details into controllers.

Verification Requirements:
- Provide reproducible verification evidence via automated tests (preferred).
- If no test framework exists, add a focused minimal test strategy OR a deterministic manual verification script with exact API calls and expected outputs.
- Must cover at least:
  1. Successful checkout (2+ distinct items).
  2. Duplicate productId behavior (based on your chosen rule).
  3. Insufficient stock causes full rollback.
  4. Invalid status transition returns 409.
  5. Valid status transitions succeed.
  6. Cancellation restores stock correctly.
  7. Idempotency key retry returns same order (no duplicates).
  8. Idempotency key with payload mismatch returns 409.
  9. Concurrent checkout simulation or reasoned proof that overselling is prevented.

Deliverables:
- Code changes and migrations.
- Short architecture note explaining transaction boundaries, locking strategy, state machine enforcement, idempotency design, and any schema additions.
- Explicit validation evidence (test output or detailed manual run transcript).
