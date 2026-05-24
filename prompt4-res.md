# Product Admin + Profile + Baseline de Testes — Resumo

Concluído. Resumo:

## Frontend — novas telas
- **`/admin/products`** — criar, editar e excluir produtos (POST/PUT/DELETE `/api/products`), lista recarregada após cada mutação, mensagens de sucesso/erro, confirmação antes de excluir.
- **`/profile`** — carrega `GET /users/:id` (id do usuário logado), edita nome/e-mail via `PUT /users/:id` e sincroniza o e-mail exibido na navbar.
- Novos módulos `features/users/api.js` e CRUD em `features/products/api.js`; links **Admin** e **Profile** na navbar; ambas protegidas pelo `RequireAuth`.

## Testes — backend (`node --test`, sem dependências novas)
- `test/order-service.unit.test.js` — 7 testes de regra de negócio pura (máquina de estados de status, normalização/merge do payload de checkout, hash de idempotência).
- `test/api-contract.test.js` — 4 testes de contrato montando as rotas reais `/api` (sem banco): token ausente → 400, token inválido → 401, validação Joi de login/signup → 400.
- Scripts novos: `npm run test:unit`, `test:contract`, `test:e2e` (este último continua exigindo Postgres).
- **Correção necessária descoberta**: em Node ≥ 24 o backend nem carregava — `jsonwebtoken → buffer-equal-constant-time` usa `SlowBuffer`, removido do Node. Foi adicionado `src/utils/bufferCompat.js` (shim de 3 linhas importado antes do `jsonwebtoken`); sign/verify verificados. Também foi criado `src/config/database.js` local (gitignored, baseado nas env vars) — necessário para qualquer execução do backend.

## Testes — frontend (Jest + React Testing Library via `next/jest`)
- `cart-context.test.js`, `require-auth.test.js`, `products-page.test.js` (fluxo da página com API mockada: lista, add ao carrinho, erro + retry + estado vazio).
- Script `npm test` no frontend.

## Resultados executados
| Comando | Resultado |
| --- | --- |
| backend `npm run test:unit` | ✅ 7/7 |
| backend `npm run test:contract` | ✅ 4/4 |
| frontend `npm test` | ✅ 7/7 (3 suites) |
| frontend `npm run lint` | ✅ limpo |
| frontend `npm run build` | ✅ 10 rotas |
| smoke test produção | ✅ `/admin/products`, `/profile`, etc. → 200 |
| backend `npm run test:e2e` | ⏭ não executado — segue exigindo Postgres (limitação já documentada) |

Docs atualizadas: seção de testes no `frontend/README.md` (estrutura, comandos, cobertura, checklist com 11 itens) e seção "🧪 Tests" no README raiz. Observação: o `npm run lint` do backend continua poluído pela regra pré-existente `linebreak-style: windows` vs arquivos LF — não foi alterado.
