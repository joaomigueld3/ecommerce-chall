# Arquitetura do Sistema — `ecommerce-chall` (omni.store — Plataforma E-commerce White-Label)

Documento vivo da arquitetura da plataforma **omni.store** (e-commerce próprio *single-store* white-label + backoffice/ERP com UX inspirada na Amazon, tema azul piscina/branco + escuro e suporte multi-região **Brasil / EUA / Europa**). Combina a fotografia exata do estado atual (**As-Is — Fases 1, 2 e 3 concluídas, 19 tabelas ativas**) com o desenho-alvo das próximas entregas (**To-Be — Fases 4 e 5**), mantido em sincronia com o [BACKLOG.md](../BACKLOG.md) e com a nota técnica de pedidos em [order-workflow.md](./order-workflow.md).

> **Escopo Arquitetural:** Plataforma de **loja única white-label** (sem marketplace multi-vendedor). Pensada para portfólio e adaptação rápida a negócios reais no **Brasil (`pt-BR / BRL R$`)**, **EUA (`en-US / USD $`)** e **Europa (`en-IE / EUR €`)**.

> **Legenda de Status**
> - `✅ Implementado` — já presente no código, migrations e testes.
> - `🚧 Planejado (Fase X)` — desenhado como alvo para orientar migrations, chaves estrangeiras e fronteiras entre módulos antes da codificação.

---

## 1. Contexto do Sistema e Topologia de Execução (C4 Níveis 1–2)

```mermaid
flowchart LR
    Guest["Visitante (Navegador)"]
    Client["Cliente Autenticado"]
    Admin["Administrador"]

    subgraph Frontend["Frontend — Next.js 16 App Router (:3000)"]
        Storefront["Storefront Público\n/, /products, /cart"]
        Account["Área do Cliente\n/checkout, /orders, /profile"]
        Backoffice["Painel Admin\n/admin/*"]
        ApiClient["api-client.js\n(JWT + Auto-Refresh)"]
    end

    subgraph Backend["Backend — Node.js / Express (:9095)"]
        ApiRouter["REST API (/api/*)"]
        Swagger["OpenAPI / Swagger\n(/api-docs)"]
        ReportsFS["storage/reports/*.csv\n(Fase 1; migrado p/ DB na Fase 5)"]
    end

    subgraph Data["Persistência (Docker)"]
        Postgres[("PostgreSQL 14\nVolume: pgdata (:5432)")]
    end

    Guest --> Storefront
    Client --> Storefront
    Client --> Account
    Admin --> Backoffice

    Storefront --> ApiClient
    Account --> ApiClient
    Backoffice --> ApiClient

    ApiClient -->|"HTTP/JSON + Bearer JWT"| ApiRouter
    Admin -.->|"Documentação"| Swagger
    ApiRouter -->|"Sequelize ORM + SQL Parametrizado"| Postgres
    ApiRouter --> ReportsFS
```

### Modos de Execução

| Modo | Comando | O que roda no Docker | Quando usar |
| --- | --- | --- | --- |
| **Desenvolvimento Híbrido (Padrão)** `✅` | `docker compose up -d` + `npm run dev` (raiz e `frontend/`) | Apenas `db` (PostgreSQL 14 com volume `pgdata`) | Dia a dia de código no Windows (hot-reload rápido, testes locais ágeis). |
| **Demo Full-Stack Containerizada** `✅` | `docker compose --profile full up --build` | `db`, `backend` e `frontend` | Demonstração/portfólio com 1 comando sem instalar Node local. |
| **Produção Serverless (Futuro)** `🚧 Vercel` | 2 projetos Vercel + PostgreSQL gerenciado (Neon/Supabase) | Nenhum (Serverless Functions) | Publicação online (`VERCEL-01` a `VERCEL-06`). |

---

## 2. Arquitetura Interna em Camadas (C4 Nível 3)

O projeto adota um **Monólito Modular em Camadas** (inspirado em Ports & Adapters / Hexagonal simplificada) na API e uma organização por **Features + App Router** no Frontend.

