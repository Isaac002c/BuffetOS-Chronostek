# Banco de Dados — ChronosTek CRM BuffetOS

## Visão Geral

PostgreSQL hospedado no Neon DB em produção. Todas as tabelas de negócio possuem `tenant_id UUID NOT NULL` para isolamento multi-tenant. As migrations rodam automaticamente no startup do backend (`app.js`) via `ALTER TABLE IF NOT EXISTS` — não há ferramenta de migration separada.

---

## Isolamento Multi-Tenant

Todas as queries de negócio **devem** incluir `WHERE tenant_id = $N`. Nunca consulte uma tabela multi-tenant sem o filtro de tenant. Ver `MAINTENANCE.md` para armadilhas comuns.

---

## Tabelas

### `tenants`

Representa cada empresa cliente do SaaS.

| Coluna        | Tipo          | Descrição                                  |
|---------------|---------------|--------------------------------------------|
| `id`          | UUID PK       | Identificador único do tenant              |
| `name`        | VARCHAR(255)  | Nome da empresa                            |
| `email`       | VARCHAR(255)  | Email de contato principal                 |
| `plan`        | VARCHAR(50)   | Plano atual: `trial`, `basic`, `professional`, `enterprise` |
| `is_active`   | BOOLEAN       | Tenant habilitado na plataforma            |
| `created_at`  | TIMESTAMPTZ   | Data de criação                            |

**Sem `tenant_id`** — é a tabela raiz do isolamento.

---

### `users`

Usuários de cada tenant (funcionários, gestores, vendedores).

| Coluna          | Tipo          | Descrição                                               |
|-----------------|---------------|---------------------------------------------------------|
| `id`            | UUID PK       |                                                         |
| `tenant_id`     | UUID FK       | Referência a `tenants.id`                               |
| `name`          | VARCHAR(255)  |                                                         |
| `email`         | VARCHAR(255)  | Único por tenant (`UNIQUE(email, tenant_id)`)           |
| `password_hash` | VARCHAR(255)  | bcrypt hash da senha                                    |
| `role`          | VARCHAR(50)   | Papel: `admin`, `manager`, `operator`, `seller`, `viewer` |
| `is_active`     | BOOLEAN       | Falso = login bloqueado (soft delete)                   |
| `token_version` | INTEGER       | Incrementado no logout → invalida JWTs anteriores       |
| `created_at`    | TIMESTAMPTZ   |                                                         |
| `updated_at`    | TIMESTAMPTZ   |                                                         |

**Campos críticos de segurança:**
- `is_active`: verificado no `tenantContext` a cada request. `false` = 401 imediato.
- `token_version`: o JWT carrega o valor no momento do login. Se o DB tiver um valor maior, o token é rejeitado. Incrementado automaticamente no logout.

---

### `quotations`

Orçamentos/propostas comerciais.

| Coluna         | Tipo          | Descrição                                              |
|----------------|---------------|--------------------------------------------------------|
| `id`           | UUID PK       |                                                        |
| `tenant_id`    | UUID FK       |                                                        |
| `client_id`    | UUID FK       | Referência a `clients.id`                              |
| `lead_id`      | UUID FK       | Referência a `leads.id` (nullable — pode não ter lead) |
| `event_date`   | DATE          | Data planejada do evento                               |
| `guest_count`  | INTEGER       | Quantidade de convidados (> 0)                         |
| `event_type`   | VARCHAR(100)  | Ex: Casamento, Formatura, Corporativo                  |
| `status`       | VARCHAR(50)   | Ver enum abaixo                                        |
| `subtotal`     | NUMERIC(12,2) | Soma dos itens antes do desconto                       |
| `discount`     | NUMERIC(12,2) | Desconto aplicado (>= 0)                               |
| `total`        | NUMERIC(12,2) | `subtotal - discount`                                  |
| `notes`        | TEXT          | Observações internas                                   |
| `created_by`   | UUID FK       | `users.id` de quem criou                               |
| `approved_by`  | UUID FK       | `users.id` de quem aprovou (nullable)                  |
| `created_at`   | TIMESTAMPTZ   |                                                        |
| `updated_at`   | TIMESTAMPTZ   |                                                        |

