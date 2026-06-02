/**
 * security-smoke-test.js
 * Testes rápidos de segurança contra o backend local.
 * Executa em ~5s e verifica os controles mais críticos.
 *
 * Uso:
 *   node scripts/security-smoke-test.js [http://localhost:5000]
 *
 * Retorna exit code 0 se todos os testes passarem, 1 se algum falhar.
 */

const BASE_URL = process.argv[2] || 'http://localhost:5000';
let passed = 0;
let failed = 0;

async function request(method, path, opts = {}) {
  const { fetch } = await import('node-fetch').catch(() => ({ fetch: global.fetch }));
  const fn = fetch || (await import('node-fetch')).default;
  const res = await fn(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'omit',
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function assert(name, condition, details = '') {
  if (condition) {
    console.log(`  ✅  ${name}`);
    passed++;
  } else {
    console.error(`  ❌  ${name}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

async function run() {
  console.log(`\n🔒 Security Smoke Test — ${BASE_URL}\n`);

  // ── 1. Rota inexistente retorna 404, não stack trace ──────────────────────
  console.log('1. 404 handling');
  const r404 = await request('GET', '/api/this-does-not-exist');
  assert('404 retorna status 404', r404.status === 404);
  assert('404 não vaza stack trace', !JSON.stringify(r404.body).includes('at Object.<anonymous>'));

  // ── 2. Rotas protegidas sem token retornam 401 ────────────────────────────
  console.log('\n2. Autenticação obrigatória');
  for (const path of ['/api/clients', '/api/leads', '/api/quotations', '/api/events', '/api/team', '/api/billing/stats']) {
    const r = await request('GET', path);
    assert(`GET ${path} sem token → 401`, r.status === 401, `got ${r.status}`);
  }

  // ── 3. Rotas de admin sem token retornam 401 ──────────────────────────────
  console.log('\n3. Admin routes sem token');
  const radmin = await request('GET', '/api/admin/tenants');
  assert('GET /api/admin/tenants sem token → 401', radmin.status === 401, `got ${radmin.status}`);

  // ── 4. Setup route bloqueado por padrão ───────────────────────────────────
  console.log('\n4. Setup route guard');
  const rsetup = await request('POST', '/setup/create-test-user', { body: {} });
  assert('/setup/create-test-user bloqueado (403) sem ALLOW_SETUP', rsetup.status === 403, `got ${rsetup.status}`);

  // ── 5. Login com credenciais inválidas retorna 401 ────────────────────────
  console.log('\n5. Login inválido');
  const rlogin = await request('POST', '/auth/login', {
    body: { email: 'hacker@fake.com', password: 'wrongpassword123' }
  });
  assert('Login inválido → 401', rlogin.status === 401, `got ${rlogin.status}`);
  assert('Login inválido não vaza detalhes', !JSON.stringify(rlogin.body).toLowerCase().includes('sql'), `body: ${JSON.stringify(rlogin.body)}`);

  // ── 6. Headers de segurança presentes ─────────────────────────────────────
  console.log('\n6. Security headers');
  const { fetch: fetchFn } = await import('node-fetch').catch(() => ({}));
  const fn = fetchFn || (await import('node-fetch')).default;
  const hres = await fn(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'x@x.com', password: 'xxxxxxxx' }),
  });
  assert('X-Content-Type-Options presente',     hres.headers.get('x-content-type-options') === 'nosniff');
  assert('X-Frame-Options ou CSP frameAncestors', hres.headers.get('x-frame-options') || hres.headers.get('content-security-policy')?.includes('frame-ancestors'));
  assert('X-Powered-By removido',               !hres.headers.get('x-powered-by'));

  // ── 7. Rate limit no login ─────────────────────────────────────────────────
  console.log('\n7. Rate limit no login (11 tentativas rápidas)');
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await request('POST', '/auth/login', { body: { email: 'x@x.com', password: 'xxxxxxxx' } });
    if (r.status === 429) { got429 = true; break; }
  }
  assert('Rate limit ativo no login (429 após excesso)', got429);

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\n──────────────────────────────────────────`);
  console.log(`Resultado: ${passed} passaram, ${failed} falharam`);
  if (failed > 0) {
    console.error('❌ Alguns testes falharam. Corrija antes de fazer deploy.\n');
    process.exit(1);
  } else {
    console.log('✅ Todos os testes passaram!\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Erro ao executar testes:', err.message);
  process.exit(1);
});
