const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const createTestUser = async () => {
  let client;
  try {
    client = await pool.connect();
    
    // 1. Criar Tenant
    console.log('📝 Criando tenant...');
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, email, phone, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING id, name`,
      ['Buffet Teste', 'buffet@teste.com', '(11) 99999-9999']
    );
    
    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant criado:', tenant.name);
    
    // 2. Criar Usuário
    console.log('📝 Criando usuário...');
    const password = 'Teste123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, tenant_id, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, true) 
       RETURNING id, name, email, role`,
      [
        'Admin Teste',
        'admin@teste.com',
        hashedPassword,
        tenant.id,
        'admin'
      ]
    );
    
    const user = userResult.rows[0];
    console.log('✅ Usuário criado:', user.name);
    
    // 3. Criar alguns membros de equipe para teste
    console.log('📝 Criando membros da equipe...');
    const teamMembers = [
      {
        nome: 'João da Silva',
        cpf: '123.456.789-00',
        rg: '12.345.678-0',
        email: 'joao@buffet.com',
        chave_pix: 'joao@pixkey',
        funcao: 'Garcom'
      },
      {
        nome: 'Maria da Cozinha',
        cpf: '987.654.321-00',
        rg: '98.765.432-0',
        email: 'maria@buffet.com',
        chave_pix: 'maria@pixkey',
        funcao: 'Cozinha'
      },
      {
        nome: 'Carlos Churrasco',
        cpf: '456.789.123-00',
        rg: '45.678.912-0',
        email: 'carlos@buffet.com',
        chave_pix: 'carlos@pixkey',
        funcao: 'Churrasqueiro'
      }
    ];
    
    for (const member of teamMembers) {
      await client.query(
        `INSERT INTO team_members (tenant_id, nome, cpf, rg, email, chave_pix, funcao, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [tenant.id, member.nome, member.cpf, member.rg, member.email, member.chave_pix, member.funcao]
      );
    }
    console.log('✅ 3 membros da equipe criados');
    
    console.log('\n========================================');
    console.log('✨ USUÁRIO DE TESTE CRIADO COM SUCESSO!');
    console.log('========================================\n');
    console.log('📊 Tenant ID:', tenant.id);
    console.log('👤 Usuário:', user.name);
    console.log('📧 Email:', user.email);
    console.log('🔑 Senha:', password);
    console.log('🎯 Role:', user.role);
    console.log('\n========================================');
    console.log('🌐 Acesse: http://localhost:3001');
    console.log('📧 Digite o email: admin@teste.com');
    console.log('🔑 Digite a senha: Teste123!');
    console.log('========================================\n');
    
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    if (err.code === '42P01') {
      console.error('⚠️  Tabelas não existem. Execute as migrations primeiro.');
    }
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
};

createTestUser();