```mermaid
flowchart TD
    subgraph ClientSide["Frontend (frontend/src/)"]
        Pages["app/* (App Router Pages)"]
        Layout["components/layout/NavBar.js\n(Header 2 faixas + Busca Global)"]
        Contexts["features/store/StoreContext.js (White-Label + BR/US/EU)\nfeatures/auth/AuthContext.js\nfeatures/cart/CartContext.js"]
        Guards["RequireAuth (?next=) / RequireRole"]
        FeatureApis["features/*/api.js"]
        HttpClient["lib/api-client.js\n(Retry automático em 401 via refresh-token)"]
    end

    subgraph ServerSide["Backend (src/)"]
        Entry["src/index.js\n(CORS + Helmet + Morgan + Swagger)"]
        Routes["adapters/secondary/routes/*\n(allRoutes.js + routers por domínio)"]
        AuthMW["utils/middlewareAuth.js\n(optionalAuthenticateToken / authenticateToken / requireAdmin)"]
        Validation["validation/*Validation.js\n(Schemas Joi)"]
        Controllers["adapters/primary/controllers/*Controller.js\n(Filtros + pagination.js)"]
        Services["entities/services/*Service.js\n(Regras de Negócio + Transações + Locks)"]
        Repos["entities/repositories/*Repository.js"]
        Models["entities/models/*.js\n(Sequelize ORM)"]
        DB[("PostgreSQL 14")]
    end

    Pages --> Layout
    Pages --> Guards
    Pages --> Contexts
    Pages --> FeatureApis
    FeatureApis --> HttpClient
    HttpClient --> Entry
    Entry --> Routes
    Routes --> AuthMW
    AuthMW --> Validation
    Validation --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos --> Models
    Models --> DB
```

### Mapa de Diretórios e Fronteiras

| Camada | Localização | Responsabilidade |
| --- | --- | --- |
| **Entrada / Infra HTTP** | `src/index.js`, `src/swagger.js` | Express, CORS (expondo headers de paginação/idempotência), Helmet, Swagger UI. |
| **Rotas & Segurança** | `src/adapters/secondary/routes/`, `src/utils/middlewareAuth.js` | Composição de rotas `/api/*`, autenticação JWT obrigatória/opcional e RBAC (`Admin` vs `Client`). |
| **Validação de Entrada** | `src/validation/`, `src/utils/validationUtils.js` | Validação Joi antes de atingir controllers/banco (garante 400 consistente). |
| **Controllers** | `src/adapters/primary/controllers/` | Tradução HTTP ↔ Serviço, montagem de filtros e paginação (`src/utils/pagination.js`). |
| **Services (Domínio)** | `src/entities/services/` | Regras de negócio, máquina de estados, transações atômicas, locks `FOR UPDATE`, geração SQL+CSV. |
| **Repositories & Models** | `src/entities/repositories/`, `src/entities/models/` | Acesso a dados Sequelize, associações e serialização `toDict()`. |
| **Migrations & Seeds** | `src/database/migrations/`, `src/database/seeders/` | Evolução versionada do schema PostgreSQL e carga idempotente de demonstração. |

---

## 3. Modelo de Dados (DER) — Atual vs. Alvo

### 3.1 Estado Atual — 7 Tabelas Implementadas (`✅ Fase 1`)

```mermaid
erDiagram
    table_users ||--o| table_clients : "hasOne (user_id)"
    table_clients ||--o{ table_orders : "hasMany (client_id)"
    table_clients ||--o{ table_idempotency_keys : "hasMany (client_id)"
    table_orders ||--o{ table_order_items : "hasMany (order_id)"
    table_orders ||--o| table_idempotency_keys : "optional (order_id)"
    table_products ||--o{ table_order_items : "hasMany (product_id)"

    table_users {
        int id PK
        string name
        string email UK
        string password
        enum type "Admin | Client"
        boolean confirmed
        timestamp created_at
        timestamp updated_at
    }

    table_clients {
        int client_id PK
        int user_id FK
        string full_name
        string contact UK
        text address
        boolean status
        timestamp created_at
        timestamp updated_at
    }

    table_products {
        int product_id PK
        string product_name
        text description
        string category
        decimal price
        int quantity_in_stock
        timestamp created_at
        timestamp updated_at
    }

    table_orders {
        int order_id PK
        int client_id FK
        enum status "Pending Payment | Received | In Preparation | Dispatched | Delivered | Cancelled"
        timestamp order_date
        decimal total
    }

    table_order_items {
        int item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal price_per_unit
        decimal subtotal
    }

    table_idempotency_keys {
        int idempotency_key_id PK
        string idempotency_key
        int client_id FK
        string request_hash
        int order_id FK
        int response_status
        jsonb response_body
    }

    table_sales_reports {
        int report_id PK
        timestamp period
        timestamp period_start
        timestamp period_end
        decimal total_sales
        int products_sold
        string file_path
        jsonb filters
    }
```

