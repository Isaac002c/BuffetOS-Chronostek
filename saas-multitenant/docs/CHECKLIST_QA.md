# Checklist de QA Manual — ChronosTek CRM BuffetOS

Execute este checklist antes de cada deploy em produção ou após mudanças significativas. Marque cada item ao validar. Itens com `[SEGURANÇA]` são críticos — não podem ser pulados.

**Ambiente de teste:** use dados fictícios. Nunca execute este checklist em produção com dados reais de clientes.

---

## Autenticação

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| A01 | Login com email e senha válidos | Redireciona para dashboard, cookie `token` aparece em DevTools → Application → Cookies | [ ] |
| A02 | Login com senha incorreta | Mensagem de erro, nenhum cookie definido | [ ] |
| A03 | Login com email inexistente | Mensagem de erro genérica (não revela se o email existe) | [ ] |
| A04 | Logout | Cookie `token` removido, redirecionado para /login, request subsequente retorna 401 | [ ] |
| A05 | Acesso a `/dashboard` sem cookie | Redirecionado para /login | [ ] |
| A06 | `[SEGURANÇA]` Acesso direto a `/api/quotations` sem cookie | 401 Unauthorized | [ ] |
| A07 | `[SEGURANÇA]` Token expirado (testar com TTL reduzido) | 401, cookie limpo, redirecionado para login | [ ] |
| A08 | `[SEGURANÇA]` Usuário marcado como `is_active = false` no banco | Login bloqueado com 401 mesmo com senha correta | [ ] |
| A09 | `[SEGURANÇA]` Token de sessão antiga após logout | Nova tentativa de request com token antigo retorna 401 (token_version inválida) | [ ] |
| A10 | `[SEGURANÇA]` Rate limit de login: 11ª tentativa em 15min | 429 Too Many Requests | [ ] |
| A11 | Cookie httpOnly: tentar acessar `document.cookie` no console do browser | Não deve aparecer o cookie `token` | [ ] |

---

## Orçamentos

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| B01 | Criar orçamento com todos os campos válidos | Orçamento criado com status `draft`, aparece na listagem | [ ] |
| B02 | Criar orçamento sem `guest_count` | 400 Bad Request com mensagem explicativa | [ ] |
| B03 | Criar orçamento com `guest_count = 0` | 400 Bad Request | [ ] |
| B04 | Criar orçamento com `discount` negativo | 400 Bad Request | [ ] |
| B05 | Editar orçamento em status `draft` | Edição salva com sucesso | [ ] |
| B06 | Editar o mesmo orçamento múltiplas vezes (salvar 3x) | Cada save é idempotente, não cria duplicatas | [ ] |
| B07 | Adicionar item ao orçamento | Total recalculado corretamente | [ ] |
| B08 | Remover item do orçamento | Total atualizado, item removido da listagem | [ ] |
| B09 | Aplicar desconto | `total = subtotal - desconto`, valor exibido corretamente | [ ] |
| B10 | Aprovar orçamento (como manager ou admin) | Status muda para `approved`, campo `approved_by` preenchido | [ ] |
| B11 | `[SEGURANÇA]` Tentar aprovar orçamento como `operator` | 403 Forbidden | [ ] |
| B12 | Cancelar orçamento com motivo | Status muda para `cancelled`, motivo salvo | [ ] |
| B13 | Tentar editar orçamento `cancelled` | 400 ou 403 — edição bloqueada | [ ] |
| B14 | Converter orçamento `approved` em evento | Evento criado, status do orçamento muda para `active` | [ ] |
| B15 | Tentar converter o mesmo orçamento em evento novamente | 409 Conflict — duplicata bloqueada | [ ] |
| B16 | Gerar PDF/proposta do orçamento | PDF gerado e baixado sem erros | [ ] |
| B17 | Simulação de cálculo | Retorna projeção de total sem salvar | [ ] |

---

