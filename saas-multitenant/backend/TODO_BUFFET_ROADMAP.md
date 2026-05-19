# TODO_BUFFET_ROADMAP

## Status atual
- [x] Banco e migrações básicas criadas para `quotations`, `quotation_items`, `events` e multitenancy.
- [x] Backend implementado com CRUD de cotações, CRUD de eventos e rotas de faturamento/relatórios.
- [x] Frontend Buffet com módulos de Cotações, Eventos, Clientes e Faturamento integrados ao dashboard.
- [x] API wrapper e autenticação básica de token já disponíveis.
- [x] Relatório de vendas por cliente, ticket médio e previsão de receita adicionados.

## Roadmap completo para finalizar o sistema

### Banco (PostgreSQL)
- [ ] Verificar e finalizar todas as migrations de tabelas relacionadas ao fluxo Buffet (quotations, quotation_items, events, leads, clients).
- [ ] Garantir índices em `tenant_id`, `event_date`, `status` e campos usados em filtros.
- [ ] Revisar e aplicar políticas RLS apenas nas tabelas de dados multitenant.
- [ ] Seed de tenant, usuário e clientes de exemplo para testes.

### Backend (Node/Express)
- [ ] Refinar o middleware de tenant para garantir `req.tenantId` em todas rotas.
- [ ] **Aprovar/cancelar cotações com fluxo completo**
  - [ ] Criar endpoints dedicados (ex: `POST /quotations/:id/approve`, `POST /quotations/:id/cancel`) ao invés de depender só do `PUT` genérico.
  - [ ] Ao aprovar: persistir `status='approved'` e garantir consistência de `total_amount`.
  - [ ] Ao cancelar: persistir `status='cancelled'` e bloquear criação/edição de evento associado para cotações canceladas.
- [ ] **Edição de cotações (itens/totais)**
  - [ ] Garantir que `PUT /quotations/:id` recalcula `total_amount` a partir de `quotation_items` ao receber itens.
  - [ ] Padronizar o nome dos campos de item entre frontend/backend (`item_name` vs `name`).
- [ ] **Edição de eventos com status + validação de conflito**
  - [ ] Garantir que `PUT /events/:id` execute validação de conflito quando `event_date` for alterada (hoje só existe checagem no `POST`).
  - [ ] Garantir consistência com `quotation_id` (ex: manter `status` coerente e impedir estados inválidos).
- [x] Adicionar endpoints de relatório avançado: vendas por cliente, ticket médio, previsões mensais.
- [ ] Validar e documentar os endpoints existentes com exemplos.


### Frontend Buffet (Next.js)
- [x] Completar edição de cotações com formulário de edição e atualização de itens.
- [x] Completar edição de eventos e controle de status / cancelamento.
- [ ] Adicionar filtros por cliente, status, tipo de evento e intervalo de datas.
- [ ] Melhorar faturamento com comparativo mês a mês e gráficos resumidos.
- [x] Criar lista de clientes e integração com cotações/eventos.
- [x] Adicionar telas de detalhes para cotação e evento.

### Autenticação e tenant onboarding
- [ ] Validar fluxo de login e persistência de token/tenant no frontend.
- [ ] Criar registro de usuário/tenant, onboarding inicial e seleção de tenant.
- [ ] Garantir erros de login claros e redirecionamento ao dashboard.

### Qualidade e entrega
- [ ] Testar fluxo completo: login → seleção de tenant → cliente → cotação → evento → faturamento.
- [ ] Ajustar UX/estilos para consistência no dashboard.
- [ ] Documentar variáveis de ambiente e instruções de deploy.
- [ ] Configurar build e validações antes do deploy.

### Itens extras para finalizar
- [ ] Dashboard global de receita e oportunidades.
- [ ] Exportação CSV/PDF de cotações e relatórios.
- [ ] Controle de permissões por usuário/roles.
- [ ] Integração com pagamentos ou emissão de notas fiscais (opcional).