### 3.2 Arquitetura Alvo por Domínio — Expansão para 22 Tabelas (`🚧 Fases 2 a 5`)

O diagrama abaixo mostra como os novos módulos se conectam às 7 tabelas base sem quebrar retrocompatibilidade:

```mermaid
flowchart TD
    subgraph Core["Núcleo Existente (✅ Fase 1)"]
        Users["table_users"]
        Clients["table_clients"]
        Products["table_products"]
        Orders["table_orders"]
        OrderItems["table_order_items"]
        Idem["table_idempotency_keys"]
        Reports["table_sales_reports"]
    end

    subgraph Phase2["Fase 2 — Catálogo Rico, Prova Social & WMS (✅ Concluída — Épicos 7–9)"]
        Categories["table_categories (hierárquica)"]
        Brands["table_brands"]
        Images["table_product_images"]
        Variants["table_product_variants"]
        Reviews["table_product_reviews"]
        Questions["table_product_questions"]
        StockMov["table_stock_movements (Kardex)"]
    end

    subgraph Phase3["Fase 3 — Clientes 360º, Endereços, Listas & White-Label (✅ Concluída — Épico 10)"]
        StoreSettings["table_store_settings (Marca/Cores/BR-US-EU)"]
        Addresses["table_client_addresses (BR/US/EU)"]
        SavedCards["table_saved_payment_methods"]
        Wishlists["table_wishlists + table_wishlist_items"]
    end

    subgraph Phase4["Fase 4 — Carrinho, Promoções, Logística & RMA (🚧 Épicos 11–12)"]
        Carts["table_carts + table_cart_items"]
        Coupons["table_coupons"]
        Payments["table_order_payments"]
        StatusHist["table_order_status_history"]
        Returns["table_order_returns (RMA)"]
    end

    subgraph Phase5["Fase 5 — BI, Notificações & Auditoria (🚧 Épicos 13–15)"]
        Notifications["table_notifications"]
        AuditLogs["table_audit_logs"]
    end

    Categories --> Products
    Brands --> Products
    Products --> Images
    Products --> Variants
    Products --> Reviews
    Products --> Questions
    Products --> StockMov
    Variants -.-> StockMov

    Users --> Clients
    Clients --> Addresses
    Clients --> SavedCards
    Clients --> Wishlists
    Products --> Wishlists

    Clients --> Carts
    Products --> Carts
    Coupons -.-> Orders
    Clients --> Orders
    Orders --> OrderItems
    Orders --> Idem
    Orders --> Payments
    Orders --> StatusHist
    Orders --> Returns
    OrderItems --> Returns
    Returns -.->|"RETURN_RESTOCK"| StockMov
    Orders -.->|"SALE / CANCEL"| StockMov

    Orders --> Reports
    Users --> Notifications
    Users --> AuditLogs
```

---

## 4. Fluxos Críticos e Máquina de Estados

### 4.1 Fluxo de Compra de Ponta a Ponta (Vitrine Pública → Checkout Idempotente → Pagamento)

```mermaid
sequenceDiagram
    actor User as Visitante / Cliente
    participant FE as Frontend (Next.js)
    participant API as Express API
    participant DB as PostgreSQL

    User->>FE: Acessa / ou busca no Header
    FE->>API: GET /api/products?page=1&limit=12&sortBy=... (público)
    API->>DB: SELECT + COUNT com ordenação segura
    DB-->>API: rows + count
    API-->>FE: 200 { items, pagination } + X-Total-Count

    User->>FE: Adiciona itens ao Carrinho (localStorage)
    User->>FE: Clica em "Proceed to checkout" (/checkout)

    alt Não autenticado
        FE-->>User: Redireciona para /login?next=%2Fcheckout
        User->>FE: Faz login (POST /api/login)
        FE-->>User: Retorna automaticamente para /checkout
    end

    User->>FE: Confirma pedido (com Idempotency-Key)
    FE->>API: POST /api/orders/checkout (JWT + Idempotency-Key)
    API->>DB: BEGIN TX -> valida cliente, preços server-side e estoque -> cria Order (Pending Payment) + OrderItems + IdempotencyKey -> COMMIT
    API-->>FE: 201 { order, items }

    User->>FE: Simula pagamento (Confirmar / Negar)
    FE->>API: POST /api/orders/:orderId/payment { action: "confirm" }
    API->>DB: BEGIN TX -> SELECT ... FOR UPDATE (order + products ordenados por productId) -> debita estoque -> status = Received -> COMMIT
    Note over API,DB: Fase 2+: grava movimento SALE no Kardex (table_stock_movements)
    API-->>FE: 200 { paymentStatus: "confirmed", order, debitedItems }
```

