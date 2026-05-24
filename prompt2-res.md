# Frontend Next.js — Resumo

Frontend pronto. Resumo:

## O que foi entregue (`frontend/`)
- **Next.js 16 (App Router, JavaScript)** criado com create-next-app, sem Tailwind/Redux — só React state/Context e CSS simples.
- **Páginas**: `/login`, `/products`, `/cart`, `/checkout` (+ `/` redireciona para `/products`).
- **Auth**: `context/AuthContext.js` — login via `POST /api/login`, token no `localStorage`, header `Authorization` em toda chamada autenticada, `components/RequireAuth.js` redireciona não autenticados para `/login`, logout na navbar.
- **Carrinho**: `context/CartContext.js` — adicionar/remover, alterar quantidade (mínimo 1), totais, persistência em `localStorage`.
- **Checkout**: envia `{ clientId, items: [{ productId, quantity }] }` para `POST /api/orders/checkout` (preço/total calculados pelo backend), mensagem de sucesso/erro, carrinho limpo só no sucesso; cliente auto-detectado via `GET /api/clients` com fallback manual.
- **Camada de API**: `lib/api.js` com base URL via `NEXT_PUBLIC_API_URL` (`.env.local.example`) e erros normalizados; estados de loading/erro (com retry) nas páginas dependentes de API.
- **Docs**: `frontend/README.md` com passos exatos de execução (backend + frontend), tabela de env vars, decisões de arquitetura e checklist manual dos 5 fluxos; seção curta apontando para ele no README raiz.

## Verificação feita aqui
- `npm run build` ✓ (todas as rotas compilam e pré-renderizam), `npm run lint` ✓, smoke test do servidor de produção ✓ (todas as rotas respondem 200, `/` → `/products`).
- **Não foram testados os fluxos end-to-end no navegador contra a API real** — continua sem banco provisionado (mesma decisão da tarefa anterior). O checklist manual no README cobre login (sucesso/falha), listagem, carrinho, checkout sucesso/falha e o guard de autenticação.

Observação: para testar de verdade, use um usuário **Admin** confirmado — o middleware atual bloqueia usuários `Client` na maioria das rotas (bug pré-existente já documentado).