## Eventos

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| C01 | Criar evento manual (sem orçamento) | Evento criado com status `confirmed`, aparece na listagem | [ ] |
| C02 | Criar evento via conversão de orçamento (B14) | Evento vinculado ao orçamento via `quotation_id` | [ ] |
| C03 | `[SEGURANÇA]` Tentar criar evento na mesma data e horário de outro evento existente | 409 Conflict com detalhes do conflito | [ ] |
| C04 | Criar evento em data diferente do conflito | Criado com sucesso | [ ] |
| C05 | Editar evento existente (título, local, horário) | Atualizado corretamente | [ ] |
| C06 | Deletar evento (como manager ou admin) | Evento removido da listagem e do calendário | [ ] |
| C07 | `[SEGURANÇA]` Tentar deletar evento como `operator` | 403 Forbidden | [ ] |
| C08 | Visualizar evento no calendário | Evento aparece na data correta com título e status | [ ] |
| C09 | Filtrar eventos por status `confirmed` | Apenas eventos confirmados exibidos | [ ] |
| C10 | Filtrar eventos por mês | Apenas eventos do mês selecionado | [ ] |

---

## Financeiro (Billing)

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| D01 | Visualizar receita mensal como `admin` | Cards de receita, eventos e ticket médio exibidos | [ ] |
| D02 | Visualizar receita mensal como `manager` | Mesmo acesso que admin | [ ] |
| D03 | `[SEGURANÇA]` Tentar acessar `/api/billing` como `operator` | 403 Forbidden | [ ] |
| D04 | `[SEGURANÇA]` Tentar acessar `/api/billing` como `seller` | 403 Forbidden | [ ] |
| D05 | `[SEGURANÇA]` Tentar acessar `/api/billing` como `viewer` | 403 Forbidden | [ ] |
| D06 | Comparativo com mês anterior | Percentual de variação exibido e correto | [ ] |
| D07 | Forecast de receita futura | Valores baseados nos eventos confirmados futuros | [ ] |
| D08 | Filtrar por mês diferente | Dados do mês selecionado carregam corretamente | [ ] |
| D09 | Valores batem com eventos criados | Somar eventos `confirmed`/`completed` do mês deve bater com o total exibido | [ ] |
| D10 | Eventos `cancelled` não entram no financeiro | Verificar que eventos cancelados não somam na receita | [ ] |

---

## Clientes

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| E01 | Criar cliente com dados válidos | Cliente criado e aparece na listagem | [ ] |
| E02 | Editar cliente existente | Dados atualizados com sucesso | [ ] |
| E03 | Pesquisar cliente por nome | Resultados filtrados corretamente | [ ] |
| E04 | `[SEGURANÇA]` Tentar criar segundo cliente com mesmo CPF no tenant | 409 Conflict — CPF duplicado bloqueado | [ ] |
| E05 | Criar clientes com mesmo CPF em tenants diferentes | Permitido — isolamento correto | [ ] |
| E06 | Deletar cliente sem eventos/orçamentos ativos | Cliente removido com sucesso | [ ] |
| E07 | Tentar deletar cliente com evento ativo vinculado | Bloqueado com mensagem explicativa | [ ] |

---

## Leads

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| F01 | Criar lead com dados básicos | Lead criado na coluna `novo` do pipeline | [ ] |
| F02 | Editar dados do lead | Atualizado com sucesso | [ ] |
| F03 | Mover lead no pipeline (ex: `novo` → `contatado`) | Status atualizado, lead na coluna correta | [ ] |
| F04 | Mover lead para `em_negociacao` | Exibido corretamente no board | [ ] |
| F05 | Deletar lead (como manager ou admin) | Lead removido | [ ] |
| F06 | `[SEGURANÇA]` Tentar deletar lead como `seller` | 403 Forbidden | [ ] |
| F07 | Converter lead em orçamento | Orçamento criado com dados do lead, lead passa para `convertido` | [ ] |
| F08 | `[SEGURANÇA]` Tentar converter o mesmo lead novamente | 409 Conflict — orçamento já existe para este lead | [ ] |

---

