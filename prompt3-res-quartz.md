Frontend reorganized under `frontend/src/` with feature modules, plus two new screens: `/orders` and `/orders/[orderId]`. `npm run lint` and `npm run build` both pass. Full architecture docs in `frontend/README.md`.

## What was flat / duplicated before

- Everything sat at the package root (`app/`, `components/`, `context/`, `lib/`) with no `src/` and no feature grouping.
- `lib/api.js` was a monolith mixing auth, products, clients, and checkout calls.
- The fetch-on-mount + loading/error/retry pattern was hand-rolled in the products page and would have been copy-pasted into both orders pages.
- Loading / error / empty JSX and `R$ x.toFixed(2)` formatting were repeated inline across pages.
- 401 handling (logout + redirect) existed only on the products page.

## New structure

```
frontend/src/
  app/            routes only (login, products, cart, checkout, orders, orders/[orderId])
  components/
    layout/       Header (nav: Products / Cart / Checkout / Orders, badge, logout)
    ui/           Loading, ErrorMessage, EmptyState, StatusBadge
  features/
    auth/         AuthContext, RequireAuth guard, login API
    cart/         CartContext (localStorage, quantity floor of 1)
    products/     api.js
    checkout/     api.js (checkout + client lookup)
    orders/       api.js (list + summary)
  hooks/          useApiQuery — data/loading/error/reload + central 401 handling
  lib/            apiClient (env base URL, bearer token, ApiError), format helpers
```

All imports use the `@/` alias (`jsconfig.json` → `./src`). Pages never call `fetch` directly: page → `features/*/api.js` → `lib/apiClient.js`.

## New screens

- **`/orders`** — every order visible to the account (the API has no per-user scoping, which is noted in the UI), newest first, showing id, status badge, date, and total; each row links to the detail page. Loading / empty / error-with-retry states.
- **`/orders/[orderId]`** — uses `GET /orders/:id/summary`: order metadata, item lines (product, quantity, unit price, subtotal), recomputed vs persisted totals with a consistency warning banner when they diverge. 404 renders a dedicated "Order not found" state; other API errors get the standard error + retry.

## Other improvements

- Header now links to all five sections; checkout confirmation links straight to the new order's detail page.
- Real lint setup: `eslint-config-next` (`next/core-web-vitals`) + `npm run lint` script; `outputFileTracingRoot` pinned so the backend's lockfile doesn't confuse Next.
- No behavior was removed: login, products, cart, and checkout work exactly as before, just recomposed from the new modules.

## Validation

```
npm run lint   → ✔ No ESLint warnings or errors
npm run build  → ✓ Compiled successfully; 7 routes (orders/[orderId] dynamic, rest prerendered)
```

Manual checklist (in `frontend/README.md`): existing flows, orders list, order details (including `/orders/999999` → not found and `/orders/abc` → clear error), route protection on all five protected routes, and error/empty states. Not executed end-to-end here because it requires the backend + Postgres running.
