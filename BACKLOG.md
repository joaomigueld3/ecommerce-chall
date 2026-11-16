# Backlog do Projeto — `ecommerce-chall`

Backlog consolidado para adequação integral aos requisitos do **Desafio Node** e cobertura completa do backend no frontend Next.js, mantendo a solução sucinta e pronta para portfólio.

> **Premissas de Escopo (Portfólio):**
> - **Sem envio real de e-mail:** manter fluxo de confirmação de conta funcional via token, usando transporte no-op/stub quando não houver SMTP configurado e exibindo o link de confirmação diretamente para testes.
> - **Sem AWS (EC2 / S3) neste momento:** armazenamento e download de relatórios feitos localmente na aplicação/banco.
> - **Estrutura de pastas:** manter o backend na raiz (`src/`, `test/`, `package.json`) e o frontend em `frontend/` para preservar os scripts, `.sequelizerc` e testes existentes.
> - **Deploy na Vercel:** separado na seção de **Implementação Futura** ao final deste documento.

---

## Épico 1 — Banco de Dados, Persistência Local e Setup

- [x] **DB-01 — Persistência no Docker Compose:** volume nomeado (`pgdata:/var/lib/postgresql/data`) adicionado em `docker-compose.yml` para evitar perda de dados ao executar `docker compose down`.
- [x] **DB-02 — Configuração de Banco via Variáveis de Ambiente:** `src/config/database.cjs` versionado lendo `.env` / `DATABASE_URL` (sem credenciais hardcoded), com `.sequelizerc` e `src/database/index.js` atualizados.
- [x] **DB-03 — Seeder de Portfólio:** seeder idempotente (`npm run seed`) com 1 usuário `Admin` confirmado (`admin@loomi.dev`), 1 usuário `Client` confirmado (`client@loomi.dev`) com registro em `table_clients` e 6 produtos iniciais com categorias.
- [x] **DB-04 — Padronização do `.env.example`:** `.env.example` atualizado removendo dependências obrigatórias de Gmail/Hotmail e mantendo variáveis locais essenciais (`PORT`, banco, segredos JWT/Email, `CORS_ORIGIN`, `FRONTEND_URL`, `API_BASE_URL`).

---

## Épico 2 — Segurança, RBAC e Correções Críticas no Backend

- [x] **SEC-01 — Corrigir RBAC (`Admin` vs `Client`):** `src/utils/middlewareAuth.js` corrigido usando `req.baseUrl + req.path` e `requireAdmin`, restringindo `Client` a leitura/filtro de produtos, próprio usuário/senha, próprio cliente e próprios pedidos.
- [x] **SEC-02 — Bloquear Escalação de Privilégio no Cadastro:** criação de conta `Admin` bloqueada na rota pública `POST /api/signin` e disponibilizada em `POST /api/users` protegida por `Admin`.
- [x] **BUG-01 — Confirmação de E-mail e Transporter:**
  - `UserController.emailConfirmation` corrigido usando `decoded.user` e `{ confirmed: true }`;
  - `src/utils/transporter.js` ajustado com `jsonTransport: true` quando não houver SMTP configurado e retorno de `confirmationToken`/`confirmationUrl` no `POST /api/signin`.
- [x] **BUG-02 — Refresh Token:** suporte a `POST /api/refresh-token` (além de `GET /api/refresh-token`).
- [x] **BUG-03 — Associações, Serialização e Exclusão de Itens:**
  - `User.js` corrigido (`foreignKey: 'userId'` e `updatedAt: this.updatedAt` em `toDict()`);
  - `Order.js` corrigido (`orderId` e `clientId` em `toDict()`);
  - `ClientValidation.js` e `ClientController.js` corrigidos (`userId` aceito e comparação `Number(...)` no contato);
  - `OrderItemController.js` / `OrderItemService.js` corrigidos (`await deleteOrderItem` + recálculo de total e estorno transacional).

---

## Épico 3 — Requisitos Faltantes do Desafio (Backend)

- [x] **PROD-01 — Categorias e Filtros Múltiplos em Produtos:** migration `20261116010000-add-category-to-product.cjs`, `Product.js`, `ProductValidation.js` e filtros múltiplos (`categories`/`category`, `minPrice`, `maxPrice`, `available`, busca por texto).
- [x] **REST-01 — Filtros nos Endpoints `GET` de Listagem:** suporte a query params nos `GET` de `/users`, `/clients`, `/products`, `/orders`, `/order-items` e `/reports` (retornando `200` com lista vazia quando aplicável), mantendo `POST /*/filters`.
- [x] **PAY-01 — Sistema de Pagamento Simulado:** status `Pending Payment` no checkout + endpoint `POST /api/orders/:orderId/payment` (`{ action: 'confirm' | 'deny' }`) com lock transacional `FOR UPDATE` para débito de estoque e transição de status.
- [x] **REP-01 — Módulo de Relatórios Customizados (SQL + CSV + Persistência):** migration `20261116030000-create-salesReport.cjs`, `SalesReport.js`, query SQL agregada parametrizada, geração de CSV em `storage/reports/`, CRUD completo em `/api/reports` e download em `GET /api/reports/:reportId/download`.

