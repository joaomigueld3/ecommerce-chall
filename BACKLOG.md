# Backlog do Projeto — `ecommerce-chall`

Backlog consolidado do projeto **Ecommerce Platform**, cobrindo desde a estruturação da plataforma base — API REST e frontend inicial (Épicos 1 a 5) — até a evolução para uma plataforma completa de **E-commerce + Backoffice/ERP inspirada na Amazon** (Épicos 6 a 15).

> **Premissas de Escopo:**
> - **Sem envio real de e-mail:** manter fluxo de confirmação de conta e notificações funcional via token e transporte no-op/stub quando não houver SMTP configurado.
> - **Infra de desenvolvimento híbrida:** `docker compose up -d` sobe apenas o PostgreSQL com volume persistente para desenvolvimento ágil no host (`npm run dev`), com profile opcional `full` para subir toda a stack em containers.
> - **Estrutura de pastas:** backend na raiz (`src/`, `test/`, `package.json`) e frontend em `frontend/` para preservar scripts, `.sequelizerc` e testes existentes.
> - **Deploy na Vercel:** separado na seção de **Implementação Futura** ao final deste documento.

---

## Épico 1 — Banco de Dados, Persistência Local e Setup

- [x] **DB-01 — Persistência no Docker Compose:** volume nomeado (`pgdata:/var/lib/postgresql/data`) adicionado em `docker-compose.yml` para evitar perda de dados ao executar `docker compose down`.
- [x] **DB-02 — Configuração de Banco via Variáveis de Ambiente:** `src/config/database.cjs` versionado lendo `.env` / `DATABASE_URL` (sem credenciais hardcoded), com `.sequelizerc` e `src/database/index.js` atualizados.
- [x] **DB-03 — Seeder de Portfólio:** seeder idempotente (`npm run seed`) com 1 usuário `Admin` confirmado (`admin@ecommerce.dev`), 1 usuário `Client` confirmado (`client@ecommerce.dev`) com registro em `table_clients` e 6 produtos iniciais com categorias.
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

## Épico 3 — Funcionalidades Core de E-commerce (Backend)

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

# Roadmap "Mini Amazon" — Plataforma Completa de E-commerce + Backoffice

## 🔴 Prioridade 0 (P0 — Fase 1) — Fundação de Marketplace, Vitrine Pública & Infra

### Épico 6 — Vitrine Pública, Paginação/Ordenação, Identidade Visual Amazon & Infra Híbrida

- [ ] **INFRA-01 — Paginação, Ordenação e Envelope Padrão na API:** suporte a `?page=1&limit=20&sortBy=...&sortOrder=asc|desc` com allowlist segura e headers `X-Total-Count` / `X-Page` / `X-Limit` / `X-Total-Pages` nos endpoints `GET` de `/products`, `/clients`, `/orders`, `/reports` e `/users` (mantendo retrocompatibilidade), mais endpoint `GET /api/products/categories`.
- [ ] **INFRA-02 — Docker Compose com Profile `full` Opcional:** manter `docker compose up -d` subindo apenas PostgreSQL para desenvolvimento local rápido e adicionar `Dockerfile` (backend e frontend) sob `profiles: ["full"]` em `docker-compose.yml`.
- [ ] **STORE-01 — Catálogo Público e Autenticação Opcional:** liberar `GET /api/products`, `GET /api/products/categories`, `GET /api/products/:productId` e `POST /api/products/filters` sem exigir JWT (com `optionalAuthenticateToken`), mantendo escrita/exclusão protegida por `authToken` + `requireAdmin`.
- [ ] **STORE-02 — Header, Navegação, Carrinho Visitante e Home Estilo Amazon (`frontend/`):**
  - Header escuro em duas faixas com logo, busca global com seletor de departamento, menu de conta/pedidos e carrinho destacado com badge;
  - Nova Home (`/`) com hero banner, departamentos dinâmicos, ofertas/menores preços e vitrine em destaque;
  - Catálogo (`/products`), detalhe (`/products/[productId]` com Buy Box e "Comprar agora") e carrinho (`/cart`) abertos para visitantes, com redirecionamento `/login?next=...` ao finalizar compra;
  - Ordenação e paginação integradas na UI de `/products`.