## Equipe

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| G01 | Criar membro com CPF e email válidos | Membro criado e aparece na listagem | [ ] |
| G02 | `[SEGURANÇA]` Criar membro com CPF inválido (ex: 111.111.111-11) | 400 Bad Request — CPF inválido | [ ] |
| G03 | `[SEGURANÇA]` Criar membro com CPF duplicado no tenant | 409 Conflict | [ ] |
| G04 | `[SEGURANÇA]` Criar membro com email duplicado no tenant | 409 Conflict | [ ] |
| G05 | Editar dados do membro (funcao, status) | Atualizado com sucesso | [ ] |
| G06 | Alterar status para `ferias` | Status atualizado corretamente | [ ] |
| G07 | Deletar membro da equipe | Removido da listagem | [ ] |
| G08 | `[SEGURANÇA]` Tentar criar membro como `operator` | 403 Forbidden | [ ] |
| G09 | Verificar disponibilidade de membro em data | Retorna se disponível ou ocupado | [ ] |

---

## Usuários e Perfis

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| H01 | Criar usuário `manager` como `admin` | Usuário criado com sucesso | [ ] |
| H02 | Criar usuário `admin` como `admin` | Usuário criado com sucesso | [ ] |
| H03 | `[SEGURANÇA]` Criar usuário `admin` como `manager` | 403 Forbidden — manager não pode criar admin | [ ] |
| H04 | `[SEGURANÇA]` Criar usuário como `operator` | 403 Forbidden | [ ] |
| H05 | Editar perfil próprio (nome) | Atualizado com sucesso | [ ] |
| H06 | Trocar senha com senha atual correta | Senha alterada, sessões antigas invalidadas | [ ] |
| H07 | Trocar senha com senha atual incorreta | 401 Unauthorized | [ ] |
| H08 | Rate limit na troca de senha: 6ª tentativa em 1h | 429 Too Many Requests | [ ] |
| H09 | Desativar usuário como `admin` | `is_active = false`, usuário não consegue mais logar | [ ] |
| H10 | `[SEGURANÇA]` Tentar desativar usuário como `manager` | 403 Forbidden | [ ] |

---

## Segurança — Isolamento Multi-Tenant

Estes testes requerem dois tenants distintos criados no sistema.

| # | Cenário | Resultado esperado | OK? |
|---|---------|-------------------|-----|
| S01 | `[SEGURANÇA]` Logado como Tenant A, acessar ID de orçamento do Tenant B diretamente na URL | 404 Not Found (não revela que o orçamento existe) | [ ] |
| S02 | `[SEGURANÇA]` Logado como Tenant A, acessar ID de evento do Tenant B via API | 404 Not Found | [ ] |
| S03 | `[SEGURANÇA]` Logado como Tenant A, acessar listagem de clientes | Ver APENAS clientes do Tenant A | [ ] |
| S04 | `[SEGURANÇA]` `viewer` tenta acessar `/api/billing` | 403 Forbidden | [ ] |
| S05 | `[SEGURANÇA]` `operator` tenta aprovar orçamento | 403 Forbidden | [ ] |
| S06 | `[SEGURANÇA]` `manager` tenta deletar usuário | 403 Forbidden | [ ] |
| S07 | `[SEGURANÇA]` `seller` tenta deletar evento | 403 Forbidden | [ ] |
| S08 | `[SEGURANÇA]` Acessar `/setup/init` sem `X-Setup-Secret` (com ALLOW_SETUP=true temporário) | 401 Unauthorized | [ ] |
| S09 | `[SEGURANÇA]` Verificar `/setup/init` com `ALLOW_SETUP` não definido | 404 Not Found | [ ] |
| S10 | `[SEGURANÇA]` Injeção SQL: tentar `email = "' OR '1'='1"` no login | 401 — sem bypass de autenticação | [ ] |

---

## Notas para o Testador

- Registre o resultado de cada item (OK / FALHOU / N/A)
- Para itens que falham, abra uma issue com: número do item, ambiente, passos para reproduzir, resultado esperado vs obtido
- Itens marcados `[SEGURANÇA]` bloqueiam o deploy se falharem
- Itens sem a marcação são funcionais — podem ser tratados após deploy se não forem regressões críticas
- Para testar rate limiting, use ferramentas como `curl` em loop ou Postman com runner
