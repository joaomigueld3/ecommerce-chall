You are working in this existing repository, which currently contains a Node.js/Express backend for an e-commerce API.

Before coding, inspect the repo to understand available endpoints, auth behavior, and how to run the backend locally.

Task:
Build a **basic but functional Next.js frontend** for this backend, focused on core user flows only.

Scope (intentionally simpler than the previous task):
1) Create a new Next.js app inside this repository (for example in `frontend/`).
2) Implement these pages:
   - `/login` (email/password form)
   - `/products` (list products from API)
   - `/cart` (show selected items)
   - `/checkout` (submit order)
3) Implement a minimal authentication flow:
   - login request to backend,
   - store token in localStorage,
   - include token in authenticated API requests,
   - redirect unauthenticated users to `/login`.
4) Product and cart behavior:
   - fetch and render product list,
   - allow adding/removing items in cart,
   - allow changing quantity,
   - prevent quantity below 1.
5) Checkout behavior:
   - send order payload in the backend-expected format,
   - display success/failure message,
   - clear cart on success.

Technical requirements:
- Use Next.js (App Router preferred).
- Use plain React state/context for cart/auth (no Redux required).
- Keep UI simple and clean; no need for a design system.
- Add a small API client layer so backend base URL is configured via env var.
- Add basic loading and error states on all API-dependent pages.

Validation requirements:
- Provide exact local run steps for both backend and frontend.
- Provide a short manual test checklist proving each flow works:
  1. login success and failed login;
  2. product list loads;
  3. add/remove/update cart items;
  4. checkout success path;
  5. checkout failure path (e.g., invalid token or API error).

Constraints:
- Do not remove or rewrite backend business logic.
- Do not add external paid services.
- Keep changes focused and avoid over-engineering.

Deliverables:
- Frontend code in the repository.
- README section (or separate frontend README) with setup and run instructions.
- Brief summary of architecture decisions and what was tested manually.