---

## 🟠 Prioridade 1 (P1 — Fase 2) — Catálogo Avançado, Prova Social & Estoque (Kardex)

### Épico 7 — Catálogo Rico: Categorias Hierárquicas, Marcas, Variantes, Imagens e Ofertas

- [ ] **CAT-01 — Gestão de Categorias Hierárquicas (`table_categories`) e Marcas (`table_brands`):** CRUDs completos com `slug`, hierarquia (`parentId`), imagem/logo e status ativo.
- [ ] **CAT-02 — Expansão Completa do Model `Product`:** adicionar `sku` (único), `slug`, `brandId`, `categoryId`, `originalPrice`, `costPrice`, `weightKg`, `dimensions`, `specs` (`JSONB`), `featured`, `isDealOfDay`, `active` (soft-delete) e métricas desnormalizadas (`ratingAvg`, `ratingCount`, `salesCount`).
- [ ] **CAT-03 — Galeria Multi-Imagem (`table_product_images`) e Variantes (`table_product_variants`):** suporte a múltiplas fotos ordenáveis e variações (cor, tamanho, voltagem, capacidade) com SKU, preço e estoque próprios.
- [ ] **CAT-04 — Página de Produto Completa em 3 Colunas (`/products/[productId]`):** galeria interativa, preço De/Por com % de economia, parcelamento simulado, seletor de variantes, ficha técnica, Buy Box lateral com cálculo de CEP e seção de produtos relacionados.

### Épico 8 — Avaliações Verificadas (Reviews) & Perguntas e Respostas (Q&A)

- [ ] **REV-01 — Avaliações com Selo "Compra Verificada" (`table_product_reviews`):** notas 1–5 estrelas, título, comentário, verificação automática contra pedidos entregues, histograma de estrelas e votos de utilidade.
- [ ] **REV-02 — Perguntas e Respostas (`table_product_questions`):** clientes enviam dúvidas na página do produto e Admins/compradores respondem publicamente.
- [ ] **REV-03 — Moderação de Reviews e Q&A no Admin (`/admin/reviews`):** aprovar/ocultar avaliações e responder dúvidas pendentes.

### Épico 9 — Gestão de Estoque (WMS Simplificado & Kardex)

- [ ] **STK-01 — Kardex de Movimentações de Estoque (`table_stock_movements`):** registro imutável de entradas, vendas, estornos por cancelamento/devolução, ajustes manuais e perdas com saldo anterior/novo, motivo e autor.
- [ ] **STK-02 — Alerta de Estoque Mínimo e Proteção de Exclusão:** campo `minStockLevel`, endpoint `GET /api/products/low-stock` e arquivamento (`active = false`) ao tentar remover produtos com histórico de pedidos.
- [ ] **STK-03 — Painel Admin de Inventário (`/admin/inventory`):** entrada rápida de lote, ajuste manual auditado, filtro de itens críticos/esgotados e visualização do Kardex por produto.

---

## 🟡 Prioridade 2 (P2 — Fase 3) — Clientes 360º, CRM, Endereços, Carteira & Listas

### Épico 10 — Cadastro Completo de Clientes, Múltiplos Endereços, Carteira & Wishlist