**Status enum — `quotations.status`:**

| Valor       | Significado                                                    |
|-------------|----------------------------------------------------------------|
| `draft`     | Rascunho — editável, ainda não enviado ao cliente              |
| `pending`   | Aguardando aprovação interna                                   |
| `approved`  | Aprovado internamente — pronto para converter em evento        |
| `active`    | Convertido em evento — não pode mais ser editado               |
| `completed` | Evento encerrado, pagamento confirmado                         |
| `cancelled` | Cancelado pelo cliente ou internamente                         |

---

### `quotation_items`

Itens (serviços/pacotes) de cada orçamento.

| Coluna         | Tipo          | Descrição                        |
|----------------|---------------|----------------------------------|
| `id`           | UUID PK       |                                  |
| `quotation_id` | UUID FK       | Referência a `quotations.id`     |
| `tenant_id`    | UUID FK       | Redundante para queries diretas  |
| `service_id`   | UUID FK       | Referência a `services.id` (nullable para itens manuais) |
| `description`  | VARCHAR(500)  | Descrição do item                |
| `quantity`     | INTEGER       |                                  |
| `unit_price`   | NUMERIC(12,2) |                                  |
| `total_price`  | NUMERIC(12,2) | `quantity * unit_price`          |

---

### `events`

Eventos confirmados (criados a partir de orçamentos aprovados ou diretamente).

| Coluna         | Tipo          | Descrição                                              |
|----------------|---------------|--------------------------------------------------------|
| `id`           | UUID PK       |                                                        |
| `tenant_id`    | UUID FK       |                                                        |
| `quotation_id` | UUID FK       | Referência ao orçamento de origem (nullable)           |
| `client_id`    | UUID FK       |                                                        |
| `title`        | VARCHAR(255)  | Nome/título do evento                                  |
| `event_date`   | DATE          |                                                        |
| `event_time`   | TIME          |                                                        |
| `venue`        | VARCHAR(255)  | Local do evento                                        |
| `guest_count`  | INTEGER       |                                                        |
| `total_value`  | NUMERIC(12,2) | Valor total do evento (base para billing)              |
| `status`       | VARCHAR(50)   | Ver enum abaixo                                        |
| `notes`        | TEXT          |                                                        |
| `created_by`   | UUID FK       |                                                        |
| `created_at`   | TIMESTAMPTZ   |                                                        |
| `updated_at`   | TIMESTAMPTZ   |                                                        |

**Status enum — `events.status`:**

| Valor       | Significado                                    |
|-------------|------------------------------------------------|
| `confirmed` | Evento confirmado e no calendário              |
| `cancelled` | Cancelado (não entra no financeiro)            |
| `completed` | Realizado — entra no financeiro como receita   |

**Constraint de unicidade:** `UNIQUE(quotation_id, tenant_id)` — impede criar dois eventos para o mesmo orçamento.

**Detecção de conflito de data:** verificada via query antes de inserir. Não é constraint de banco — é lógica no model.

---

### `team_members`

Membros da equipe operacional do buffet.

| Coluna       | Tipo          | Descrição                                    |
|--------------|---------------|----------------------------------------------|
| `id`         | UUID PK       |                                              |
| `tenant_id`  | UUID FK       |                                              |
| `name`       | VARCHAR(255)  |                                              |
| `cpf`        | VARCHAR(14)   | Único por tenant (`UNIQUE(cpf, tenant_id)`)  |
| `email`      | VARCHAR(255)  | Único por tenant                             |
| `phone`      | VARCHAR(20)   |                                              |
| `funcao`     | VARCHAR(100)  | Ex: Garçom, Cozinheiro, Coordenador          |
| `status`     | VARCHAR(50)   | `ativo`, `inativo`, `ferias`                 |
| `created_at` | TIMESTAMPTZ   |                                              |

---

### `leads`

Pipeline de prospecção de clientes.

