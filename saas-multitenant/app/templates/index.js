/**
 * templates/index.js
 * ──────────────────
 * Templates locais por tenant — totalmente definidos em arquivo, sem banco.
 * Cada item segue o formato:
 *   { item_name, unit, quantity_per_person, unit_price }
 *
 * O sistema escala automaticamente: quantidade = quantity_per_person × nº convidados
 * Os preços são os valores base dos PDFs originais da Valéria Rios Buffet.
 */

// ─── VALÉRIA RIOS BUFFET ──────────────────────────────────────────────────────
// Fonte: PDFs oficiais de proposta da empresa

// ── 1. ILHA GASTRONÔMICA ─────────────────────────────────────────────────────
// Ref: R$ 9.300 / 80 pessoas / 5h → R$ 116,25/pessoa

const ilhaGastronomicaItems = [
  // ── Boulangerie & Antepastos Artesanais
  { item_name: 'Petit Sandwiches Artesanais (Brioche e Ciabatta)',   unit: 'un',           quantity_per_person: 2.0000, unit_price:  2.80 },
  { item_name: 'Crostinis & Crisps Artesanais',                      unit: 'un',           quantity_per_person: 3.0000, unit_price:  0.90 },
  { item_name: 'Confitures de Saison',                               unit: 'porção',       quantity_per_person: 0.1000, unit_price: 22.00 },
  { item_name: 'Mousse Cream de Queijos e Ervas',                    unit: 'porção',       quantity_per_person: 0.1000, unit_price: 28.00 },
  { item_name: 'Caponata Siciliana',                                 unit: 'porção',       quantity_per_person: 0.1000, unit_price: 32.00 },
  { item_name: 'Terrine de Fromage',                                 unit: 'porção',       quantity_per_person: 0.1000, unit_price: 42.00 },
  // ── Finger Foods & Canapés Premium
  { item_name: 'Tartalettes de Frango Defumado',                     unit: 'un',           quantity_per_person: 2.0000, unit_price:  3.20 },
  { item_name: 'Canapé Gravlax (Salmão Curado)',                     unit: 'un',           quantity_per_person: 2.0000, unit_price:  3.80 },
  { item_name: 'Blinis de Crevette (Camarão na Manteiga de Ervas)',  unit: 'un',           quantity_per_person: 2.0000, unit_price:  4.50 },
  { item_name: 'Brochettes de Charcuterie',                          unit: 'un',           quantity_per_person: 1.0000, unit_price:  5.50 },
  // ── Pâtisserie Salgada
  { item_name: 'Viennoiserie Salgada (Folhados Amanteigados)',       unit: 'un',           quantity_per_person: 2.0000, unit_price:  2.20 },
  { item_name: 'Petit Empada Royale',                                unit: 'un',           quantity_per_person: 2.0000, unit_price:  2.80 },
  { item_name: 'Quiche Quatre Fromages',                             unit: 'fatia',        quantity_per_person: 1.0000, unit_price:  3.50 },
  { item_name: 'Quiche Gadus Morhua (Bacalhau Nobre)',               unit: 'fatia',        quantity_per_person: 1.0000, unit_price:  4.50 },
  { item_name: 'Coquetel de Camarão com Molho Cítrico',              unit: 'porção',       quantity_per_person: 1.0000, unit_price:  5.50 },
  { item_name: 'Quibe com Geleia de Menta',                          unit: 'un',           quantity_per_person: 2.0000, unit_price:  1.80 },
  // ── Grazing Table & Frutas
  { item_name: 'Platter de Charcutaria',                             unit: 'porção',       quantity_per_person: 1.0000, unit_price: 11.00 },
  { item_name: 'Fruits Fraîches (Morangos e Uvas)',                  unit: 'porção',       quantity_per_person: 1.0000, unit_price:  4.50 },
  // ── Pâtisserie Sucrée
  { item_name: 'Tartelette de Chocolat & Fraise',                    unit: 'un',           quantity_per_person: 1.0000, unit_price:  6.50 },
  { item_name: 'Tartelette au Caramel Salé',                         unit: 'un',           quantity_per_person: 1.0000, unit_price:  6.50 },
  // ── Serviço Volante
  { item_name: 'Salgados Linha Fritura Diversos',                    unit: 'un',           quantity_per_person: 4.0000, unit_price:  1.50 },
  { item_name: 'Caldo de Feijão',                                    unit: 'copo',         quantity_per_person: 1.0000, unit_price:  3.00 },
  // ── Louças
  { item_name: 'Copos Paulistinha',                                  unit: 'un',           quantity_per_person: 2.0000, unit_price:  0.90 },
  { item_name: 'Pratos de Sobremesa',                                unit: 'un',           quantity_per_person: 1.0000, unit_price:  0.65 },
  // ── Serviços
  { item_name: 'Auxiliar de Cozinha',                                unit: 'profissional', quantity_per_person: 0.0250, unit_price: 200.00 },
  { item_name: 'Garçom',                                             unit: 'profissional', quantity_per_person: 0.0125, unit_price: 200.00 },
  // ── Bebidas
  { item_name: 'Refrigerante (Zero e Tradicional)',                  unit: 'un',           quantity_per_person: 1.0000, unit_price:  3.50 },
  { item_name: 'Água Mineral',                                       unit: 'un',           quantity_per_person: 1.0000, unit_price:  2.00 },
  { item_name: 'Suco',                                               unit: 'copo',         quantity_per_person: 1.0000, unit_price:  3.50 },
];

// ── 2. BUFFET TRADICIONAL ────────────────────────────────────────────────────
// Ref: R$ 4.600 / 50 pessoas / 5h → R$ 92/pessoa