- [ ] **CLI-01 — Evolução do Model `Client` e Validações:** `documentType` (`CPF`/`CNPJ`), `documentNumber` validado e único, `phone`, `email`, `birthDate`, `tier` (`Standard`/`Prime`/`VIP`), `loyaltyPoints`, `creditBalance`, `internalNotes` e inativação/bloqueio seguro com `blockedReason`.
- [ ] **CLI-02 — Livro de Endereços (`table_client_addresses`) + Busca de CEP:** CRUD `/api/clients/:clientId/addresses` com múltiplos endereços, endereço padrão de entrega/cobrança e autocompletar via CEP no frontend.
- [ ] **CLI-03 — Carteira do Cliente (`table_saved_payment_methods` & Extrato):** cartões simulados salvos (bandeira, últimos 4 dígitos, validade, sem CVV) e consulta de pontos/crédito em `/profile`.
- [ ] **CLI-04 — Lista de Desejos (`table_wishlists`) e "Salvar para mais tarde":** favoritar produtos, mover entre Wishlist e Carrinho e gerenciar itens salvos para depois.
- [ ] **CLI-05 — Visão 360º do Cliente no Admin (`/admin/clients/[clientId]`):** ficha completa, KPIs de CRM (LTV, ticket médio, total de pedidos, taxa de cancelamento, última compra), endereços, histórico de pedidos e ajustes de crédito/tier.

---

## 🟢 Prioridade 3 (P3 — Fase 4) — Checkout Amazon, Logística & Pós-Venda (RMA)

### Épico 11 — Carrinho Sincronizado, Cupons, Frete & Checkout em Etapas

- [ ] **CHK-01 — Carrinho Híbrido (`table_carts` / `table_cart_items`):** persistência no banco para usuários autenticados com merge automático do `localStorage` ao fazer login.
- [ ] **CHK-02 — Motor de Cupons Promocionais (`table_coupons` & `/admin/coupons`):** cupons `PERCENTAGE`, `FIXED` e `FREE_SHIPPING` com validade, valor mínimo, teto de desconto, restrição por categoria e limite de uso global/por cliente.
- [ ] **CHK-03 — Cálculo de Frete e Prazo (`/api/shipping/quote`):** simulador determinístico por CEP, peso e valor (Padrão grátis para Prime / acima de R\$ 200, Expresso, Retirada) com data estimada de entrega.
- [ ] **CHK-04 — Checkout em 3 Etapas (`/checkout`):** seleção/criação de endereço, revisão de itens + frete, aplicação de cupom/saldo e pagamento simulado (`PIX` com QR/copia-e-cola, `Cartão` em 1x–12x, `Boleto`).

### Épico 12 — Ciclo de Vida Completo do Pedido, Rastreamento, Recibo & Devoluções (RMA)

- [ ] **ORD-01 — Snapshot Completo e Código Amigável:** `orderNumber` (`AMZ-YYYY-XXXXXX`), joins/snapshots imutáveis de endereço e itens (`productName`, `sku`, `imageUrl`, `category`, `variant`, `unitCost`) e tabela `table_order_payments`.
- [ ] **ORD-02 — Timeline Auditável (`table_order_status_history`):** registro de cada transição de status com data/hora, responsável, transportadora, código de rastreio e motivo de cancelamento.
- [ ] **ORD-03 — Experiência de Pós-Venda do Cliente (`/orders` e `/orders/[orderId]`):** busca por produto/período, barra visual de progresso da entrega, botão "Comprar novamente" e recibo/nota imprimível (`/orders/[orderId]/invoice`).
- [ ] **ORD-04 — Solicitação de Devolução / Reembolso (`table_order_returns`):** fluxo RMA completo para pedidos entregues com aprovação Admin, reposição transacional no Kardex (`RETURN_RESTOCK`) e estorno/crédito em carteira.
- [ ] **ORD-05 — Central Operacional de Pedidos no Admin (`/admin/orders`):** fila por abas de status, modal de despacho com rastreio, notas internas e gestão de devoluções.

---

## 🔵 Prioridade 4 (P4 — Fase 5) — BI, Relatórios Avançados, Notificações & Auditoria

### Épico 13 — Dashboard Executivo em Tempo Real (`/admin/dashboard`)

- [ ] **BI-01 — Endpoint de Analytics (`GET /api/reports/dashboard`):** KPIs com comparativo de período anterior (Receita Bruta/Líquida, CMV, Lucro e Margem %, Pedidos, Ticket Médio, Conversão, Cancelamento/Devolução), série temporal, vendas por categoria/pagamento e alertas operacionais.
- [ ] **BI-02 — Interface de Dashboard Executivo (`/admin/dashboard`):** filtros rápidos de período, cards de KPI com variação percentual e gráficos leves em SVG/CSS.

