You are continuing in the same repository. The frontend already has login, products, cart, checkout, orders list, and order details.

Before coding, inspect current backend and frontend tests (if any) and identify the fastest path to add high-value coverage without large rewrites.

Task:
Finish the most important missing frontend capabilities for this e-commerce app and add a **minimal but real** automated test baseline for both backend and frontend.


Scope to implement:

1) Continue frontend with key backend capabilities (required)
- Add a simple **Product Admin** page for authenticated users:
  - create product,
  - edit product,
  - delete product,
  - refresh list after mutations.
- Add a simple **Profile** page for current user:
  - load current user data (`/users/:id` from token id),
  - update editable fields through existing endpoint.
- Keep route protection consistent with existing auth guard.
- Keep UI simple (forms + table/list + messages), no design-system work.

2) Backend tests (required, lightweight)
- Add/extend tests with Node's built-in test runner (`node --test`) and existing project style.
- Implement:
  - at least 2 **unit tests** for pure business behavior (e.g., order status transition guard, payload normalization helper, or validation helper behavior),
  - at least 1 **integration-style API test** hitting a real route path and asserting HTTP status/response contract.
- Reuse existing test setup conventions; do not introduce heavy new dependencies.

3) Frontend tests (required, lightweight)
- Add minimal test setup if missing (Jest + React Testing Library, or Vitest if already present).
- Implement:
  - at least 2 **unit/component tests** (example: cart quantity behavior, auth guard redirect logic, or UI state components),
  - at least 1 **integration-like test** for a page flow with mocked API (example: products list load + mutation feedback).
- Keep test setup concise; do not over-engineer.

4) Documentation and validation
- Update `frontend/README.md` and/or root README with exact commands to run backend and frontend tests.
- Run and report these commands (or closest equivalents):
  - backend tests,
  - frontend tests,
  - `frontend` lint/build.
- If something cannot run due to environment limitations, document exactly what failed and why.

Constraints:
- Do not break existing pages/routes.
- Do not rewrite backend architecture.
- Do not add paid/external services.

Deliverables:
- Working frontend additions (Product Admin + Profile).
- Minimal backend unit/integration tests.
- Minimal frontend unit/integration tests.
- Clear run instructions and verification summary.