### 4.2 Máquina de Estados de Pedido

```mermaid
stateDiagram-v2
    [*] --> PendingPayment: Checkout (sem debitar estoque)
    PendingPayment --> Received: Pagamento confirmado (lock FOR UPDATE + débito)
    PendingPayment --> Cancelled: Pagamento negado ou cancelamento (sem tocar estoque)

    Received --> InPreparation: Admin avança status
    Received --> Cancelled: Cancelamento (estorno transacional de estoque)

    InPreparation --> Dispatched: Admin despacha (Fase 4: + rastreio)
    InPreparation --> Cancelled: Cancelamento (estorno transacional de estoque)

    Dispatched --> Delivered: Admin confirma entrega

    Delivered --> ReturnRequested: 🚧 Fase 4 (Solicitação RMA)
    ReturnRequested --> ReturnedRefunded: 🚧 Fase 4 (Aprovação + restock opcional + reembolso)

    Cancelled --> [*]
    Delivered --> [*]
    ReturnedRefunded --> [*]
```

---

## 5. Matriz de Autenticação, RBAC e Contratos REST (`✅ Fase 1`)

### 5.1 Controle de Acesso por Perfil

| Domínio / Rota | Visitante (sem JWT) | `Client` (JWT) | `Admin` (JWT) |
| --- | --- | --- | --- |
| `POST /api/login`, `POST /api/signin`, `GET /api/confirmation/:token`, `GET\|POST /api/refresh-token` | ✅ Público | ✅ | ✅ |
| `GET /api/products`, `GET /api/products/categories`, `GET /api/products/:id`, `POST /api/products/filters` | ✅ Público (`optionalAuth`) | ✅ | ✅ |
| `POST/PUT/DELETE /api/products/*` | ❌ 400 | ❌ 403 | ✅ |
| `GET/PUT /api/users/:id`, `PUT /api/change-password` | ❌ 400 | ✅ Próprio usuário | ✅ Todos |
| `GET/POST/DELETE /api/users` | ❌ 400 | ❌ 403 | ✅ |
| `GET/POST/PUT /api/clients/*` | ❌ 400 | ✅ Próprio perfil | ✅ Todos |
| `DELETE /api/clients/:id` | ❌ 400 | ❌ 403 | ✅ |
| `POST /api/orders/checkout`, `GET /api/orders/*`, `POST /api/orders/:id/payment`, `POST /api/orders/:id/cancel` | ❌ 400 | ✅ Próprios pedidos | ✅ Todos |
| `PATCH /api/orders/:id/status`, `PUT/DELETE /api/orders/:id` | ❌ 400 | ❌ 403 | ✅ |
| `/api/reports/*` (CRUD + download CSV) | ❌ 400 | ❌ 403 | ✅ |

### 5.2 Convenções de API

* **Paginação e Ordenação (`src/utils/pagination.js`):**
  * Query params padrão: `?page=1&limit=20&sortBy=<campo>&sortOrder=asc|desc`.
  * Toda coluna `sortBy` passa por *allowlist* no controller (mitiga SQL injection) e aplica *tie-breaker* pelo ID primário para páginas determinísticas.
  * Headers de resposta expostos no CORS: `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages`, `Idempotency-Replayed`.
  * Retrocompatibilidade: quando `page` e `limit` não são enviados, os endpoints mantêm o formato original (ex.: array em `GET /api/products`); quando enviados, incluem o objeto `pagination`.
* **Formato de Erros (`src/utils/errorHandler.js`):**
  * Erros de validação Joi e de negócio seguem status semânticos (`400` validação/header, `401` token inválido/expirado, `403` RBAC, `404` não encontrado, `409` conflito de estoque/transição/idempotência).

---

## 6. Decisões Arquiteturais (ADRs) e Evolução por Fase

### Decisões Registradas