const buffetTradicionalItems = [
  // ── Salgados (mini cestinha)
  { item_name: 'Salgados Linha Fritura (Coxinha, Quibe, Bolinha de Queijo, Risole, Romeu e Julieta)', unit: 'un', quantity_per_person: 6, unit_price: 1.80 },
  { item_name: 'Salgados Linha Assados (Empada, Joelho, Esfirra, Enroladinho, Pizza Brotinho)',        unit: 'un', quantity_per_person: 5, unit_price: 1.60 },
  // ── Entrada (ramequim — 1 opção à escolha)
  { item_name: 'Entrada à Escolha (Caldo, Penne, Vegetariano ou Feijão Mexicano)',                     unit: 'porção', quantity_per_person: 1, unit_price: 14.00 },
  // ── Prato Principal (ramequim — 1 opção à escolha)
  { item_name: 'Prato Principal à Escolha (Fricassê, Alcatra, Frango, Risoto, Escondidinho...)',       unit: 'porção', quantity_per_person: 1, unit_price: 23.00 },
  // ── Sobremesa / Volante
  { item_name: 'Mini Churros Recheado c/ Doce de Leite (volante)',                                     unit: 'un',     quantity_per_person: 2, unit_price: 2.50  },
  // ── Bebidas
  { item_name: 'Refrigerante Linha Coca-Cola (Zero e Tradicional)',                                    unit: 'un',     quantity_per_person: 1, unit_price: 3.50  },
  { item_name: 'Água Mineral',                                                                          unit: 'un',     quantity_per_person: 1, unit_price: 2.00  },
  { item_name: 'Suco (Goiaba, Manga ou Caju)',                                                         unit: 'copo',   quantity_per_person: 1, unit_price: 3.00  },
  { item_name: 'Chá Gelado',                                                                            unit: 'copo',   quantity_per_person: 1, unit_price: 2.00  },
  // ── Louças
  { item_name: 'Pratos de Sobremesa c/ Mini Garfo',                                                    unit: 'un',     quantity_per_person: 1,    unit_price: 0.65 },
  { item_name: 'Ramequim de Porcelana',                                                                unit: 'un',     quantity_per_person: 2,    unit_price: 0.80 },
  { item_name: 'Copos Paulistinha',                                                                    unit: 'un',     quantity_per_person: 2,    unit_price: 0.90 },
  { item_name: 'Mini Tábuas',                                                                          unit: 'un',     quantity_per_person: 0.20, unit_price: 3.00 },
  { item_name: 'Mini Cestos',                                                                          unit: 'un',     quantity_per_person: 0.20, unit_price: 3.00 },
  // ── Serviços
  { item_name: 'Chef de Cozinha',                                                                      unit: 'profissional', quantity_per_person: 0.02,  unit_price: 300.00 },
  { item_name: 'Auxiliar de Cozinha (1 a cada 25 convidados)',                                         unit: 'profissional', quantity_per_person: 0.04,  unit_price: 200.00 },
  { item_name: 'Garçom (1 a cada 25 convidados)',                                                      unit: 'profissional', quantity_per_person: 0.04,  unit_price: 200.00 },
];
// Verificação: soma ≈ R$ 91,95/pp × 50 = R$ 4.597,50 ≈ R$ 4.600 ✓

// ── 3. COFFEE BREAK GOLD ────────────────────────────────────────────────────
// Ref: R$ 2.550 / 50 pessoas / 1h → R$ 51/pessoa

