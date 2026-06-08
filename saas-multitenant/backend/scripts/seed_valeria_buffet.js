/**
 * seed_valeria_buffet.js
 * ----------------------
 * Cria:
 *  1. Tenant  → "Valeria Rios Buffet"
 *  2. Usuário → "Valeria & Antonio" (admin)
 *  3. Template → "Ilha Gastronômica" com 29 itens
 *
 * Execute:  node backend/scripts/seed_valeria_buffet.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_0YMFJQUlk7xg@ep-odd-hill-aqunv9i6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});

// ─── Dados da empresa / usuário ───────────────────────────────────────────────
const TENANT_NAME    = 'Valéria Rios Buffet';
const TENANT_PHONE   = '(21) 99999-0000';   // ← altere para o telefone real
const TENANT_EMAIL   = 'contato@valeriasbuffet.com.br'; // ← altere para o e-mail real
const TENANT_CNPJ    = '';                   // ← preencha se tiver CNPJ
const TENANT_ADDRESS = 'Rio de Janeiro/RJ'; // ← altere para o endereço real

const USER_NAME    = 'Valéria & Antonio';
const USER_EMAIL   = 'valeria@valeriasbuffet.com.br';
const USER_PASS    = 'Valeria2024';

// ─── Template ─────────────────────────────────────────────────────────────────
const TEMPLATE = {
  name:        'Ilha Gastronômica',
  description: 'Cardápio completo Ilha Gastronômica — Boulangerie & Antepastos, Finger Foods Premium, Pâtisserie Salgada, Grazing Table, Doces e Serviço Volante. Referência: R$ 9.300 / 80 pessoas / 5h.',
  event_type:  'social',
};

/*
 * quantity_per_person × nº de convidados = quantidade total do item.
 * Itens 1-24 (comida + louças) somam exatamente R$ 116,25/pessoa
 *   → 116,25 × 80 = R$ 9.300 (valor do PDF)
 * Itens 25-29 (serviços + bebidas) são cobrados à parte / negociáveis.
 */
