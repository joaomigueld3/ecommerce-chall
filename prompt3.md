You are continuing work in this same repository. A basic Next.js frontend already exists in `frontend/` and currently includes login, products, cart, and checkout flows.

Before coding, inspect the existing frontend structure and identify what is currently flat, duplicated, or hard to maintain.

Task:
Continue building the frontend and **reorganize files/folders into a cleaner scalable structure** without breaking current functionality.

Primary goals:
1) Keep all existing flows working (`/login`, `/products`, `/cart`, `/checkout`).
2) Reorganize the frontend into clear layers/modules.
3) Add two useful new screens for this app.

Required implementation:

1. Frontend reorganization (required)
- Refactor `frontend/` into a clear structure (example: `src/app`, `src/components`, `src/features`, `src/lib`, `src/hooks`, `src/context`, `src/types` if needed).
- Group code by feature where it makes sense (auth, products, cart, checkout).
- Remove obvious duplication and centralize shared helpers.
- Keep import paths clean and consistent.
- Update README/docs to reflect the new structure.

2. Continue building frontend (required)
Add these pages:
- `/orders`
  - list user-visible orders (or all available orders if backend constraints require it),
  - show basic fields (id, status, date, total),
  - include loading, empty, and error states.
- `/orders/[orderId]`
  - show order summary/details,
  - render items and totals clearly,
  - handle not found and API errors gracefully.

3. UX and app shell improvements (required)
- Create a consistent app layout with navigation links for Login/Products/Cart/Checkout/Orders.
- Keep route protection coherent (unauthenticated users redirected to `/login` where appropriate).
- Add simple reusable UI primitives/components for states (e.g., Loading, ErrorMessage, EmptyState).

4. API and state organization (required)
- Keep using env-based API base URL.
- Split API calls into feature-oriented modules instead of one monolithic file (if currently monolithic).
- Preserve current auth token behavior and cart persistence.

5. Non-breaking constraints
- Do not remove existing pages or downgrade current behavior.
- Do not rewrite backend business logic.
- Do not add heavy state libraries (keep React Context/hooks).

Validation requirements:
- Run and report frontend checks (at least `npm run lint` and `npm run build` in `frontend/`).
- Provide a short manual verification checklist covering:
  1) existing flows still work,
  2) orders list page works,
  3) order details page works,
  4) route protection behavior,
  5) error/empty states.

Deliverables:
- Refactored frontend code with improved folder/file organization.
- New `/orders` and `/orders/[orderId]` pages.
- Updated `frontend/README.md` documenting the new architecture and run/validation steps.