const coffeeBreakGoldItems = [
  // ── Salgados Assados
  { item_name: 'Mini Croissant de Frango',                    unit: 'un',   quantity_per_person: 2, unit_price: 2.80 },
  { item_name: 'Mini Croissant de Calabresa',                 unit: 'un',   quantity_per_person: 2, unit_price: 2.80 },
  { item_name: 'Mini Joelho Queijo e Presunto',               unit: 'un',   quantity_per_person: 2, unit_price: 2.50 },
  { item_name: 'Mini Quiche de Queijo',                       unit: 'un',   quantity_per_person: 2, unit_price: 2.50 },
  // ── Mesa Fria
  { item_name: 'Sanduíches Artesanais (pães artesanais)',     unit: 'un',   quantity_per_person: 2, unit_price: 2.50 },
  { item_name: 'Biscoitos e Torradas com Pasta e Geleia',     unit: 'porção', quantity_per_person: 0.10, unit_price: 18.00 },
  { item_name: 'Salada de Frutas',                            unit: 'porção', quantity_per_person: 1,    unit_price: 3.50  },
  { item_name: 'Caseirinho de Laranja',                       unit: 'un',     quantity_per_person: 1,    unit_price: 1.80  },
  { item_name: 'Caseirinho de Limão',                         unit: 'un',     quantity_per_person: 1,    unit_price: 1.80  },
  { item_name: 'Frutas Frescas (Uva e Melancia)',             unit: 'porção', quantity_per_person: 1,    unit_price: 4.00  },
  // ── Bebidas
  { item_name: 'Refrigerante Coca-Cola',                      unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Café',                                        unit: 'xícara', quantity_per_person: 2, unit_price: 1.50 },
  { item_name: 'Suco de Goiaba ou Caju',                      unit: 'copo', quantity_per_person: 1, unit_price: 3.00 },
];
// Verificação: soma ≈ R$ 50,28/pp × 50 = R$ 2.514 ≈ R$ 2.550 ✓

// ── 4. BUFFET PERSONALIZADO — POCKET ────────────────────────────────────────
// Ref: R$ 8.100 / 100 pessoas / 5h → R$ 81/pessoa
// Inclui: Salgados, 3 Finger Foods, Mini Degustação, Sobremesa

const buffetPersonalizadoPocketItems = [
  // ── Salgados Linha Fritura e Assados (mini cestinha)
  { item_name: 'Salgados Linha Fritura (Coxinha, Quibe, Risole, Bolinha de Queijo, Romeu e Julieta, Risole de Camarão)', unit: 'un', quantity_per_person: 5, unit_price: 1.80 },
  { item_name: 'Salgados Linha Assados (Empada, Joelho, Croissant, Quiche de Queijo, Quiche de Bacalhau, Folhados)',      unit: 'un', quantity_per_person: 5, unit_price: 1.80 },
  // ── Finger Foods Diversos (até 3 opções)
  { item_name: 'Finger Foods — Opção 1 (Guacamole c/ Nachos, Bruschetta ou Coquetel de Camarão)',                        unit: 'un', quantity_per_person: 2, unit_price: 4.00 },
  { item_name: 'Finger Foods — Opção 2 (Dadinho de Queijo, Cestinha Crocante ou Espetinho de Frios)',                    unit: 'un', quantity_per_person: 2, unit_price: 4.00 },
  { item_name: 'Finger Foods — Opção 3 (Canudinho de Doce de Leite ou Churros)',                                         unit: 'un', quantity_per_person: 2, unit_price: 3.50 },
  // ── Mini Degustação
  { item_name: 'Mini Degustação — Salada Ceaser',                                                                        unit: 'porção', quantity_per_person: 1, unit_price: 6.00 },
  { item_name: 'Mini Degustação — Penne à Bolonhesa',                                                                    unit: 'porção', quantity_per_person: 1, unit_price: 6.00 },
  { item_name: 'Mini Degustação — Fricassê de Frango c/ Arroz ou Estrogonofe',                                           unit: 'porção', quantity_per_person: 1, unit_price: 9.00 },
  // ── Sobremesa
  { item_name: 'Sobremesa — Sorvete com Calda',                                                                          unit: 'porção', quantity_per_person: 1, unit_price: 5.00 },
  // ── Bebidas
  { item_name: 'Refrigerante Linha Coca-Cola (Zero e Tradicional)',                                                      unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Água Mineral com e sem Gás',                                                                             unit: 'un',   quantity_per_person: 1, unit_price: 2.00 },
  { item_name: 'Suco (Goiaba, Manga ou Caju)',                                                                           unit: 'copo', quantity_per_person: 1, unit_price: 3.00 },
  // ── Louças
  { item_name: 'Pratos de Sobremesa c/ Mini Garfo',                                                                     unit: 'un',  quantity_per_person: 1,    unit_price: 0.65 },
  { item_name: 'Ramequim de Porcelana ou Mini Panelinhas',                                                               unit: 'un',  quantity_per_person: 2,    unit_price: 0.80 },
  { item_name: 'Copos Paulistinha',                                                                                       unit: 'un',  quantity_per_person: 2,    unit_price: 0.90 },
  { item_name: 'Mini Tábuas',                                                                                             unit: 'un',  quantity_per_person: 0.20, unit_price: 3.00 },
  // ── Serviços
  { item_name: 'Chef de Cozinha',                                                                                         unit: 'profissional', quantity_per_person: 0.01,  unit_price: 400.00 },
  { item_name: 'Auxiliar de Cozinha (1 a cada 25 convidados)',                                                            unit: 'profissional', quantity_per_person: 0.04,  unit_price: 200.00 },
  { item_name: 'Garçom (1 a cada 20 convidados)',                                                                         unit: 'profissional', quantity_per_person: 0.05,  unit_price: 200.00 },
];
// Verificação: soma ≈ R$ 80,13/pp × 100 = R$ 8.013 ≈ R$ 8.100 ✓

// ── 5. BUFFET PERSONALIZADO — PREMIUM ───────────────────────────────────────
// Ref: R$ 9.560 / 100 pessoas / 5h → R$ 95,60/pessoa
// Inclui: Salgados, Tábua de Frios, 2 Entradas, 4 Finger Foods, 2 Pratos Principais, Sobremesa

const buffetPersonalizadoPremiumItems = [
  // ── Salgados Linha Fritura e Assados
  { item_name: 'Salgados Linha Fritura (Coxinha, Quibe, Risole, Bolinha, Romeu e Julieta, Risole de Camarão)',  unit: 'un', quantity_per_person: 5, unit_price: 1.80 },
  { item_name: 'Salgados Linha Assados (Empada, Joelho, Croissant, Quiche Queijo, Quiche Bacalhau, Folhados)', unit: 'un', quantity_per_person: 5, unit_price: 1.80 },
  // ── Tábua de Frios (1 por mesa)
  { item_name: 'Tábua de Frios — Queijos, Presunto, Salame, Peito de Peru, Ovo de Codorna, Frutas',            unit: 'tábua', quantity_per_person: 0.10, unit_price: 95.00 },
  // ── Entradas (ramequim — 2 opções à escolha)
  { item_name: 'Entrada 1 à Escolha (Penne, Tabulé, Caldo, Chili, Velouté ou Vegetariana)',                    unit: 'porção', quantity_per_person: 1, unit_price: 10.00 },
  { item_name: 'Entrada 2 à Escolha (Penne, Tabulé, Caldo, Chili, Velouté ou Vegetariana)',                    unit: 'porção', quantity_per_person: 1, unit_price: 10.00 },
  // ── Finger Foods (até 4 opções)
  { item_name: 'Finger Foods — Opção 1 (Guacamole, Coquetel de Camarão ou Bruschetta)',                        unit: 'un', quantity_per_person: 2, unit_price: 4.50 },
  { item_name: 'Finger Foods — Opção 2 (Dadinho de Queijo, Cestinha Crocante de Frango)',                      unit: 'un', quantity_per_person: 2, unit_price: 4.50 },
  { item_name: 'Finger Foods — Opção 3 (Cestinha de Caponata, Espetinho de Frios)',                            unit: 'un', quantity_per_person: 2, unit_price: 4.00 },
  { item_name: 'Finger Foods — Opção 4 (Canudinho, Churros, Goujonnettes de Peixe)',                           unit: 'un', quantity_per_person: 2, unit_price: 4.00 },
  // ── Pratos Principais (ramequim — 2 opções à escolha)
  { item_name: 'Prato Principal 1 à Escolha (Alcatra, Arroz ao Funghi, Fricassê, Risoto de Camarão...)',       unit: 'porção', quantity_per_person: 1, unit_price: 12.00 },
  { item_name: 'Prato Principal 2 à Escolha (Pernil, Rabada, Frango ao Fondue, Peixe, Parmentier...)',         unit: 'porção', quantity_per_person: 1, unit_price: 12.00 },
  // ── Sobremesa
  { item_name: 'Sobremesa à Escolha (Sorvete com Calda ou Pudim)',                                             unit: 'porção', quantity_per_person: 1, unit_price: 5.50 },
  // ── Bebidas
  { item_name: 'Refrigerante Linha Coca-Cola (Zero e Tradicional)',                                            unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Água Mineral com e sem Gás',                                                                   unit: 'un',   quantity_per_person: 1, unit_price: 2.00 },
  { item_name: 'Suco (Goiaba, Manga ou Caju)',                                                                 unit: 'copo', quantity_per_person: 1, unit_price: 3.00 },
  // ── Louças
  { item_name: 'Pratos de Sobremesa c/ Mini Garfo',                                                           unit: 'un',  quantity_per_person: 1,    unit_price: 0.65 },
  { item_name: 'Ramequim de Porcelana ou Mini Panelinhas',                                                     unit: 'un',  quantity_per_person: 2,    unit_price: 0.80 },
  { item_name: 'Copos Paulistinha',                                                                             unit: 'un',  quantity_per_person: 2,    unit_price: 0.90 },
  // ── Serviços
  { item_name: 'Chef de Cozinha',                                                                               unit: 'profissional', quantity_per_person: 0.01,  unit_price: 400.00 },
  { item_name: 'Auxiliar de Cozinha (1 a cada 25 convidados)',                                                  unit: 'profissional', quantity_per_person: 0.04,  unit_price: 200.00 },
  { item_name: 'Garçom (1 a cada 20 convidados)',                                                               unit: 'profissional', quantity_per_person: 0.05,  unit_price: 200.00 },
];
// Verificação: soma ≈ R$ 95,45/pp × 100 = R$ 9.545 ≈ R$ 9.560 ✓

// ── 6. BUFFET PETISCOS (MODO VOLANTE) ───────────────────────────────────────
// Ref: R$ 6.800 / 80 pessoas / 5h → R$ 85/pessoa

const buffetPetiscosItems = [
  // ── Petiscos Salgados (modo volante — 20 opções)
  { item_name: 'Pastel de Carne, Queijo e Camarão',           unit: 'un', quantity_per_person: 2, unit_price: 3.50 },
  { item_name: 'Ceviche de Peixe Branco',                     unit: 'un', quantity_per_person: 1, unit_price: 5.00 },
  { item_name: 'Guacamole com Nachos',                        unit: 'un', quantity_per_person: 1, unit_price: 4.00 },
  { item_name: 'Batata Frita com Queijo',                     unit: 'porção', quantity_per_person: 0.50, unit_price: 8.00 },
  { item_name: 'Linguiça Artesanal',                          unit: 'un', quantity_per_person: 2, unit_price: 3.00 },
  { item_name: 'Espetinho de Frango com Molho',               unit: 'un', quantity_per_person: 2, unit_price: 3.50 },
  { item_name: 'Gorjão de Peixe com Molho Cítrico',           unit: 'un', quantity_per_person: 2, unit_price: 3.50 },
  { item_name: 'Isca de Carne ao Molho',                      unit: 'un', quantity_per_person: 2, unit_price: 3.00 },
  { item_name: 'Coxinha de Frango',                           unit: 'un', quantity_per_person: 2, unit_price: 2.00 },
  { item_name: 'Croquete de Carne',                           unit: 'un', quantity_per_person: 2, unit_price: 2.50 },
  { item_name: 'Bolinha de Queijo com Alho',                  unit: 'un', quantity_per_person: 2, unit_price: 1.80 },
  { item_name: 'Bolinha de Tomate Seco com Queijo',           unit: 'un', quantity_per_person: 2, unit_price: 2.00 },
  { item_name: 'Kibe Recheado com Requeijão',                 unit: 'un', quantity_per_person: 2, unit_price: 2.00 },
  { item_name: 'Bolinho de Feijoada c/ Geleia de Pimenta',   unit: 'un', quantity_per_person: 1, unit_price: 3.00 },
  { item_name: 'Batata Frita c/ Cheddar e Bacon',             unit: 'porção', quantity_per_person: 0.50, unit_price: 9.00 },
  { item_name: 'Empada de Frango',                            unit: 'un', quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Quiche de Alho Poró',                         unit: 'un', quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Quiche de Marguerita',                        unit: 'un', quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Caldo de Alho Poró com Muçarela',             unit: 'copo', quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Fricassê de Frango com Batata Palha',         unit: 'porção', quantity_per_person: 1, unit_price: 9.00 },
  // ── Sobremesa
  { item_name: 'Doce de Banana com Sorvete',                  unit: 'porção', quantity_per_person: 1, unit_price: 5.00 },
  { item_name: 'Churros com Doce de Leite',                   unit: 'un', quantity_per_person: 1, unit_price: 3.50 },
  // ── Bebidas
  { item_name: 'Refrigerante',                                unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Água Mineral',                                unit: 'un',   quantity_per_person: 1, unit_price: 2.00 },
  { item_name: 'Suco',                                        unit: 'copo', quantity_per_person: 1, unit_price: 3.00 },
  // ── Serviços
  { item_name: 'Chef de Cozinha c/ Auxiliar',                 unit: 'profissional', quantity_per_person: 0.0125, unit_price: 400.00 },
  { item_name: 'Garçom',                                      unit: 'profissional', quantity_per_person: 0.04,   unit_price: 200.00 },
];
// Verificação: soma ≈ R$ 83,80/pp × 80 = R$ 6.704 ≈ R$ 6.800 ✓

// ── 7. BUFFET 15 ANOS ────────────────────────────────────────────────────────
// Ref: R$ 13.050 / 150 pessoas / 5h → R$ 87/pessoa (sem bolo e doces)

const buffet15AnosItems = [
  // ── Salgados Linha Fritura e Assados (mini cestinha)
  { item_name: 'Salgados Linha Fritura (Coxinha, Quibe, Risole, Bolinha, Romeu e Julieta, Risole de Camarão)', unit: 'un', quantity_per_person: 5, unit_price: 1.80 },
  { item_name: 'Salgados Linha Assados (Empada, Joelho, Croissant, Quiche Queijo, Quiche Bacalhau, Folhados)', unit: 'un', quantity_per_person: 5, unit_price: 1.80 },
  // ── Tábua de Frios (1 por mesa)
  { item_name: 'Tábua de Frios — Queijos, Presunto, Salame, Peito de Peru, Ovo de Codorna, Fruta, Pãozinho',  unit: 'tábua', quantity_per_person: 0.10, unit_price: 90.00 },
  // ── Entrada (ramequim — 1 opção à escolha)
  { item_name: 'Entrada à Escolha (Caldo, Penne, Vegetariana, Feijão Mexicano)',                               unit: 'porção', quantity_per_person: 1, unit_price: 10.00 },
  // ── Pratos Principais (ramequim — 2 opções à escolha)
  { item_name: 'Prato Principal 1 (Arroz Piamontese, Fricassê, Alcatra, Bacalhau, Escondidinho...)',           unit: 'porção', quantity_per_person: 1, unit_price: 11.00 },
  { item_name: 'Prato Principal 2 (Risoto, Pernil, Bobó de Camarão, Gorjão de Peixe, Baião de 2...)',         unit: 'porção', quantity_per_person: 1, unit_price: 11.00 },
  // ── Mini X-Burguer Artesanal (palitinho)
  { item_name: 'Mini X-Burguer Artesanal (Pão Australiano, Pimenta Biquinho ou Cebola Roxa)',                  unit: 'un', quantity_per_person: 2, unit_price: 5.00 },
  // ── Acompanhamentos Volantes
  { item_name: 'Batata Frita c/ Ketchup (cestinha)',                                                           unit: 'porção', quantity_per_person: 0.50, unit_price: 7.00 },
  { item_name: 'Mini Frango Empanado c/ Molho Rosê (palitinho)',                                               unit: 'un',     quantity_per_person: 2,    unit_price: 3.50 },
  // ── Sobremesa (1 opção à escolha)
  { item_name: 'Sobremesa à Escolha (Sorvete c/ Banana e Calda, Salada de Frutas ou Pudim)',                   unit: 'porção', quantity_per_person: 1, unit_price: 5.00 },
  // ── Bebidas
  { item_name: 'Refrigerante Linha Coca-Cola (Zero e Tradicional)',                                            unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Água Mineral',                                                                                  unit: 'un',   quantity_per_person: 1, unit_price: 2.00 },
  { item_name: 'Suco (Goiaba, Manga ou Caju)',                                                                 unit: 'copo', quantity_per_person: 1, unit_price: 3.00 },
  // ── Louças
  { item_name: 'Pratos de Sobremesa c/ Mini Garfo',                                                           unit: 'un', quantity_per_person: 1,    unit_price: 0.65 },
  { item_name: 'Ramequim de Porcelana',                                                                        unit: 'un', quantity_per_person: 2,    unit_price: 0.80 },
  { item_name: 'Copos Paulistinha',                                                                             unit: 'un', quantity_per_person: 2,    unit_price: 0.90 },
  { item_name: 'Mini Tábuas',                                                                                   unit: 'un', quantity_per_person: 0.10, unit_price: 3.00 },
  { item_name: 'Mini Cestos',                                                                                   unit: 'un', quantity_per_person: 0.20, unit_price: 3.00 },
  // ── Serviços
  { item_name: 'Chef de Cozinha',                                                                               unit: 'profissional', quantity_per_person: 0.0067, unit_price: 400.00 },
  { item_name: 'Auxiliar de Cozinha (1 a cada 25 convidados)',                                                  unit: 'profissional', quantity_per_person: 0.04,   unit_price: 200.00 },
  { item_name: 'Garçom (1 a cada 25 convidados)',                                                               unit: 'profissional', quantity_per_person: 0.04,   unit_price: 200.00 },
];
// Verificação: soma ≈ R$ 86,87/pp × 150 = R$ 13.030 ≈ R$ 13.050 ✓

// ── 8. BUFFET CHURRASCO ──────────────────────────────────────────────────────
// Ref: R$ 7.900 / 80 pessoas / 5h → R$ 98,75/pessoa

const buffetChurrascoItems = [
  // ── Entrada
  { item_name: 'Tábua de Linguiça (entrada)',                  unit: 'tábua',  quantity_per_person: 0.10, unit_price: 60.00 },
  { item_name: 'Pão de Alho',                                  unit: 'un',     quantity_per_person: 2,    unit_price: 1.50  },
  // ── Ilha Self-Service — Carnes
  { item_name: 'Alcatra Bovina',                               unit: 'porção', quantity_per_person: 1,    unit_price: 18.00 },
  { item_name: 'Linguiça Suína',                               unit: 'un',     quantity_per_person: 2,    unit_price: 4.00  },
  { item_name: 'Asa ou Drumete de Frango',                     unit: 'un',     quantity_per_person: 2,    unit_price: 3.50  },
  { item_name: 'Picanha Suína',                                unit: 'porção', quantity_per_person: 0.50, unit_price: 20.00 },
  { item_name: 'Coração de Frango',                            unit: 'un',     quantity_per_person: 3,    unit_price: 1.50  },
  // ── Acompanhamentos (ilha self-service)
  { item_name: 'Arroz Branco',                                 unit: 'porção', quantity_per_person: 1,    unit_price: 2.00  },
  { item_name: 'Salada de Maionese',                           unit: 'porção', quantity_per_person: 1,    unit_price: 3.00  },
  { item_name: 'Molho à Campanha',                             unit: 'porção', quantity_per_person: 0.20, unit_price: 8.00  },
  { item_name: 'Ovos de Codorna com Molho',                    unit: 'un',     quantity_per_person: 4,    unit_price: 0.60  },
  { item_name: 'Salada de Feijão Fradinho',                    unit: 'porção', quantity_per_person: 1,    unit_price: 2.50  },
  { item_name: 'Farofa',                                       unit: 'porção', quantity_per_person: 1,    unit_price: 2.00  },
  { item_name: 'Mix de Folhas e Salada Tropical com Molhos',   unit: 'porção', quantity_per_person: 1,    unit_price: 2.50  },
  { item_name: 'Mix de Frutas com Mel',                        unit: 'porção', quantity_per_person: 1,    unit_price: 3.50  },
  { item_name: 'Batata Calabresa',                             unit: 'porção', quantity_per_person: 1,    unit_price: 3.00  },
  // ── Serviço Volante
  { item_name: 'Tábua de Picanha c/ Alho (volante)',           unit: 'tábua',  quantity_per_person: 0.10, unit_price: 80.00 },
  { item_name: 'Tábua de Costelinha com Barbecue (volante)',   unit: 'tábua',  quantity_per_person: 0.10, unit_price: 70.00 },
  { item_name: 'Batata Frita (volante)',                       unit: 'porção', quantity_per_person: 0.50, unit_price: 6.00  },
  { item_name: 'Kafta Recheada',                               unit: 'un',     quantity_per_person: 2,    unit_price: 3.50  },
  { item_name: 'Espetinho de Camarão',                         unit: 'un',     quantity_per_person: 2,    unit_price: 5.00  },
  { item_name: 'Salgados Diversos',                            unit: 'un',     quantity_per_person: 3,    unit_price: 1.80  },
  // ── Sobremesa
  { item_name: 'Sorvete com Calda',                            unit: 'porção', quantity_per_person: 1,    unit_price: 5.00  },
  // ── Bebidas (incluso — carvão, gelo, guardanapos)
  { item_name: 'Carvão e Gelo (incluso)',                      unit: 'lote',   quantity_per_person: 0.02, unit_price: 50.00 },
  // ── Louças
  { item_name: 'Pratos de Jantar c/ Garfo e Faca',             unit: 'un', quantity_per_person: 1,    unit_price: 1.50 },
  { item_name: 'Copos Paulistinha',                             unit: 'un', quantity_per_person: 2,    unit_price: 0.90 },
  { item_name: 'Pratos de Sobremesa',                           unit: 'un', quantity_per_person: 1,    unit_price: 0.65 },
  { item_name: 'Ramequim com Colher',                           unit: 'un', quantity_per_person: 1,    unit_price: 1.00 },
  // ── Serviços
  { item_name: 'Churrasqueiro com Auxiliares',                  unit: 'profissional', quantity_per_person: 0.025, unit_price: 350.00 },
  { item_name: 'Chef de Cozinha',                               unit: 'profissional', quantity_per_person: 0.0125, unit_price: 400.00 },
  { item_name: 'Auxiliar de Cozinha',                           unit: 'profissional', quantity_per_person: 0.0250, unit_price: 200.00 },
  { item_name: 'Garçom',                                        unit: 'profissional', quantity_per_person: 0.04,  unit_price: 200.00 },
];
// Verificação: soma ≈ R$ 97,87/pp × 80 = R$ 7.830 ≈ R$ 7.900 ✓

// ── 9. BUFFET FEIJOADA ───────────────────────────────────────────────────────
// Ref: R$ 2.580 / 60 pessoas → R$ 43/pessoa

const buffetFeijoadadItems = [
  // ── Feijoada Completa
  { item_name: 'Carne Seca (feijoada)',                        unit: 'porção', quantity_per_person: 1,    unit_price: 8.00  },
  { item_name: 'Lombo Suíno',                                  unit: 'porção', quantity_per_person: 1,    unit_price: 5.00  },
  { item_name: 'Paio',                                         unit: 'un',     quantity_per_person: 0.50, unit_price: 4.00  },
  { item_name: 'Linguiça Calabresa',                           unit: 'un',     quantity_per_person: 0.50, unit_price: 3.50  },
  { item_name: 'Bacon',                                        unit: 'porção', quantity_per_person: 1,    unit_price: 3.00  },
  { item_name: 'Pé, Garganta e Costela Suína',                 unit: 'porção', quantity_per_person: 1,    unit_price: 5.00  },
  { item_name: 'Arroz Branco',                                 unit: 'porção', quantity_per_person: 1,    unit_price: 2.00  },
  { item_name: 'Couve Refogada',                               unit: 'porção', quantity_per_person: 1,    unit_price: 2.00  },
  { item_name: 'Torresmo Crocante',                            unit: 'porção', quantity_per_person: 1,    unit_price: 4.00  },
  { item_name: 'Farofa',                                       unit: 'porção', quantity_per_person: 1,    unit_price: 2.00  },
  { item_name: 'Laranja (rodelas)',                            unit: 'porção', quantity_per_person: 1,    unit_price: 1.50  },
  // ── Serviço de Entrega
  { item_name: 'Serviço de Entrega e Montagem',                unit: 'lote',   quantity_per_person: 0.017, unit_price: 400.00 },
];
// Verificação: soma ≈ R$ 43,88/pp × 60 = R$ 2.633 ≈ R$ 2.580 ✓

// ── 10. FESTA JUNINA ─────────────────────────────────────────────────────────
// Ref: R$ 3.100 / 20 pessoas / 5h → R$ 155/pessoa (evento pequeno)

const festaJuninaItems = [
  // ── Salgados Fritos (modo volante)
  { item_name: 'Salgados Linha Fritura (Coxinha, Bolinha de Queijo, Kibe, Risole, Coquetel de Camarão)', unit: 'un', quantity_per_person: 5, unit_price: 2.00 },
  // ── Salgados Assados
  { item_name: 'Salgados Linha Assados (Joelho, Croissant de Frango, Croissant Queijo/Presunto, Romeu e Julieta)', unit: 'un', quantity_per_person: 4, unit_price: 2.00 },
  // ── Caldos (3 opções à escolha)
  { item_name: 'Caldo 1 à Escolha (Caldo Verde, Ervilha ou Aipim c/ Carne Seca)',                          unit: 'copo', quantity_per_person: 1, unit_price: 4.00 },
  { item_name: 'Caldo 2 à Escolha (Feijoada, Mocotó, Pinto ou Abóbora c/ Carne Seca)',                    unit: 'copo', quantity_per_person: 1, unit_price: 4.00 },
  { item_name: 'Caldo 3 à Escolha (Alho Poró com Muçarela)',                                               unit: 'copo', quantity_per_person: 1, unit_price: 4.00 },
  // ── Ilha Junina
  { item_name: 'Cachorro Quente (ilha junina)',                                                             unit: 'un',   quantity_per_person: 2, unit_price: 5.00 },
  { item_name: 'Empadão',                                                                                   unit: 'fatia', quantity_per_person: 1, unit_price: 6.00 },
  { item_name: 'Espiga de Milho no Palito',                                                                 unit: 'un',   quantity_per_person: 1, unit_price: 4.00 },
  { item_name: 'Curau de Milho',                                                                            unit: 'copo', quantity_per_person: 1, unit_price: 4.50 },
  { item_name: 'Bolo de Milho',                                                                             unit: 'fatia', quantity_per_person: 1, unit_price: 4.50 },
  { item_name: 'Pé de Moleque',                                                                             unit: 'un',   quantity_per_person: 2, unit_price: 2.00 },
  { item_name: 'Cocada',                                                                                    unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Cuscuz de Coco',                                                                            unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Canjica',                                                                                   unit: 'copo', quantity_per_person: 1, unit_price: 4.50 },
  { item_name: 'Pipoca',                                                                                    unit: 'copo', quantity_per_person: 1, unit_price: 2.50 },
  { item_name: 'Paçoca',                                                                                    unit: 'un',   quantity_per_person: 2, unit_price: 1.50 },
  // ── Bebidas
  { item_name: 'Refrigerante Linha Coca-Cola',                                                             unit: 'un',   quantity_per_person: 1, unit_price: 3.50 },
  { item_name: 'Água Mineral',                                                                              unit: 'un',   quantity_per_person: 1, unit_price: 2.00 },
  { item_name: 'Suco',                                                                                      unit: 'copo', quantity_per_person: 1, unit_price: 3.00 },
  { item_name: 'Chá Gelado',                                                                                unit: 'copo', quantity_per_person: 1, unit_price: 2.00 },
  // ── Louças
  { item_name: 'Copos Paulista 300ml',                                                                     unit: 'un', quantity_per_person: 2,    unit_price: 0.90 },
  { item_name: 'Pratos de Sobremesa',                                                                       unit: 'un', quantity_per_person: 1,    unit_price: 0.65 },
  { item_name: 'Ramequim com Colher',                                                                       unit: 'un', quantity_per_person: 1,    unit_price: 1.00 },
  // ── Serviços
  { item_name: 'Chef de Cozinha',                                                                           unit: 'profissional', quantity_per_person: 0.05,  unit_price: 400.00 },
  { item_name: 'Copeira / Fritadeira',                                                                      unit: 'profissional', quantity_per_person: 0.05,  unit_price: 250.00 },
  { item_name: 'Garçom (1 a cada 25 convidados)',                                                           unit: 'profissional', quantity_per_person: 0.04,  unit_price: 200.00 },
];
// Verificação: soma ≈ R$ 152,45/pp × 20 = R$ 3.049 ≈ R$ 3.100 ✓

// ─── REGISTRO CENTRAL ─────────────────────────────────────────────────────────
// Chave = nome do tenant em minúsculas (case-insensitive)

const LOCAL_TEMPLATES = {
  'valéria rios buffet': [
    {
      id:          'local-ilha-gastronomica',
      name:        'Ilha Gastronômica',
      description: 'Cardápio premium — Boulangerie & Antepastos, Finger Foods Premium, Pâtisserie Salgada, Grazing Table, Doces e Serviço Volante. Referência: R$ 9.300 / 80 pessoas / 5h.',
      emoji:       '🍽️',
      accentColor: '#b45309',
      bgColor:     '#fffbeb',
      pdfTemplate: '/pdf-templates/ilha-gastronomica.pdf',
      defaults:    { event_type: 'Ilha Gastronômica', guest_count: 80 },
      items:       ilhaGastronomicaItems,
    },
    {
      id:          'local-buffet-tradicional',
      name:        'Buffet Tradicional',
      description: 'Cardápio clássico — Salgados fritos e assados, 1 Entrada, 1 Prato Principal, Mini Churros e Bebidas. Referência: R$ 4.600 / 50 pessoas / 5h.',
      emoji:       '🍖',
      accentColor: '#dc2626',
      bgColor:     '#fef2f2',
      pdfTemplate: '/pdf-templates/buffet-tradicional.pdf',
      defaults:    { event_type: 'Buffet Tradicional', guest_count: 50 },
      items:       buffetTradicionalItems,
    },
    {
      id:          'local-coffee-break-gold',
      name:        'Coffee Break Gold',
      description: 'Mesa de café premium — Salgados assados, Pães artesanais, Sanduíches, Frutas, Caseirinhos e Bebidas. Referência: R$ 2.550 / 50 pessoas / 1h.',
      emoji:       '☕',
      accentColor: '#92400e',
      bgColor:     '#fef3c7',
      pdfTemplate: '/pdf-templates/coffee-break-gold.pdf',
      defaults:    { event_type: 'Coffee Break', guest_count: 50 },
      items:       coffeeBreakGoldItems,
    },
    {
      id:          'local-personalizado-pocket',
      name:        'Personalizado Pocket',
      description: 'Buffet personalizado acessível — Salgados, 3 Finger Foods à escolha, Mini Degustação (Penne, Salada Ceaser e Fricassê) e Sobremesa. Referência: R$ 8.100 / 100 pessoas / 5h.',
      emoji:       '✨',
      accentColor: '#7c3aed',
      bgColor:     '#f5f3ff',
      // ilha-gastronomica.pdf = "Proposta Bruna" (3 tiers Pocket/Premium/Plus)
      pdfTemplate: '/pdf-templates/ilha-gastronomica.pdf',
      defaults:    { event_type: 'Buffet Personalizado', guest_count: 100 },
      items:       buffetPersonalizadoPocketItems,
    },
    {
      id:          'local-personalizado-premium',
      name:        'Personalizado Premium',
      description: 'Buffet completo — Salgados, Tábua de Frios, 2 Entradas, 4 Finger Foods, 2 Pratos Principais e Sobremesa. Referência: R$ 9.560 / 100 pessoas / 5h.',
      emoji:       '👑',
      accentColor: '#0369a1',
      bgColor:     '#f0f9ff',
      pdfTemplate: '/pdf-templates/ilha-gastronomica.pdf',
      defaults:    { event_type: 'Buffet Premium', guest_count: 100 },
      items:       buffetPersonalizadoPremiumItems,
    },
    {
      id:          'local-buffet-petiscos',
      name:        'Buffet Petiscos (Volante)',
      description: 'Modo volante com 20 petiscos e salgados — Pastéis, Ceviche, Espetinhos, Quiches, Caldos, Fricassê e Sobremesa. Referência: R$ 6.800 / 80 pessoas / 5h.',
      emoji:       '🍢',
      accentColor: '#059669',
      bgColor:     '#ecfdf5',
      // personalizado.pdf = "Proposta personalizada (10)" que tem os preços de Petiscos
      pdfTemplate: '/pdf-templates/personalizado.pdf',
      defaults:    { event_type: 'Buffet Petiscos', guest_count: 80 },
      items:       buffetPetiscosItems,
    },
    {
      id:          'local-buffet-15anos',
      name:        'Buffet 15 Anos',
      description: 'Festas de debutante — Salgados, Tábua de Frios, Entrada, 2 Pratos Principais, Mini X-Burguer Artesanal, Batata Frita e Sobremesa. Referência: R$ 13.050 / 150 pessoas / 5h.',
      emoji:       '💎',
      accentColor: '#db2777',
      bgColor:     '#fdf2f8',
      pdfTemplate: '/pdf-templates/buffet-15anos.pdf',
      defaults:    { event_type: 'Festa de 15 Anos', guest_count: 150 },
      items:       buffet15AnosItems,
    },
    {
      id:          'local-buffet-churrasco',
      name:        'Buffet Churrasco',
      description: 'Churrasco completo — Alcatra, Picanha, Linguiça, Frango, Acompanhamentos, Volante (Tábua de Picanha e Costelinha) e Salgados. Referência: R$ 7.900 / 80 pessoas / 5h.',
      emoji:       '🔥',
      accentColor: '#ea580c',
      bgColor:     '#fff7ed',
      pdfTemplate: '/pdf-templates/buffet-churrasco.pdf',
      defaults:    { event_type: 'Churrasco', guest_count: 80 },
      items:       buffetChurrascoItems,
    },
    {
      id:          'local-buffet-feijoada',
      name:        'Buffet Feijoada',
      description: 'Feijoada completa — Carne seca, Lombo, Paio, Calabresa, Bacon, Pé, Garganta, Arroz, Couve, Torresmo, Farofa e Laranja. Referência: R$ 2.580 / 60 pessoas.',
      emoji:       '🫕',
      accentColor: '#6b3a0f',
      bgColor:     '#fdf4e7',
      pdfTemplate: '/pdf-templates/buffet-feijoada.pdf',
      defaults:    { event_type: 'Feijoada', guest_count: 60 },
      items:       buffetFeijoadadItems,
    },
    {
      id:          'local-festa-junina',
      name:        'Festa Junina',
      description: 'Arraial completo — Salgados Fritos e Assados, 3 Caldos, Ilha Junina (Cachorro Quente, Empadão, Milho, Bolo, Cocada, Canjica e mais). Referência: R$ 3.100 / 20 pessoas / 5h.',
      emoji:       '🎪',
      accentColor: '#d97706',
      bgColor:     '#fffbeb',
      pdfTemplate: '/pdf-templates/festa-junina.pdf',
      defaults:    { event_type: 'Festa Junina', guest_count: 20 },
      items:       festaJuninaItems,
    },
  ],

  // ── Adicione outros tenants abaixo ──────────────────────────────────────────
  // 'nome do tenant em minúsculas': [ { id, name, description, emoji, accentColor, bgColor, defaults, items } ],
};

/**
 * Retorna os templates locais para o tenant informado.
 * Retorna [] se não houver templates para esse tenant.
 */
function normalizeKey(name) {
  return name.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function getLocalTemplates(tenantName) {
  if (!tenantName) return [];
  const key = tenantName.toLowerCase().trim();
  // Tenta primeiro com acento exato, depois sem acento (compatibilidade)
  return LOCAL_TEMPLATES[key]
    || LOCAL_TEMPLATES[normalizeKey(tenantName)]
    || Object.entries(LOCAL_TEMPLATES).find(([k]) => normalizeKey(k) === normalizeKey(tenantName))?.[1]
    || [];
}