const ITEMS = [
  // ── Boulangerie & Antepastos Artesanais ─────────────────────────────────────
  { name: 'Petit Sandwiches Artesanais (Brioche e Ciabatta)',  unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  2.80 },
  { name: 'Crostinis & Crisps Artesanais',                     unit: 'un',         quantity_per_person: 3.0000, cost_per_unit:  0.90 },
  { name: 'Confitures de Saison',                              unit: 'porção',     quantity_per_person: 0.1000, cost_per_unit: 22.00 },
  { name: 'Mousse Cream de Queijos e Ervas',                   unit: 'porção',     quantity_per_person: 0.1000, cost_per_unit: 28.00 },
  { name: 'Caponata Siciliana',                                unit: 'porção',     quantity_per_person: 0.1000, cost_per_unit: 32.00 },
  { name: 'Terrine de Fromage',                                unit: 'porção',     quantity_per_person: 0.1000, cost_per_unit: 42.00 },

  // ── Finger Foods & Canapés Premium ──────────────────────────────────────────
  { name: 'Tartalettes de Frango Defumado',                    unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  3.20 },
  { name: 'Canapé Gravlax (Salmão Curado)',                    unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  3.80 },
  { name: 'Blinis de Crevette (Camarão na Manteiga de Ervas)', unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  4.50 },
  { name: 'Brochettes de Charcuterie',                         unit: 'un',         quantity_per_person: 1.0000, cost_per_unit:  5.50 },

  // ── Pâtisserie Salgada (Quiches / Assados & Fritos) ─────────────────────────
  { name: 'Viennoiserie Salgada (Folhados Amanteigados)',      unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  2.20 },
  { name: 'Petit Empada Royale',                               unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  2.80 },
  { name: 'Quiche Quatre Fromages',                            unit: 'fatia',      quantity_per_person: 1.0000, cost_per_unit:  3.50 },
  { name: 'Quiche Gadus Morhua (Bacalhau Nobre)',              unit: 'fatia',      quantity_per_person: 1.0000, cost_per_unit:  4.50 },
  { name: 'Coquetel de Camarão com Molho Cítrico',             unit: 'porção',     quantity_per_person: 1.0000, cost_per_unit:  5.50 },
  { name: 'Quibe com Geleia de Menta',                         unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  1.80 },

  // ── Grazing Table & Frutas ───────────────────────────────────────────────────
  { name: 'Platter de Charcutaria',                            unit: 'porção',     quantity_per_person: 1.0000, cost_per_unit: 11.00 },
  { name: 'Fruits Fraîches (Morangos e Uvas)',                 unit: 'porção',     quantity_per_person: 1.0000, cost_per_unit:  4.50 },

  // ── Pâtisserie Sucrée ────────────────────────────────────────────────────────
  { name: 'Tartelette de Chocolat & Fraise',                   unit: 'un',         quantity_per_person: 1.0000, cost_per_unit:  6.50 },
  { name: 'Tartelette au Caramel Salé',                        unit: 'un',         quantity_per_person: 1.0000, cost_per_unit:  6.50 },

  // ── Serviço Volante ──────────────────────────────────────────────────────────
  { name: 'Salgados Linha Fritura Diversos',                   unit: 'un',         quantity_per_person: 4.0000, cost_per_unit:  1.50 },
  { name: 'Caldo de Feijão',                                   unit: 'copo',       quantity_per_person: 1.0000, cost_per_unit:  3.00 },

  // ── Louças ── (itens 23-24 → fecham os R$ 116,25/pessoa) ─────────────────────
  { name: 'Copos Paulistinha',                                  unit: 'un',         quantity_per_person: 2.0000, cost_per_unit:  0.90 },
  { name: 'Pratos de Sobremesa',                                unit: 'un',         quantity_per_person: 1.0000, cost_per_unit:  0.65 },

  // ── Serviços (cobrados à parte) ──────────────────────────────────────────────
  //  0,025/pessoa → 1 auxiliar por 40 convidados
  { name: 'Auxiliar de Cozinha',                               unit: 'profissional', quantity_per_person: 0.0250, cost_per_unit: 200.00 },
  //  0,0125/pessoa → 1 garçom por 80 convidados
  { name: 'Garçom',                                            unit: 'profissional', quantity_per_person: 0.0125, cost_per_unit: 200.00 },

  // ── Bebidas (cobradas à parte ou incluídas no pacote) ────────────────────────
  { name: 'Refrigerante (Zero e Tradicional)',                 unit: 'un',         quantity_per_person: 1.0000, cost_per_unit:  3.50 },
  { name: 'Água Mineral',                                      unit: 'un',         quantity_per_person: 1.0000, cost_per_unit:  2.00 },
  { name: 'Suco',                                              unit: 'copo',       quantity_per_person: 1.0000, cost_per_unit:  3.50 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) { return typeof v === 'number' ? v.toFixed(2) : v; }

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Garante que as colunas cnpj/address existem (idempotente) ─────────────
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cnpj    VARCHAR(20)  DEFAULT ''`);
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address VARCHAR(255) DEFAULT ''`);
    console.log('✓ Colunas cnpj/address garantidas na tabela tenants');

    // 1. Criar (ou recuperar) tenant — e garantir que phone/email/cnpj estejam preenchidos ──
    let tenantId;
    const existingTenant = await client.query(
      `SELECT id FROM tenants WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [TENANT_NAME]
    );
    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      console.log(`✓ Tenant já existe: ${TENANT_NAME} (${tenantId})`);
      // Garante que phone/email/address/cnpj estejam atualizados no banco
      await client.query(
        `UPDATE tenants
            SET phone   = COALESCE(NULLIF(phone, ''),   $2),
                email   = COALESCE(NULLIF(email, ''),   $3),
                cnpj    = COALESCE(NULLIF(cnpj, ''),    $4),
                address = COALESCE(NULLIF(address, ''), $5)
          WHERE id = $1`,
        [tenantId, TENANT_PHONE, TENANT_EMAIL, TENANT_CNPJ, TENANT_ADDRESS]
      );
      console.log(`  (phone/email/address atualizados se estavam vazios)`);
    } else {
      const res = await client.query(
        `INSERT INTO tenants (name, phone, email, cnpj, address)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [TENANT_NAME, TENANT_PHONE, TENANT_EMAIL, TENANT_CNPJ, TENANT_ADDRESS]
      );
      tenantId = res.rows[0].id;
      console.log(`✓ Tenant criado: ${TENANT_NAME} (${tenantId})`);
    }

    // 2. Criar (ou recuperar) usuário ─────────────────────────────────────────
    const existingUser = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [USER_EMAIL]
    );
    if (existingUser.rows.length > 0) {
      console.log(`✓ Usuário já existe: ${USER_EMAIL} (${existingUser.rows[0].id})`);
    } else {
      const hash = await bcrypt.hash(USER_PASS, 10);
      const uRes = await client.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
        [tenantId, USER_NAME, USER_EMAIL, hash]
      );
      console.log(`✓ Usuário criado: ${USER_NAME} (${uRes.rows[0].id})`);
    }

    // 3. Garantir tabelas de templates ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_templates (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        event_type  VARCHAR(100),
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS template_items (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id         UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
        tenant_id           UUID NOT NULL,
        name                VARCHAR(255) NOT NULL,
        unit                VARCHAR(50) NOT NULL DEFAULT 'unidade',
        quantity_per_person DECIMAL(10,4) NOT NULL DEFAULT 1,
        cost_per_unit       DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 4. Criar (ou recriar) template ──────────────────────────────────────────
    // Se já existir, apaga e recria para ter os itens atualizados
    const existingTpl = await client.query(
      `SELECT id FROM event_templates
       WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [tenantId, TEMPLATE.name]
    );
    if (existingTpl.rows.length > 0) {
      await client.query(
        `DELETE FROM event_templates WHERE id = $1`,
        [existingTpl.rows[0].id]
      );
      console.log(`  (template anterior removido para recriação)`);
    }

    const tplRes = await client.query(
      `INSERT INTO event_templates (tenant_id, name, description, event_type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, TEMPLATE.name, TEMPLATE.description, TEMPLATE.event_type]
    );
    const templateId = tplRes.rows[0].id;
    console.log(`✓ Template criado: ${TEMPLATE.name} (${templateId})`);

    // 5. Inserir itens ─────────────────────────────────────────────────────────
    let ppTotal = 0;
    for (const item of ITEMS) {
      await client.query(
        `INSERT INTO template_items
           (template_id, tenant_id, name, unit, quantity_per_person, cost_per_unit)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [templateId, tenantId, item.name, item.unit, item.quantity_per_person, item.cost_per_unit]
      );
      const pp = item.quantity_per_person * item.cost_per_unit;
      ppTotal += pp;
      console.log(`  + ${item.name.padEnd(52)} ${String(item.quantity_per_person).padStart(6)}/pp × R$${fmt(item.cost_per_unit)} = R$${fmt(pp)}/pp`);
    }

    // 6. Criar leads de exemplo ───────────────────────────────────────────────
    const SAMPLE_LEADS = [
      { name: 'Ana Paula Ferreira',  email: 'ana.paula@gmail.com',    phone: '21 98765-4321', company: '',             event_type: 'Casamento',      value: 12000 },
      { name: 'Carlos e Fernanda',   email: 'carlos.fernanda@gmail.com', phone: '21 97654-3210', company: '',          event_type: 'Casamento',      value: 15000 },
      { name: 'Empresa TechBrasil',  email: 'eventos@techbrasil.com', phone: '21 3322-1100',   company: 'TechBrasil', event_type: 'Corporativo',    value: 8000  },
      { name: 'Família Rodrigues',   email: 'mrodrigues@gmail.com',   phone: '21 99123-4567', company: '',             event_type: 'Festa Infantil', value: 5000  },
      { name: 'Mariana Costa',       email: 'mariana.costa@gmail.com', phone: '21 98888-7777', company: '',            event_type: '15 Anos',        value: 9500  },
    ];

    let leadsCreated = 0;
    for (const lead of SAMPLE_LEADS) {
      const existing = await client.query(
        `SELECT id FROM leads WHERE LOWER(email) = LOWER($1) AND tenant_id = $2 LIMIT 1`,
        [lead.email, tenantId]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO leads (name, email, phone, company, value, status, source, stage, event_type, tenant_id)
           VALUES ($1, $2, $3, $4, $5, 'novo', 'indicação', 'lead', $6, $7)`,
          [lead.name, lead.email, lead.phone, lead.company, lead.value, lead.event_type, tenantId]
        );
        console.log(`  + Lead: ${lead.name}`);
        leadsCreated++;
      } else {
        console.log(`  ✓ Lead já existe: ${lead.name}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n─────────────────────────────────────────────────────────────');
    console.log(`✅  CONCLUÍDO!`);
    console.log(`    Empresa   : ${TENANT_NAME}  (tenant_id: ${tenantId})`);
    console.log(`    Usuário   : ${USER_NAME}  (${USER_EMAIL})`);
    console.log(`    Senha     : ${USER_PASS}`);
    console.log(`    Template  : ${TEMPLATE.name}  (${ITEMS.length} itens)`);
    console.log(`    Leads     : ${leadsCreated} criados / ${SAMPLE_LEADS.length} total`);
    console.log(`    Total/pp  : R$ ${fmt(ppTotal)}  (referência: R$ 116,25/pessoa)`);
    console.log(`    Total/80p : R$ ${fmt(ppTotal * 80)}  (referência: R$ 9.300,00)`);
    console.log('─────────────────────────────────────────────────────────────');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro — ROLLBACK executado:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
