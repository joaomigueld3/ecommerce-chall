# Reorganização do Frontend + Telas de Pedidos — Resumo

Reorganização e novas telas concluídas.

## Reorganização (`frontend/src/`)
- **`src/app/`** — só rotas (páginas finas): layout, providers, `/login`, `/products`, `/cart`, `/checkout`, `/orders`, `/orders/[orderId]`.
- **`src/features/`** — código agrupado por feature: `auth/` (AuthContext, RequireAuth, api), `cart/` (CartContext), `products/api.js`, `clients/api.js`, `orders/api.js` (checkout, lista, summary).
- **`src/lib/`** — `api-client.js` (request + ApiError + base URL via `NEXT_PUBLIC_API_URL`) e `format.js` (`formatPrice`/`formatDate`, antes duplicados em 3 páginas).
- **`src/components/`** — `layout/NavBar.js` e primitivas reutilizáveis `ui/Loading`, `ui/ErrorMessage` (com retry), `ui/EmptyState`.
- O `lib/api.js` monolítico foi dividido em módulos por feature; alias `@/*` agora aponta para `./src/*`; diretórios antigos removidos. Nenhuma página existente foi removida nem teve comportamento rebaixado.

## Novas telas
- **`/orders`** — tabela com id, status, data e total (ordenada do mais recente), estados de loading/vazio/erro com retry, link "Details" por pedido. Lista todos os pedidos (o backend não tem filtro "meus pedidos").
- **`/orders/[orderId]`** — usa `GET /orders/:id/summary`: metadados, itens (quantidade, preço unitário, subtotal), total persistido vs recalculado com aviso de inconsistência, estado "Order not found" para id inexistente/inválido e erro com retry.
- Navbar agora tem link **Orders**; checkout com sucesso passou a linkar para os detalhes do pedido criado. Todas as rotas novas protegidas pelo `RequireAuth`.

## Validação executada
- `npm run lint` ✓ limpo · `npm run build` ✓ (todas as rotas; `/orders/[orderId]` dinâmica) · smoke test do servidor de produção ✓ (7 rotas respondendo 200, `/` → `/products`).
- Fluxos e2e contra a API real continuam pendentes de banco — o checklist manual (9 itens, cobrindo fluxos existentes, orders, detalhes, proteção de rota e estados de erro/vazio) está no `frontend/README.md`, que também documenta a nova estrutura.