### Épico 14 — Motor de Relatórios Multi-Tipo Persistidos (SQL + JSON + CSV)

- [ ] **REP-02 — Persistência Completa no Banco (`table_sales_reports`):** adicionar `reportType`, `title`, `summaryMetrics` (`JSONB`), `rowsData` (`JSONB`) e `csvContent` (`TEXT`), permitindo abrir qualquer relatório histórico na tela e baixar CSV sem depender de disco local.
- [ ] **REP-03 — 6 Tipos de Relatórios Gerenciais:** (1) Vendas por Produto & Curva ABC; (2) Vendas por Categoria e Marca; (3) Ranking de Clientes (RFM & LTV); (4) Posição e Giro de Estoque; (5) Financeiro, Pagamentos & Cupons; (6) Cancelamentos e Devoluções.
- [ ] **REP-04 — Nova Central de Relatórios (`/admin/reports` e `/admin/reports/[reportId]`):** seletor de tipo, filtros completos (incluindo `clientId`, categoria, marca e status), visualização detalhada de relatórios salvos, exportação CSV e modo impressão.

### Épico 15 — Notificações In-App, Trilha de Auditoria & Qualidade Total

- [ ] **AUD-01 — Central de Notificações (`table_notifications`):** sino no `NavBar` com eventos de pagamento, envio/rastreio, devoluções e respostas de Q&A.
- [ ] **AUD-02 — Trilha de Auditoria Admin (`table_audit_logs` & `/admin/audit`):** log de alterações sensíveis com snapshot `before`/`after` e autor.
- [ ] **QA-01 — Seeder Rico "Mini Amazon Demo":** popular categorias, marcas, 20+ produtos com variantes/fotos/ofertas, clientes com endereços, cupons, reviews, movimentações de estoque e pedidos históricos para demonstração imediata.
- [ ] **QA-02 — Swagger 100% Atualizado + Suíte Completa de Testes:** cobertura unitária, contrato, E2E e Jest para todos os novos módulos.

---

## Implementação Futura — Deploy na Vercel + PostgreSQL Gerenciado

> Itens reservados para quando for preparar a publicação em produção na Vercel (2 projetos no mesmo repositório GitHub: API na raiz `/` + Frontend em `frontend/`, conectados a um PostgreSQL externo como Neon ou Supabase).

- [ ] **VERCEL-01 — Entrypoint Serverless da API:** separar `src/app.js` (Express app) de `src/index.js` (`app.listen` apenas local) e criar entrypoint serverless `api/index.js` + `vercel.json` na raiz.
- [ ] **VERCEL-02 — Sequelize Serverless-Ready:** suportar `DATABASE_URL` com SSL no `src/config/database.cjs`, configurar `pool: { max: 2, min: 0, idle: 10000 }` e tornar a inicialização/associação de models em `src/database/index.js` síncrona e idempotente via cache em `globalThis`.
- [ ] **VERCEL-03 — Dependência 100% JS para Hash de Senha:** migrar de `bcrypt` (binário nativo C++) para `bcryptjs` para evitar falhas de build/runtime nas Serverless Functions.
- [ ] **VERCEL-04 — CSV Compatível com Filesystem Efêmero:** adicionar coluna `csv_content` em `table_sales_reports` (ou geração determinística sob demanda) para que `GET /api/reports/:reportId/download` funcione na Vercel sem disco permanente e sem S3.
- [ ] **VERCEL-05 — Swagger UI Serverless:** servir o Swagger UI de `/api-docs` carregando assets CSS/JS via CDN + `/api-docs.json` (evitando erro de arquivos estáticos do `swagger-ui-express` em serverless).
- [ ] **VERCEL-06 — Configuração de Produção e Guia:** configurar `CORS_ORIGIN` e `FRONTEND_URL`, validar execução de `api/index.js` com `VERCEL=1` e documentar no `README.md` o passo a passo de variáveis de ambiente, migrations e seed em produção.