---

## Épico 4 — Documentação OpenAPI (Swagger) e Testes Backend

- [x] **DOC-01 — Atualizar Swagger:** `src/swagger-output.json` regenerado via `npm run swagger` cobrindo todas as rotas (incluindo `/orders/checkout`, `/orders/:orderId/payment`, `/orders/:orderId/status`, `/orders/:orderId/cancel`, `/orders/:orderId/summary` e `/reports`).
- [x] **TEST-01 — Testes Unitários Obrigatórios:** `test/user-service.unit.test.js`, `test/report-service.unit.test.js` e `test/order-service.unit.test.js` (19 testes passando).
- [x] **TEST-02 — Testes de Contrato e E2E:** `test/api-contract.test.js` (4 testes passando) e `test/order-workflow.test.js` (11 testes E2E passando contra PostgreSQL com pagamento simulado, RBAC e relatórios).

---

## Épico 5 — Cobertura Completa do Backend no Frontend (`frontend/`)

- [x] **FE-AUTH — Cadastro, Confirmação, Refresh Token e RBAC:** `/register`, `/confirm-email/[token]`, refresh automático no `AuthContext.js` / `api-client.js`, `RequireRole.js` e `NavBar.js` condicional por role.
- [x] **FE-PROD — Catálogo com Filtros e Detalhe:** filtros múltiplos em `/products`, detalhe em `/products/[productId]` e campo `category` em `/admin/products`.
- [x] **FE-ORDER — Checkout Idempotente, Pagamento, Cancelamento e Status:** `Idempotency-Key` e pagamento simulado em `/checkout`, filtros em `/orders` e ações completas (pagar, cancelar, transicionar status e excluir) em `/orders/[orderId]`.
- [x] **FE-PROFILE — Perfil, Senha e Dados do Cliente:** edição de usuário, alteração de senha (`PUT /api/change-password`) e CRUD do próprio perfil `Client` em `/profile`.
- [x] **FE-ADMIN — Gestão Administrativa:** `/admin/clients`, `/admin/users` e `/admin/reports` (geração e download `.csv`).
- [x] **FE-TEST — Testes e Build do Frontend:** `npm run lint`, `npm test` (6 suítes, 11 testes passando) e `npm run build` (15 rotas compiladas).

---

## Implementação Futura — Deploy na Vercel + PostgreSQL Gerenciado

> Itens reservados para quando for preparar a publicação em produção na Vercel (2 projetos no mesmo repositório GitHub: API na raiz `/` + Frontend em `frontend/`, conectados a um PostgreSQL externo como Neon ou Supabase).

- [ ] **VERCEL-01 — Entrypoint Serverless da API:** separar `src/app.js` (Express app) de `src/index.js` (`app.listen` apenas local) e criar entrypoint serverless `api/index.js` + `vercel.json` na raiz.
- [ ] **VERCEL-02 — Sequelize Serverless-Ready:** suportar `DATABASE_URL` com SSL no `src/config/database.cjs`, configurar `pool: { max: 2, min: 0, idle: 10000 }` e tornar a inicialização/associação de models em `src/database/index.js` síncrona e idempotente via cache em `globalThis`.
- [ ] **VERCEL-03 — Dependência 100% JS para Hash de Senha:** migrar de `bcrypt` (binário nativo C++) para `bcryptjs` para evitar falhas de build/runtime nas Serverless Functions.
- [ ] **VERCEL-04 — CSV Compatível com Filesystem Efêmero:** adicionar coluna `csv_content` em `table_sales_reports` (ou geração determinística sob demanda) para que `GET /api/reports/:reportId/download` funcione na Vercel sem disco permanente e sem S3.
- [ ] **VERCEL-05 — Swagger UI Serverless:** servir o Swagger UI de `/api-docs` carregando assets CSS/JS via CDN + `/api-docs.json` (evitando erro de arquivos estáticos do `swagger-ui-express` em serverless).
- [ ] **VERCEL-06 — Configuração de Produção e Guia:** configurar `CORS_ORIGIN` e `FRONTEND_URL`, validar execução de `api/index.js` com `VERCEL=1` e documentar no `README.md` o passo a passo de variáveis de ambiente, migrations e seed em produção.