| Coluna              | Tipo          | Descrição                                       |
|---------------------|---------------|-------------------------------------------------|
| `id`                | UUID PK       |                                                 |
| `tenant_id`         | UUID FK       |                                                 |
| `name`              | VARCHAR(255)  | Nome do prospecto                               |
| `email`             | VARCHAR(255)  |                                                 |
| `phone`             | VARCHAR(20)   |                                                 |
| `event_type`        | VARCHAR(100)  |                                                 |
| `estimated_date`    | DATE          |                                                 |
| `estimated_guests`  | INTEGER       |                                                 |
| `status`            | VARCHAR(50)   | Ver pipeline abaixo                             |
| `notes`             | TEXT          |                                                 |
| `converted_to`      | UUID FK       | `quotations.id` quando convertido (nullable)    |
| `created_at`        | TIMESTAMPTZ   |                                                 |

**Pipeline de status — `leads.status`:**

| Valor           | Etapa do funil                              |
|-----------------|---------------------------------------------|
| `novo`          | Recém chegou, não contatado                 |
| `contatado`     | Primeiro contato feito                      |
| `em_negociacao` | Em processo de proposta                     |
| `convertido`    | Virou orçamento (`converted_to` preenchido) |
| `perdido`       | Não fechou negócio                          |

---

### `clients`

Clientes que já fecharam ou estão em processo de fechamento.

| Coluna       | Tipo          | Descrição                                 |
|--------------|---------------|-------------------------------------------|
| `id`         | UUID PK       |                                           |
| `tenant_id`  | UUID FK       |                                           |
| `name`       | VARCHAR(255)  |                                           |
| `email`      | VARCHAR(255)  |                                           |
| `phone`      | VARCHAR(20)   |                                           |
| `cpf`        | VARCHAR(14)   | Único por tenant                          |
| `address`    | TEXT          |                                           |
| `created_at` | TIMESTAMPTZ   |                                           |

---

### `audit_logs`

Registros imutáveis de ações importantes no sistema.

| Coluna       | Tipo          | Descrição                                          |
|--------------|---------------|----------------------------------------------------|
| `id`         | UUID PK       |                                                    |
| `tenant_id`  | UUID FK       |                                                    |
| `user_id`    | UUID FK       | Usuário que realizou a ação (nullable para sistema) |
| `action`     | VARCHAR(100)  | Ver ações registradas abaixo                       |
| `resource`   | VARCHAR(100)  | Entidade afetada: `quotation`, `event`, `user`     |
| `resource_id`| UUID          | ID do recurso afetado                              |
| `details`    | JSONB         | Dados extras (ex: campo alterado, motivo)          |
| `ip`         | VARCHAR(45)   | IP do request                                      |
| `created_at` | TIMESTAMPTZ   |                                                    |

**Ações registradas:**

| Action               | Quando                                           |
|----------------------|--------------------------------------------------|
| `login`              | Login bem-sucedido                               |
| `logout`             | Logout explícito                                 |
| `password_changed`   | Senha alterada                                   |
| `permission_denied`  | Tentativa de acesso sem permissão (403)          |
| `quotation_approved` | Orçamento aprovado                               |
| `event_created`      | Evento criado                                    |
| `event_deleted`      | Evento deletado                                  |

---

### `company_plans` / `plans`

Configuração dos planos SaaS disponíveis.

| Coluna           | Tipo          | Descrição                            |
|------------------|---------------|--------------------------------------|
| `id`             | UUID PK       |                                      |
| `name`           | VARCHAR(50)   | `trial`, `basic`, `professional`, `enterprise` |
| `events_limit`   | INTEGER       | Máximo de eventos/mês (-1 = ilimitado) |
| `users_limit`    | INTEGER       | Máximo de usuários por tenant        |
| `price_monthly`  | NUMERIC(10,2) | Preço mensal                         |
| `features`       | JSONB         | Features habilitadas por plano       |

---

## Migrations Automáticas

As migrations rodam no startup do `app.js` com o padrão:

```javascript
await pool.query(`
  ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS venue VARCHAR(255)
`);
```

**Vantagens:** idempotente, sem ferramenta extra.
**Desvantagens:** não tem histórico versionado, não suporta rollback automático.

Para adicionar uma nova coluna, ver `MAINTENANCE.md` — seção "Adicionando coluna ao banco".

---

## Índices Recomendados

Os índices críticos para performance (além das PKs):

```sql
-- Queries mais frequentes com tenant_id
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_id ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
```