1. **ADR-01 — Monólito Modular em vez de Microsserviços:** mantém transações ACID entre Pedidos, Estoque/Kardex, Cupons e Carteira em um único banco PostgreSQL, evitando complexidade prematura de Sagas/mensageria distribuída.
2. **ADR-02 — Proteção contra Oversell com Lock Determinístico:** `SELECT ... FOR UPDATE` nos produtos sempre ordenados por `productId` crescente dentro da transação de pagamento/cancelamento, eliminando race conditions e deadlocks.
3. **ADR-03 — Preços Server-Side em Centavos Inteiros:** totais nunca vêm do cliente; cálculos financeiros usam inteiros em centavos (`toCents`) para evitar desvios de ponto flutuante (`IEEE 754`).
4. **ADR-04 — Snapshots Imutáveis nos Pedidos (Fase 4):** endereço de entrega e metadados/custo do produto serão copiados em `JSONB` no momento do checkout para que edições futuras no catálogo não alterem pedidos ou relatórios financeiros históricos.
5. **ADR-05 — Persistência de Relatórios em Banco (Fase 5):** armazenar `summaryMetrics`, `rowsData` (`JSONB`) e `csvContent` (`TEXT`) em `table_sales_reports` viabiliza inspeção de relatórios históricos na UI e remove dependência de filesystem local (alinhando com `VERCEL-04`).
6. **ADR-06 — Infra Híbrida no Desenvolvimento:** PostgreSQL containerizado + Back/Front locais no host por padrão (`docker compose up -d`), com stack containerizada opcional sob `--profile full`.
7. **ADR-07 — Single-Store White-Label Multi-Região (BR / US / EU):** opção consciente por loja única (sem multi-vendedor) com identidade visual, moeda (`BRL`/`USD`/`EUR`), idioma e regras fiscais/postais (`CEP`/`ZIP`/`Postal Code`, `CPF/CNPJ`/`Tax ID`/`VAT ID`) parametrizadas via `StoreContext` (Fase 1) e `table_store_settings` (Fase 3), facilitando vendas personalizadas para negócios no Brasil, EUA e Europa.

### Roadmap Arquitetural por Fase

| Fase | Épicos | Principais Mudanças Arquiteturais | Status |
| --- | --- | --- | --- |
| **Fase 1 (P0)** | Épico 6 | Vitrine pública (`optionalAuthenticateToken`), paginação/ordenação universal, `/api/products/categories`, Header/Home White-Label (`omni.store`), Tema Azul Piscina + Escuro, Presets Multi-Região (BR/US/EU), 50 produtos reais em disco, Docker profile `full`. | `✅ Concluída` |
| **Fase 2 (P1)** | Épicos 7–9 | Categorias hierárquicas, Marcas, Galeria, Variantes, PDP em 3 colunas, Reviews verificadas + histograma, Q&A + `/admin/reviews`, Kardex (`table_stock_movements`) + `/admin/inventory` e soft-archive de produtos. | `✅ Concluída` |
| **Fase 3 (P2)** | Épico 10 | Painel White-Label (`table_store_settings` + `/admin/settings`), Clientes 360º (documentos BR/US/EU, tier, pontos, crédito), Múltiplos Endereços internacionais + ViaCEP, Carteira simulada, Wishlist e Salvar para depois. | `✅ Concluída` |
| **Fase 4 (P3)** | Épicos 11–12 | Carrinho sincronizado, Cupons, Frete regional, Checkout 3 passos (PIX/Boleto/Cartão/SEPA), Snapshots, Timeline auditável, Recibo/Invoice, `/admin/orders` e RMA/Devoluções. | `🚧 Próxima` |
| **Fase 5 (P4)** | Épicos 13–15 | Dashboard BI (`/admin/dashboard`), 6 Relatórios persistidos (Curva ABC, RFM/LTV, Giro, Margem), Notificações, Auditoria e Seeder completo. | `🚧 Planejada` |

---

## 7. Definition of Done (DoD) Arquitetural por Fase

Ao encerrar cada fase do backlog:
- [ ] Migrations criadas e reversíveis (`up` e `down`) sem quebrar dados existentes.
- [ ] `docs/architecture.md` atualizado promovendo os módulos concluídos de `🚧` para `✅`.
- [ ] `src/swagger-output.json` regenerado (`npm run swagger`).
- [ ] Backend verde: `npm run lint`, `npm run test:unit`, `npm run test:contract` (e `test:e2e` quando houver banco de teste).
- [ ] Frontend verde: `npm run lint`, `npm test` (Jest) e `npm run build` (`next build`).
- [ ] Itens marcados como `[x]` em [BACKLOG.md](../BACKLOG.md).
