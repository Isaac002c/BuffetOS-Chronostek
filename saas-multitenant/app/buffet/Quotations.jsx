'use client';

import { useState, useEffect } from 'react';
import { getLocalTemplates } from '../templates/index.js';
import {
  getAllQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  duplicateQuotation,
  approveQuotation,
  cancelQuotation,
  getTenantProfile,
} from '../lib/quotationsAPI.js';
import { getClients } from '../lib/clientsAPI.js';
import { getLeads } from '../lib/leadsAPI.js';
import { createEvent } from '../lib/eventsAPI.js';
import {
  getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  addTemplateItem, updateTemplateItem, deleteTemplateItem,
} from '../lib/templatesAPI.js';
import { apiRequest } from '../lib/api';
import { calcFinancials, priceFromMargin, DEFAULT_MARGIN_PCT as _DEFAULT_MARGIN } from '../lib/calcFinancials';

// API de fichas técnicas (Etapa C/D)
const getAllSheets = () => apiRequest('/api/technical-sheets').then(r => r.data || []);
const getSheetCost = (sheetId, guests) =>
  apiRequest(`/api/technical-sheets/${sheetId}/cost?guests=${guests}`).then(r => r.data);

// ─── COMPANY CONFIG (altere aqui com os dados da sua empresa) ────────────────

const COMPANY = {
  name:    'Buffet Chronostek',
  tagline: 'Especialistas em Eventos Gastronômicos',
  phone:   '(11) 99999-9999',
  email:   'contato@chronostek.com.br',
  address: 'Rua das Flores, 123 — São Paulo/SP',
  cnpj:    '',
};

// ─── OVERLAY: coordenadas de preço para cada PDF da Valéria ──────────────────
// Extraídas via pdfplumber. Sistema de coordenadas:
//   pdfplumber: origem topo-esq, y aumenta ↓  (top = distância do topo)
//   pdf-lib:    origem baixo-esq, y aumenta ↑  (y = 1684 - pdfplumber_top)
// Todos os PDFs têm dimensão 1190×1684 pts (A4 em escala 2×).
// Cor do blob: (0.808, 0.588, 0.278) = dourado Valéria Rios Buffet
// Cor do texto: (0.22, 0.10, 0.02) = marrom escuro

const PDF_PRICE_OVERLAYS = {
  '/pdf-templates/buffet-tradicional.pdf': {
    // Página 5 — "R$ 4.600,00 / para 50 convidados" no blob dourado
    pageIndex: 4,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRect: { x: 55, y: 1149, w: 520, h: 145 },
    lines: [
      { type: 'price',  x: 295, y: 1240, size: 48, align: 'center' },
      { type: 'guests', x: 295, y: 1178, size: 38, align: 'center' },
    ],
  },
  '/pdf-templates/personalizado.pdf': {
    // Página 3 — "Para 80 pessoas / R$ 6.800,00" (conteúdo Petiscos)
    pageIndex: 2,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRect: { x: 55, y: 1194, w: 520, h: 125 },
    lines: [
      { type: 'guests_para', x: 295, y: 1289, size: 38, align: 'center' },
      { type: 'price',       x: 295, y: 1234, size: 48, align: 'center' },
    ],
  },
  '/pdf-templates/buffet-churrasco.pdf': {
    // Página 4 — "Valor de R$ 7.900,00 / para 80 convidados"
    pageIndex: 3,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRect: { x: 55, y: 1279, w: 535, h: 135 },
    lines: [
      { type: 'custom', template: 'Valor de {price}', x: 295, y: 1369, size: 44, align: 'center' },
      { type: 'guests',                               x: 295, y: 1309, size: 38, align: 'center' },
    ],
  },
  '/pdf-templates/buffet-feijoada.pdf': {
    // Página 2 — duas áreas separadas: "Para 60 pessoas" e "Valor de R$ 2.580,00"
    pageIndex: 1,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRects: [
      { x: 55, y: 624, w: 345, h: 65 },
      { x: 55, y: 399, w: 460, h: 65 },
    ],
    lines: [
      { type: 'guests_para',                          x: 100, y: 659, size: 36 },
      { type: 'custom', template: 'Valor de {price}', x: 100, y: 434, size: 36 },
    ],
  },
  '/pdf-templates/buffet-15anos.pdf': {
    // Página 7 — dois blocos: "Para 80p / R$7.900" + "Com Bolo / R$9.150"
    // coverRect cobre ambos (y=1109..1369) para mostrar só o valor do CRM
    pageIndex: 6,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRect: { x: 55, y: 1109, w: 465, h: 260 },
    lines: [
      { type: 'guests_para', x: 295, y: 1329, size: 38, align: 'center' },
      { type: 'price',       x: 295, y: 1254, size: 48, align: 'center' },
    ],
  },
  '/pdf-templates/coffee-break-gold.pdf': {
    // Página 3 — "Para 50 pessoas / R$ 2.550,00"
    pageIndex: 2,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRect: { x: 35, y: 1224, w: 505, h: 155 },
    lines: [
      { type: 'guests_para', x: 285, y: 1344, size: 38, align: 'center' },
      { type: 'price',       x: 285, y: 1274, size: 48, align: 'center' },
    ],
  },
  '/pdf-templates/festa-junina.pdf': {
    // Página 3 — "R$ 3.100,00 / Para 20 pessoas"
    pageIndex: 2,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRect: { x: 80, y: 529, w: 325, h: 145 },
    lines: [
      { type: 'price',       x: 235, y: 624, size: 48, align: 'center' },
      { type: 'guests_para', x: 235, y: 559, size: 38, align: 'center' },
    ],
  },
  '/pdf-templates/ilha-gastronomica.pdf': {
    // Página 6 (Proposta Bruna) — "Pocket/Premium/Plus para 100 convidados"
    pageIndex: 5,
    bgColor:   [0.808, 0.588, 0.278],
    textColor: [0.22,  0.10,  0.02 ],
    coverRect: { x: 15, y: 1184, w: 580, h: 255 },
    lines: [
      { type: 'price',  x: 295, y: 1374, size: 55, align: 'center' },
      { type: 'guests', x: 295, y: 1309, size: 38, align: 'center' },
    ],
  },
};

// ─── PDF GENERATOR ────────────────────────────────────────────────────────────
// Com pdfTemplatePath: abre o PDF da Valéria, sobrescreve só o valor/convidados
//                       e baixa o PDF sem nenhuma página extra.
// Sem pdfTemplatePath: gera o PDF padrão do CRM (jsPDF azul).

async function generateQuotationPDF(quotation, clientName, tenantCompany = {}, pdfTemplatePath = null) {
  const { jsPDF } = await import('jspdf');

  const co = {
    name:    tenantCompany.name    || COMPANY.name,
    tagline: tenantCompany.tagline || '',
    phone:   tenantCompany.phone   || '',
    email:   tenantCompany.email   || '',
    address: tenantCompany.address || '',
    cnpj:    tenantCompany.cnpj    || '',
  };

  const fmtBRL = (n) =>
    Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const fmtDate = (d) => {
    if (!d) return 'A definir';
    const dt = new Date(d + (d.includes('T') ? '' : 'T00:00'));
    return dt.toLocaleDateString('pt-BR');
  };

  const safeName = (clientName || 'cliente').replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // ── Modo TEMPLATE: overlay de valor diretamente no PDF da Valéria ────────────
  if (pdfTemplatePath) {
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      const templateRes = await fetch(pdfTemplatePath);
      if (!templateRes.ok) throw new Error(`PDF não encontrado: ${pdfTemplatePath}`);
      const templateBytes = await templateRes.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });

      const overlay = PDF_PRICE_OVERLAYS[pdfTemplatePath];
      if (overlay) {
        const pages  = pdfDoc.getPages();
        const page   = pages[overlay.pageIndex];
        const font   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const total  = Number(quotation.total_amount || 0);
        const guests = Number(quotation.guest_count  || 0);
        const bg     = rgb(overlay.bgColor[0],   overlay.bgColor[1],   overlay.bgColor[2]);
        const txt    = rgb(overlay.textColor[0], overlay.textColor[1], overlay.textColor[2]);

        // Apaga texto antigo cobrindo com retângulo(s) na cor do blob
        for (const r of (overlay.coverRects || [overlay.coverRect])) {
          page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: bg });
        }

        // Escreve novo texto
        for (const line of overlay.lines) {
          let text = '';
          if      (line.type === 'price')       text = fmtBRL(total);
          else if (line.type === 'guests')      text = `para ${guests} convidados`;
          else if (line.type === 'guests_para') text = `Para ${guests} pessoas`;
          else if (line.type === 'custom')
            text = line.template
              .replace('{price}',  fmtBRL(total))
              .replace('{guests}', String(guests));

          const textW = font.widthOfTextAtSize(text, line.size);
          const drawX = line.align === 'center' ? line.x - textW / 2 : line.x;
          page.drawText(text, { x: drawX, y: line.y, size: line.size, font, color: txt });
        }
      }

      // ── Página extra: Itens do Cardápio — identidade visual da proposta ─────────
      if (quotation.buffet_menu && quotation.buffet_menu.trim()) {
        const { rgb: _rgb } = await import('pdf-lib');
        const pageW = 595.28, pageH = 841.89;
        const extraPage = pdfDoc.addPage([pageW, pageH]);
        const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Paleta da proposta original
        const cBege   = _rgb(0.910, 0.863, 0.816);  // fundo bege #E8DCCC
        const cGold   = _rgb(0.780, 0.576, 0.216);  // dourado  #C79337
        const cDark   = _rgb(0.212, 0.145, 0.086);  // marrom escuro #362517
        const cWhite  = _rgb(1, 1, 1);
        const cGoldLt = _rgb(0.973, 0.941, 0.878);  // dourado claríssimo para caixa
        const marg = 48;
        const inner = pageW - marg * 2;

        // Fundo bege completo
        extraPage.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: cBege });

        // Faixa dourada do título (estilo "Informações Importantes")
        const titleBarH = 72;
        extraPage.drawRectangle({ x: 0, y: pageH - titleBarH, width: pageW, height: titleBarH, color: cGold });
        const titleText = 'Itens do Cardápio';
        const titleW = fontB.widthOfTextAtSize(titleText, 22);
        extraPage.drawText(titleText, {
          x: (pageW - titleW) / 2, y: pageH - titleBarH + 24,
          size: 22, font: fontB, color: cDark,
        });

        // Linhas do cardápio com espaçamento generoso
        const rawLines  = quotation.buffet_menu.split('\n').filter(l => l.trim());
        const lineH     = 22;   // espaçamento maior entre itens
        const padTop    = 28;
        const padBot    = 20;
        const boxH      = rawLines.length * lineH + padTop + padBot;
        const boxY      = pageH - titleBarH - 28 - boxH;

        // Caixa de fundo dourado claro com borda dourada
        extraPage.drawRectangle({
          x: marg - 12, y: boxY, width: inner + 24, height: boxH,
          color: cGoldLt,
        });
        extraPage.drawRectangle({
          x: marg - 12, y: boxY, width: 5, height: boxH, color: cGold,
        });

        // Itens
        rawLines.forEach((line, i) => {
          const safeText = (line || '').replace(/[^\x00-\xFF]/g, (c) => {
            const map = { 'ç':'c','ã':'a','õ':'o','â':'a','ê':'e','ô':'o','í':'i','ú':'u','á':'a','é':'e','ó':'o','à':'a','ü':'u','ñ':'n','Ç':'C','Ã':'A','Õ':'O','Â':'A','Ê':'E','Ô':'O','Í':'I','Ú':'U','Á':'A','É':'E','Ó':'O','À':'A','Ü':'U','Ñ':'N' };
            return map[c] || ' ';
          });
          const textY = boxY + boxH - padTop - i * lineH;
          extraPage.drawText(safeText, {
            x: marg, y: textY,
            size: 11, font: fontR, color: cDark, maxWidth: inner - 8,
          });
        });

        // Bloco do valor total
        const total = Number(quotation.total_amount || 0);
        const totalLabel = 'Valor Total da Proposta';
        const totalValue = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const totalBlockY = boxY - 56;

        extraPage.drawRectangle({
          x: marg - 12, y: totalBlockY, width: inner + 24, height: 44, color: cGold,
        });
        extraPage.drawText(totalLabel, {
          x: marg, y: totalBlockY + 28, size: 10, font: fontR, color: cDark,
        });
        extraPage.drawText(totalValue, {
          x: marg, y: totalBlockY + 12, size: 16, font: fontB, color: cDark,
        });

        // Rodapé bege com nome do buffet centralizado
        extraPage.drawRectangle({ x: 0, y: 0, width: pageW, height: 32, color: cGold });
        const footerW = fontR.widthOfTextAtSize(co.name, 9);
        extraPage.drawText(co.name, {
          x: (pageW - footerW) / 2, y: 11, size: 9, font: fontB, color: cDark,
        });
      }

      const bytes = await pdfDoc.save();
      const blob  = new Blob([bytes], { type: 'application/pdf' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href     = url;
      a.download = `proposta_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    } catch (err) {
      console.warn('[PDF] Template overlay falhou, usando jsPDF padrão:', err.message);
    }
  }

  // ── Modo PADRÃO: jsPDF do CRM ────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  _buildDefaultTable(doc, quotation, clientName, co, fmtBRL, fmtDate);
  doc.save(`orcamento_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
}


// ─── BUILDER: Tabela padrão azul CRM (sem template) ──────────────────────────
function _buildDefaultTable(doc, quotation, clientName, co, fmtBRL, fmtDate) {
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  const col2 = W / 2 + 4;
  let y = 0;

  const PRIMARY   = [37, 99, 235];
  const DARK      = [15, 23, 42];
  const GRAY      = [71, 85, 105];
  const LIGHT     = [248, 250, 252];
  const BORDER    = [226, 232, 240];

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(co.name, margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (co.tagline) doc.text(co.tagline, margin, 17);
  doc.setFontSize(8);
  const contactLine = [co.phone, co.email].filter(Boolean).join('  |  ');
  if (contactLine) doc.text(contactLine, margin, 23);
  if (co.cnpj) {
    doc.text(`CNPJ: ${co.cnpj}`, W - margin - 50, 23, { align: 'right' });
  }

  y = 36;

  // ── Title + meta ────────────────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ORÇAMENTO / PROPOSTA', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Nº ${String(quotation.id).slice(0, 8).toUpperCase()}`, W - margin, y, { align: 'right' });
  doc.text(`Emitido em: ${fmtDate(new Date().toISOString())}`, W - margin, y + 5, { align: 'right' });

  y += 10;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ── Two-column info ──────────────────────────────────────────────────────────
  const infoLabel = (label, val, x, yy) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(String(val || '—'), x, yy + 5);
  };

  infoLabel('Cliente / Contato', clientName, margin, y);
  infoLabel('Tipo de Evento', quotation.event_type || '—', col2, y);
  y += 13;
  infoLabel('Data do Evento', fmtDate(quotation.event_date), margin, y);
  infoLabel('Nº de Convidados', quotation.guest_count ? `${quotation.guest_count} pessoas` : '—', col2, y);
  y += 13;

  doc.setDrawColor(...BORDER);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ── Items table ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('ITENS DO ORÇAMENTO', margin, y);
  y += 5;

  // Table header — apenas Descrição e Qtd (preços não aparecem para o cliente)
  const qtyColW = 25;
  const descColW = W - 2 * margin - qtyColW;
  const colDescX = margin;
  const colQtyX  = margin + descColW;
  const rowH = 7;

  doc.setFillColor(...LIGHT);
  doc.rect(margin, y, W - 2 * margin, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Descrição', colDescX + 2, y + 5, { align: 'left' });
  doc.text('Qtd', colQtyX + qtyColW - 2, y + 5, { align: 'right' });
  y += rowH;

  // Table rows
  const items = quotation.items || [];
  let subtotal = 0;
  items.forEach((item, idx) => {
    const qty   = Number(item.quantity || 0);
    const price = Number(item.unit_price || item.price || 0);
    subtotal += qty * price;

    if (idx % 2 === 0) {
      doc.setFillColor(252, 253, 254);
      doc.rect(margin, y, W - 2 * margin, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);

    const name = doc.splitTextToSize(item.item_name || '—', descColW - 4)[0];
    doc.text(name, colDescX + 2, y + 5);
    doc.text(String(qty), colQtyX + qtyColW - 2, y + 5, { align: 'right' });

    y += rowH;

    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }
  });

  if (items.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('Nenhum item cadastrado.', margin + 2, y + 5);
    y += rowH;
  }

  // Bottom border of table
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // ── Total ────────────────────────────────────────────────────────────────────
  const total = Number(quotation.total_amount || subtotal);
  doc.setFillColor(239, 246, 255);
  doc.rect(W - margin - 80, y - 2, 80, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('TOTAL:', W - margin - 62, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text(fmtBRL(total), W - margin - 2, y + 6, { align: 'right' });
  y += 18;

  // ── Cardápio / Itens do Buffet — caixa de nota (opcional) ───────────────────
  if (quotation.buffet_menu) {
    y += 4;
    const menuLines = doc.splitTextToSize(quotation.buffet_menu, W - 2 * margin - 16);
    const boxH = menuLines.length * 5 + 16;
    // Fundo azul claro
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, y, W - 2 * margin, boxH, 3, 3, 'F');
    // Borda esquerda azul (destaque de nota)
    doc.setFillColor(...PRIMARY);
    doc.rect(margin, y, 3, boxH, 'F');
    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PRIMARY);
    doc.text('CARDÁPIO / O QUE SERÁ SERVIDO', margin + 8, y + 6);
    // Conteúdo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(menuLines, margin + 8, y + 12);
    y += boxH + 6;
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (quotation.notes) {
    doc.setDrawColor(...BORDER);
    doc.line(margin, y, W - margin, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('OBSERVAÇÕES', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const noteLines = doc.splitTextToSize(quotation.notes, W - 2 * margin);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 4;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...PRIMARY);
  doc.rect(0, pageH - 14, W, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${co.name}  ·  ${co.address || 'Brasil'}  ·  Válido por 30 dias`,
    W / 2, pageH - 5, { align: 'center' }
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EVENT_TEMPLATES = [
  {
    id: 'wedding',
    name: 'Casamento',
    description: 'Cerimônia e recepção completa para o grande dia',
    emoji: '💍',
    accentColor: '#f43f5e',
    bgColor: '#fff1f2',
    tags: ['Premium', 'Romântico'],
    priceRange: 'R$ 80k – R$ 200k',
    guestAvg: '150 – 300 pessoas',
    defaults: { event_type: 'Casamento', guest_count: 200 },
    items: [
      { item_name: 'Menu principal (por pessoa)', quantity: 200, unit_price: 120 },
      { item_name: 'Open bar premium (por pessoa)', quantity: 200, unit_price: 80 },
      { item_name: 'Mesa de doces decorada', quantity: 1, unit_price: 3500 },
      { item_name: 'Bem-casados personalizados', quantity: 200, unit_price: 8 },
      { item_name: 'Garçons (por diária)', quantity: 8, unit_price: 280 },
    ],
  },
  {
    id: 'debutante',
    name: '15 Anos',
    description: 'Festa de debutante inesquecível com toda a magia',
    emoji: '👑',
    accentColor: '#8b5cf6',
    bgColor: '#f5f3ff',
    tags: ['Premium', 'Especial'],
    priceRange: 'R$ 40k – R$ 100k',
    guestAvg: '100 – 200 pessoas',
    defaults: { event_type: 'Debutante (15 anos)', guest_count: 150 },
    items: [
      { item_name: 'Jantar completo (por pessoa)', quantity: 150, unit_price: 110 },
      { item_name: 'Bolo debutante (andares)', quantity: 1, unit_price: 1200 },
      { item_name: 'Mesa de doces temática', quantity: 1, unit_price: 2800 },
      { item_name: 'Salgados de entrada (por pessoa)', quantity: 150, unit_price: 20 },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Eventos empresariais com sofisticação e profissionalismo',
    emoji: '🏢',
    accentColor: '#2563eb',
    bgColor: '#eff6ff',
    tags: ['Business', 'Formal'],
    priceRange: 'R$ 20k – R$ 80k',
    guestAvg: '50 – 200 pessoas',
    defaults: { event_type: 'Corporativo', guest_count: 100 },
    items: [
      { item_name: 'Coffee break executivo (por pessoa)', quantity: 100, unit_price: 45 },
      { item_name: 'Almoço corporativo (por pessoa)', quantity: 100, unit_price: 85 },
      { item_name: 'Garçons (por diária)', quantity: 4, unit_price: 280 },
    ],
  },
  {
    id: 'island',
    name: 'Ilha Gourmet',
    description: 'Experiência gastronômica premium com ilhas temáticas',
    emoji: '🍽️',
    accentColor: '#10b981',
    bgColor: '#ecfdf5',
    tags: ['Gourmet', 'Premium'],
    priceRange: 'R$ 15k – R$ 50k',
    guestAvg: '50 – 150 pessoas',
    defaults: { event_type: 'Ilha Gourmet', guest_count: 80 },
    items: [
      { item_name: 'Ilha de frios e queijos', quantity: 1, unit_price: 2500 },
      { item_name: 'Ilha de grelhados', quantity: 1, unit_price: 3200 },
      { item_name: 'Ilha de frutos do mar', quantity: 1, unit_price: 4500 },
      { item_name: 'Ilha de sobremesas', quantity: 1, unit_price: 2000 },
    ],
  },
  {
    id: 'children',
    name: 'Infantil',
    description: 'Festa temática com diversão e alegria para as crianças',
    emoji: '🎈',
    accentColor: '#f59e0b',
    bgColor: '#fffbeb',
    tags: ['Kids', 'Temático'],
    priceRange: 'R$ 8k – R$ 25k',
    guestAvg: '50 – 100 pessoas',
    defaults: { event_type: 'Festa Infantil', guest_count: 60 },
    items: [
      { item_name: 'Salgados para crianças (por pessoa)', quantity: 60, unit_price: 35 },
      { item_name: 'Bolo temático personalizado', quantity: 1, unit_price: 800 },
      { item_name: 'Docinhos e guloseimas (por pessoa)', quantity: 60, unit_price: 15 },
    ],
  },
  {
    id: 'graduation',
    name: 'Formatura',
    description: 'Celebre a conquista acadêmica com uma festa memorável',
    emoji: '🎓',
    accentColor: '#f97316',
    bgColor: '#fff7ed',
    tags: ['Celebração', 'Formal'],
    priceRange: 'R$ 30k – R$ 80k',
    guestAvg: '100 – 250 pessoas',
    defaults: { event_type: 'Formatura', guest_count: 180 },
    items: [
      { item_name: 'Jantar completo (por pessoa)', quantity: 180, unit_price: 115 },
      { item_name: 'Open bar (por pessoa)', quantity: 180, unit_price: 65 },
      { item_name: 'Garçons (por diária)', quantity: 8, unit_price: 280 },
    ],
  },
  {
    id: 'custom',
    name: 'Criar do Zero',
    description: 'Monte seu evento personalizado com total liberdade criativa',
    emoji: '✨',
    accentColor: '#6366f1',
    bgColor: '#f8faff',
    tags: ['Personalizado', 'Livre'],
    priceRange: 'Sob consulta',
    guestAvg: 'Variável',
    defaults: { event_type: '', guest_count: 0 },
    items: [],
  },
];

const SMART_BLOCKS = [
  {
    id: 'buffet',
    name: 'Buffet Completo',
    icon: '🍽️',
    description: 'Menu, entradas e sobremesas',
    items: [
      { item_name: 'Menu principal (por pessoa)', quantity: 100, unit_price: 110 },
      { item_name: 'Entradas e antepastos', quantity: 100, unit_price: 25 },
      { item_name: 'Sobremesas variadas', quantity: 100, unit_price: 28 },
    ],
  },
  {
    id: 'open_bar',
    name: 'Open Bar',
    icon: '🍹',
    description: 'Bebidas, drinks e coquetéis',
    items: [
      { item_name: 'Open bar completo (por pessoa)', quantity: 100, unit_price: 75 },
      { item_name: 'Drinks e coquetéis especiais', quantity: 30, unit_price: 22 },
    ],
  },
  {
    id: 'sweets',
    name: 'Mesa de Doces',
    icon: '🎂',
    description: 'Bolo, docinhos e guloseimas',
    items: [
      { item_name: 'Mesa de doces decorada', quantity: 1, unit_price: 2800 },
      { item_name: 'Bolo decorativo personalizado', quantity: 1, unit_price: 950 },
      { item_name: 'Docinhos finos (por unidade)', quantity: 200, unit_price: 4 },
    ],
  },
  {
    id: 'decor',
    name: 'Decoração',
    icon: '🌸',
    description: 'Flores, arranjos e ambientação',
    items: [
      { item_name: 'Decoração floral central', quantity: 1, unit_price: 3500 },
      { item_name: 'Arranjos de mesa (por mesa)', quantity: 15, unit_price: 180 },
    ],
  },
  {
    id: 'music',
    name: 'DJ / Música',
    icon: '🎵',
    description: 'DJ profissional e equipamento de som',
    items: [
      { item_name: 'DJ profissional (6h)', quantity: 1, unit_price: 2200 },
      { item_name: 'Equipamento de som premium', quantity: 1, unit_price: 1800 },
    ],
  },
  {
    id: 'staff',
    name: 'Equipe Extra',
    icon: '👥',
    description: 'Garçons, barman e coordenador',
    items: [
      { item_name: 'Garçons (por diária)', quantity: 5, unit_price: 280 },
      { item_name: 'Barman profissional', quantity: 2, unit_price: 350 },
      { item_name: 'Maitre / coordenador', quantity: 1, unit_price: 500 },
    ],
  },
];

const STATUS_CFG = {
  draft:     { label: 'Rascunho',  color: '#64748b', bg: '#f1f5f9' },
  pending:   { label: 'Pendente',  color: '#d97706', bg: '#fffbeb' },
  approved:  { label: 'Aprovado',  color: '#16a34a', bg: '#dcfce7' },
  active:    { label: 'Ativo',     color: '#2563eb', bg: '#dbeafe' },
  completed: { label: 'Concluído', color: '#7c3aed', bg: '#ede9fe' },
  cancelled: { label: 'Cancelado', color: '#dc2626', bg: '#fee2e2' },
};

const emptyForm = {
  contact_mode:    'lead',
  lead_id:         '',
  client_id:       '',
  temp_name:       '',
  event_type:      '',
  event_date:      '',
  guest_count:     0,
  status:          'draft',
  notes:           '',
  buffet_menu:     '',
  discount_percent: 0,
  default_margin:  40,  // % de margem sobre preço final (padrão buffet)
};

// Margem padrão sugerida (sobre o preço final, não markup sobre custo).
// priceFromMargin(cost, 40) = cost / 0.60 — configurável por tenant no futuro.
const DEFAULT_MARGIN_PCT = 40;

const emptyItem = {
  item_name: '', quantity: 1, unit_price: 0,
  quantity_per_person: null,
  sheet_id: null, sheet_cost: 0,
  sheet_cost_per_unit: 0,  // armazenado só no estado, não persiste no banco
};

const emptyFixedCost = {
  id: '', description: '', category: 'outros', amount: '', notes: '',
  // Repasse ao cliente
  pass_to_client: false,  // false = apenas custo interno
  pass_margin:    40,     // % de margem sobre preço final (usa fórmula margem, não markup)
  pass_label:     '',     // nome comercial na proposta ("Taxa de logística", etc.)
};

const emptyVariableCost = {
  id: '', description: '', category: 'outros', calc_type: 'total', amount: '', notes: '',
  pass_to_client: false,
  pass_margin:    40,
  pass_label:     '',
};

const FIXED_COST_CATEGORIES    = ['logística','equipe','aluguel','taxas','embalagem','outros'];
const VARIABLE_COST_CATEGORIES = ['descartável','bebida','comissão','operacional','outros'];

// Limites de alerta de margem (futuramente configurável por tenant via API)
const MARGIN_THRESHOLDS = { warning: 25, danger: 15 };

// ─── UTILS ────────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── SHARED STYLE OBJECTS ─────────────────────────────────────────────────────

const S = {
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#f8fafc',
    color: '#1e293b',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  card: {
    background: 'white',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: size === 'sm' ? '3px 10px' : '5px 14px',
      borderRadius: 999,
      fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const isErr = message.type === 'error';
  const isOk  = message.type === 'success';

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 20px',
      borderRadius: 14,
      boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
      background: isErr ? '#fef2f2' : isOk ? '#f0fdf4' : '#eff6ff',
      border: `1px solid ${isErr ? '#fecaca' : isOk ? '#bbf7d0' : '#bfdbfe'}`,
      color: isErr ? '#dc2626' : isOk ? '#16a34a' : '#2563eb',
      fontSize: 14,
      fontWeight: 500,
      animation: 'slideInRight 0.3s ease',
      maxWidth: 400,
    }}>
      <span style={{ fontSize: 18 }}>{isErr ? '⚠️' : isOk ? '✓' : 'ℹ'}</span>
      <span style={{ flex: 1 }}>{message.text}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 16, opacity: 0.5, padding: '0 0 0 8px',
      }}>✕</button>
    </div>
  );
}

// ─── TEMPLATE EDITOR ──────────────────────────────────────────────────────────

function TemplateEditor({ template, isNew, onSave, onCancel, saving }) {
  const [name, setName]         = useState(template?.name        || '');
  const [description, setDesc]  = useState(template?.description || '');
  const [eventType, setEvType]  = useState(template?.event_type  || '');
  const [items, setItems]       = useState(
    (template?.items || []).map(i => ({
      id:         i.id,
      item_name:  i.name        || i.item_name  || '',
      quantity:   i.quantity_per_person ?? i.quantity  ?? 1,
      unit_price: i.cost_per_unit       ?? i.unit_price ?? 0,
    }))
  );
  const [removedIds, setRemovedIds] = useState([]);

  const addItem    = () => setItems(p => [...p, { item_name: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (idx) => {
    const it = items[idx];
    if (it?.id) setRemovedIds(p => [...p, it.id]);
    setItems(p => p.filter((_, i) => i !== idx));
  };
  const changeItem = (idx, field, val) =>
    setItems(p => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, description, event_type: eventType, items, removedIds });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2200,
      background: 'rgba(15,23,42,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(4px)',
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 700,
        maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            {isNew ? '✦ Novo Template' : '✎ Editar Template'}
          </h3>
          <button onClick={onCancel} style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: 16, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflow: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={S.label}>Nome do Template *</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="ex: Casamento Premium" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Tipo de Evento</label>
              <select value={eventType} onChange={e => setEvType(e.target.value)} style={S.input}>
                <option value="">Selecione...</option>
                {['Casamento', '15 Anos', 'Corporativo', 'Formatura', 'Infantil', 'Ilha Gourmet', 'Outro'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Descrição</label>
            <input value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Breve descrição do template" style={S.input} />
          </div>

          {/* Items */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...S.label, margin: 0 }}>Itens do Template</label>
              <button type="button" onClick={addItem} style={{
                padding: '5px 12px', borderRadius: 8, border: '1px dashed #3b82f6',
                background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>+ Adicionar Item</button>
            </div>

            {items.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13,
                background: '#f8fafc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
                Nenhum item ainda — clique em "+ Adicionar Item"
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((it, idx) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 120px 32px',
                  gap: 8, alignItems: 'center',
                  padding: '8px 10px', borderRadius: 10, background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}>
                  <input value={it.item_name}
                    onChange={e => changeItem(idx, 'item_name', e.target.value)}
                    placeholder="Descrição do item" style={{ ...S.input, padding: '7px 10px', fontSize: 13 }} />
                  <input type="number" min={0} value={it.quantity}
                    onChange={e => changeItem(idx, 'quantity', e.target.value)}
                    placeholder="Qtd" style={{ ...S.input, padding: '7px 8px', fontSize: 13, textAlign: 'center' }} />
                  <input type="number" min={0} step="0.01" value={it.unit_price}
                    onChange={e => changeItem(idx, 'unit_price', e.target.value)}
                    placeholder="Preço unit." style={{ ...S.input, padding: '7px 10px', fontSize: 13 }} />
                  <button type="button" onClick={() => removeItem(idx)} style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2',
                    background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onCancel} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Salvando...' : isNew ? 'Criar Template' : 'Salvar Alterações'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── TEMPLATE MANAGER ─────────────────────────────────────────────────────────

function TemplateManager({ onClose, onUseTemplate, preloadTemplate }) {
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(null);
  const [isNew, setIsNew]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

  const load = async () => {
    setLoading(true);
    try { setTemplates(await getTemplates()); }
    catch { setErrorMsg('Erro ao carregar templates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Auto-open editor pre-filled with preset data when user clicks "✎ Editar" on a preset card
  useEffect(() => {
    if (!preloadTemplate) return;
    setIsNew(true);
    setEditing(preloadTemplate);
  }, [preloadTemplate]);

  const handleNew  = () => { setIsNew(true);  setEditing({ name: '', description: '', event_type: '', items: [] }); };
  const handleEdit = async (tpl) => {
    try {
      const full = await getTemplate(tpl.id);
      setIsNew(false);
      setEditing(full);
    } catch { setErrorMsg('Erro ao carregar template'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este template permanentemente?')) return;
    try {
      await deleteTemplate(id);
      setTemplates(p => p.filter(t => t.id !== id));
    } catch { setErrorMsg('Erro ao excluir template'); }
  };

  const handleUse = (tpl) => {
    onUseTemplate({
      id: tpl.id, name: tpl.name,
      description: tpl.description || '',
      emoji: '⚡', accentColor: '#6366f1', bgColor: '#f8faff',
      tags: ['Personalizado'],
      priceRange: '—', guestAvg: '—',
      defaults: { event_type: tpl.name || tpl.event_type || '', guest_count: 0 },
      items: (tpl.items || []).map(i => ({
        item_name:           i.name || '',
        quantity:            Number(i.quantity_per_person || 1),
        unit_price:          Number(i.cost_per_unit       || 0),
        quantity_per_person: Number(i.quantity_per_person || 1), // mantém para auto-escala
      })),
    });
    onClose();
  };

  const handleSave = async ({ name, description, event_type, items, removedIds }) => {
    setSaving(true);
    try {
      if (isNew) {
        const created = await createTemplate({ name, description, event_type });
        for (const it of items) {
          if (!it.item_name) continue;
          await addTemplateItem(created.id, {
            name: it.item_name, unit: 'unidade',
            quantity_per_person: Number(it.quantity) || 1,
            cost_per_unit: Number(it.unit_price) || 0,
          });
        }
      } else {
        await updateTemplate(editing.id, { name, description, event_type });
        for (const rid of (removedIds || [])) await deleteTemplateItem(rid);
        for (const it of items) {
          if (!it.item_name) continue;
          if (it.id) {
            await updateTemplateItem(it.id, {
              name: it.item_name, unit: 'unidade',
              quantity_per_person: Number(it.quantity) || 1,
              cost_per_unit: Number(it.unit_price) || 0,
            });
          } else {
            await addTemplateItem(editing.id, {
              name: it.item_name, unit: 'unidade',
              quantity_per_person: Number(it.quantity) || 1,
              cost_per_unit: Number(it.unit_price) || 0,
            });
          }
        }
      }
      setEditing(null);
      await load();
    } catch { setErrorMsg('Erro ao salvar template'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2100,
        background: 'rgba(15,23,42,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(4px)',
      }} onClick={onClose}>
        <div style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: '22px 28px 18px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                ⚙ Meus Templates
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                Templates personalizados salvos para reutilizar em orçamentos
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#f8fafc', cursor: 'pointer', fontSize: 16, color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* Action bar */}
          <div style={{ padding: '14px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleNew} style={{
              padding: '8px 18px', borderRadius: 10, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>✦ Novo Template</button>
          </div>

          {/* List */}
          <div style={{ overflow: 'auto', padding: '16px 28px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {errorMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>
                {errorMsg}
              </div>
            )}

            {loading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ height: 68, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ))
            ) : templates.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.4 }}>📋</div>
                <p style={{ margin: 0, fontSize: 14 }}>Nenhum template salvo ainda</p>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Crie seu primeiro template personalizado</p>
              </div>
            ) : templates.map(tpl => (
              <div key={tpl.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                border: '1px solid #e2e8f0', background: '#fafbfc',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{tpl.name}</div>
                  {tpl.description && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tpl.description}
                    </div>
                  )}
                  {tpl.event_type && (
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#eff6ff', color: '#2563eb' }}>
                      {tpl.event_type}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleUse(tpl)} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid #16a34a',
                    background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Usar</button>
                  <button onClick={() => handleEdit(tpl)} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Editar</button>
                  <button onClick={() => handleDelete(tpl.id)} style={{
                    padding: '6px 10px', borderRadius: 8, border: '1px solid #fee2e2',
                    background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <TemplateEditor
          template={editing}
          isNew={isNew}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ─── TEMPLATE GALLERY ─────────────────────────────────────────────────────────

function TemplateGallery({ onSelect, onClose, tenantName }) {
  const [showManager, setShowManager] = useState(false);
  const [preloadTemplate, setPreload] = useState(null);

  // Templates locais do arquivo — FONTE PRINCIPAL
  const localTemplates = getLocalTemplates(tenantName);

  const handleLocalSelect = (tpl) => {
    onSelect({
      ...tpl,
      tags: ['Cardápio'],
      priceRange: '—',
      guestAvg: '—',
    });
  };

  const handlePresetSelect = (tpl) => { onSelect(tpl); };

  const handleEditPreset = (preset) => {
    setPreload({
      name:        `${preset.name} (personalizado)`,
      description: preset.description || '',
      event_type:  preset.defaults?.event_type || '',
      items:       preset.items.map(i => ({
        item_name:  i.item_name,
        quantity:   i.quantity,
        unit_price: i.unit_price,
      })),
    });
    setShowManager(true);
  };

  const CardGrid = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
      {children}
    </div>
  );

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,23,42,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, backdropFilter: 'blur(4px)',
      }} onClick={onClose}>
        <div style={{
          background: '#ffffff', borderRadius: 24,
          width: '100%', maxWidth: 1000, maxHeight: '92vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: '28px 36px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Escolha um modelo de evento
              </h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
                Selecione um cardápio — os itens são pré-configurados e escalados pelos convidados.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <button onClick={() => setShowManager(true)} style={{
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#f8fafc',
                color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>⚙ Templates DB</button>
              <button onClick={onClose} style={{
                width: 38, height: 38, borderRadius: 10, border: '1px solid #e2e8f0',
                background: '#f8fafc', cursor: 'pointer', fontSize: 17, color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          </div>

          {/* Scroll area */}
          <div style={{ padding: '24px 36px 36px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── SEÇÃO 1: Templates locais (arquivo) — mostrados apenas se existirem ── */}
            {localTemplates.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>📁 Meus Cardápios</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: '#b4530918', color: '#b45309',
                  }}>definidos localmente</span>
                </div>
                <CardGrid>
                  {localTemplates.map(tpl => (
                    <div key={tpl.id} onClick={() => handleLocalSelect(tpl)} style={{
                      background: tpl.bgColor || '#fffbeb',
                      border: `2px solid ${tpl.accentColor || '#b45309'}40`,
                      borderRadius: 20, padding: 24, cursor: 'pointer',
                      transition: 'all 0.2s ease', position: 'relative',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = tpl.accentColor || '#b45309';
                      e.currentTarget.style.boxShadow = `0 12px 32px ${tpl.accentColor || '#b45309'}30`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = `${tpl.accentColor || '#b45309'}40`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>{tpl.emoji || '🍽️'}</div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>{tpl.name}</h3>
                      {tpl.description && (
                        <p style={{
                          fontSize: 12, color: '#78716c', margin: '0 0 14px', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{tpl.description}</p>
                      )}
                      <div style={{ borderTop: `1px solid ${tpl.accentColor || '#b45309'}20`, paddingTop: 10, marginTop: 'auto' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{tpl.items.length} itens · escala por convidado</div>
                        {tpl.defaults?.guest_count > 0 && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: tpl.accentColor || '#b45309', marginTop: 2 }}>
                            Ref.: {tpl.defaults.guest_count} pessoas
                          </div>
                        )}
                      </div>
                      <span style={{
                        position: 'absolute', top: 12, right: 12,
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                        background: `${tpl.accentColor || '#b45309'}18`, color: tpl.accentColor || '#b45309',
                      }}>📁 Local</span>
                    </div>
                  ))}
                </CardGrid>
              </div>
            )}

            {/* Estado vazio — sem cardápios cadastrados */}
            {localTemplates.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                color: '#94a3b8',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: '0 0 8px' }}>
                  Nenhum cardápio cadastrado ainda
                </p>
                <p style={{ fontSize: 13, margin: '0 0 20px' }}>
                  Crie seu primeiro modelo clicando em "Templates DB"
                </p>
                <button onClick={() => setShowManager(true)} style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: 'none', background: '#3b82f6',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>+ Criar cardápio</button>
              </div>
            )}

          </div>{/* fim scroll area */}
        </div>
      </div>

      {showManager && (
        <TemplateManager
          onClose={() => { setShowManager(false); setPreload(null); }}
          onUseTemplate={(tpl) => onSelect(tpl)}
          preloadTemplate={preloadTemplate}
        />
      )}
    </>
  );
}

// ─── SMART BLOCK SELECTOR ─────────────────────────────────────────────────────

function SmartBlockSelector({ onAddBlock, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1800,
      background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(3px)',
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 860, maxHeight: '70vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              ⚡ Adicionar Bloco Inteligente
            </h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
              Blocos pré-configurados com itens e estrutura operacional
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: 16, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <div style={{
          padding: '20px 32px 32px', overflow: 'auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14,
        }}>
          {SMART_BLOCKS.map(block => (
            <button key={block.id} onClick={() => { onAddBlock(block); onClose(); }} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 16, padding: '18px 16px',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{block.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{block.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{block.description}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>+{block.items.length} itens incluídos</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BUILDER SECTION ──────────────────────────────────────────────────────────

function BuilderSection({ title, icon, action, children }) {
  return (
    <div style={S.card}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', borderBottom: '1px solid #f8fafc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

// ─── ITEM ROW ─────────────────────────────────────────────────────────────────

function ItemRow({ item, idx, onChange, onRemove, sheets = [], onSheetChange }) {
  const [hovered, setHovered] = useState(false);
  const qty        = Number(item.quantity   || 0);
  const unitPrice  = Number(item.unit_price || 0);
  const subtotal   = qty * unitPrice;
  const sheetData  = item.sheet_id ? sheets.find(s => s.id === item.sheet_id) : null;
  const sheetCpu   = Number(item.sheet_cost_per_unit) || 0;
  const sheetCost  = Number(item.sheet_cost) || 0;

  return (
    <div className="qs-item-row" style={{ gap: 0, padding: '8px', borderRadius: 10, background: hovered ? '#f8fafc' : 'transparent', transition: 'background 0.15s' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* ── Linha principal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 150px 110px 36px', gap: 8, alignItems: 'center' }}>
        <input type="text" value={item.item_name} placeholder="Descrição do item ou serviço"
          onChange={e => onChange(idx, 'item_name', e.target.value)}
          style={{ ...S.input, padding: '8px 12px', fontSize: 13 }} />

        <input type="number" min={0} step="1" value={item.quantity}
          onChange={e => onChange(idx, 'quantity', e.target.value)}
          style={{ ...S.input, padding: '8px 10px', fontSize: 13, textAlign: 'center' }} />

        {/* Valor unitário de VENDA (não é custo) */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 11, pointerEvents: 'none', userSelect: 'none' }}>R$</span>
          <input type="number" min={0} step="0.01" value={item.unit_price}
            onChange={e => onChange(idx, 'unit_price', e.target.value)}
            style={{ ...S.input, padding: '8px 8px 8px 28px', fontSize: 13 }} />
          <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'right', marginTop: 2 }}>PREÇO VENDA/un</div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', padding: '8px 8px', background: '#f1f5f9', borderRadius: 8, textAlign: 'right', whiteSpace: 'nowrap' }}>
          R$ {fmt(subtotal)}
        </div>

        <button onClick={() => onRemove(idx)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}>×</button>
      </div>

      {/* ── Linha de ficha técnica ── */}
      {sheets.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 2, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>🧾 FICHA TÉCNICA</span>
            <select
              style={{ ...S.input, fontSize: 11, padding: '3px 8px', maxWidth: 200, height: 26 }}
              value={item.sheet_id || ''}
              onChange={e => onSheetChange && onSheetChange(idx, e.target.value || null)}>
              <option value="">— sem ficha —</option>
              {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Info de custo interno (só aparece se ficha vinculada) */}
          {item.sheet_id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {sheetData ? (
                <>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Custo/un: <strong style={{ color: '#475569' }}>R$ {fmt(sheetCpu)}</strong>
                  </span>
                  <span style={{ fontSize: 11, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 6, padding: '1px 8px', fontWeight: 700 }}>
                    Custo interno: R$ {fmt(sheetCost)}
                  </span>
                  {unitPrice > 0 && sheetCpu > 0 && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Margem/un: {unitPrice > sheetCpu ? '+' : ''}R$ {fmt(unitPrice - sheetCpu)}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⚠ Ficha não carregada — custo R$ 0,00</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper para row de custo (fixo ou variável) com repasse ─────────────────

function CostRow({ c, idx, onChange, onRemove, efectiveAmount, extraFields }) {
  const m          = Math.min(Math.max(Number(c.pass_margin) || 0, 0), 99.9);
  const passValue  = c.pass_to_client ? priceFromMargin(efectiveAmount, m) : 0;
  const passProfit = passValue - efectiveAmount;
  const badgeStyle = c.pass_to_client
    ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }
    : { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };

  return (
    <div style={{ background: c.pass_to_client ? '#fafffe' : 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Linha 1: campos principais */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 110px auto 28px', gap: 8, alignItems: 'center' }}>
        <input style={S.input} placeholder="Descrição (ex: Frete)" value={c.description} onChange={e => onChange(idx, 'description', e.target.value)} />
        <select style={S.input} value={c.category} onChange={e => onChange(idx, 'category', e.target.value)}>
          {FIXED_COST_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
        </select>
        <input style={{ ...S.input, textAlign: 'right' }} type="number" min="0" step="0.01" placeholder="R$ 0,00" value={c.amount} onChange={e => onChange(idx, 'amount', e.target.value)} />
        {/* Toggle: Repassar ao cliente */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={!!c.pass_to_client} onChange={e => onChange(idx, 'pass_to_client', e.target.checked)}
            style={{ width: 15, height: 15, accentColor: '#16a34a', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Repassar ao cliente</span>
        </label>
        <button onClick={() => onRemove(idx)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {/* Linha extra (se houver campos específicos como calc_type) */}
      {extraFields}

      {/* Linha 2 (repasse): configurações + preview de valor */}
      {c.pass_to_client && (
        <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr', gap: 8, alignItems: 'center', paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Margem %</div>
            <input
              style={{ ...S.input, textAlign: 'right', borderColor: m >= 100 ? '#fca5a5' : '#e2e8f0' }}
              type="number" min="0" max="99.9" step="0.5"
              value={c.pass_margin ?? 40}
              onChange={e => onChange(idx, 'pass_margin', Number(e.target.value))}
            />
            {m >= 100 && <div style={{ fontSize: 9, color: '#dc2626' }}>Máx 99.9%</div>}
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Nome na proposta</div>
            <input style={S.input} placeholder='Ex: "Taxa de logística"' value={c.pass_label || ''} onChange={e => onChange(idx, 'pass_label', e.target.value)} />
          </div>
          {/* Preview dos valores */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...badgeStyle, fontSize: 11, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
              Proposta: R$ {fmt(passValue)}
            </span>
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
              Lucro: R$ {fmt(passProfit)}
            </span>
          </div>
        </div>
      )}

      {!c.pass_to_client && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...badgeStyle, fontSize: 10, borderRadius: 6, padding: '1px 8px', fontWeight: 600 }}>
            Apenas custo interno — não entra no valor da proposta
          </span>
          <input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Observação (opcional)" value={c.notes || ''} onChange={e => onChange(idx, 'notes', e.target.value)} />
        </div>
      )}
    </div>
  );
}

// ─── FIXED COSTS SECTION ──────────────────────────────────────────────────────

function FixedCostsSection({ fixedCosts, onAdd, onChange, onRemove }) {
  const custoTotal   = fixedCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const repasseTotal = fixedCosts.reduce((s, c) => {
    if (!c.pass_to_client) return s;
    const m = Number(c.pass_margin) || 0;
    return s + priceFromMargin(Number(c.amount) || 0, m);
  }, 0);

  return (
    <BuilderSection title="Custos Fixos da Festa" icon="🔩"
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {custoTotal > 0 && <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Custo: <strong>R$ {fmt(custoTotal)}</strong></span>}
          {repasseTotal > 0 && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>→ Proposta: R$ {fmt(repasseTotal)}</span>}
          <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Custo fixo</button>
        </div>
      }
    >
      {fixedCosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px', color: '#94a3b8', fontSize: 13 }}>
          Nenhum custo fixo adicionado. Ex: frete, equipe, gás, aluguel de material.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fixedCosts.map((c, idx) => (
            <CostRow key={idx} c={c} idx={idx} onChange={onChange} onRemove={onRemove} efectiveAmount={Number(c.amount) || 0} />
          ))}
        </div>
      )}
    </BuilderSection>
  );
}

// ─── VARIABLE COSTS SECTION ───────────────────────────────────────────────────

function VariableCostsSection({ variableCosts, guestCount, onAdd, onChange, onRemove }) {
  const guests = Number(guestCount) || 0;

  const custoTotal = variableCosts.reduce((s, c) => {
    const a = Number(c.amount) || 0;
    return s + (c.calc_type === 'per_person' ? a * guests : a);
  }, 0);
  const repasseTotal = variableCosts.reduce((s, c) => {
    if (!c.pass_to_client) return s;
    const a = Number(c.amount) || 0;
    const efetivo = c.calc_type === 'per_person' ? a * guests : a;
    return s + priceFromMargin(efetivo, Number(c.pass_margin) || 0);
  }, 0);

  return (
    <BuilderSection title="Custos Variáveis" icon="📊"
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {custoTotal > 0 && <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Custo: <strong>R$ {fmt(custoTotal)}</strong></span>}
          {repasseTotal > 0 && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>→ Proposta: R$ {fmt(repasseTotal)}</span>}
          <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Custo variável</button>
        </div>
      }
    >
      {variableCosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px', color: '#94a3b8', fontSize: 13 }}>
          Nenhum custo variável adicionado. Ex: descartável por pessoa, bebida por convidado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {variableCosts.map((c, idx) => {
            const a       = Number(c.amount) || 0;
            const efetivo = c.calc_type === 'per_person' ? a * guests : a;
            return (
              <CostRow key={idx} c={c} idx={idx} onChange={onChange} onRemove={onRemove} efectiveAmount={efetivo}
                extraFields={
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 90px auto', gap: 8, alignItems: 'center', paddingTop: 2 }}>
                    <select style={S.input} value={c.calc_type} onChange={e => onChange(idx, 'calc_type', e.target.value)}>
                      <option value="per_person">Por pessoa</option>
                      <option value="total">Valor total</option>
                    </select>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total: R$ {fmt(efetivo)}</div>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </BuilderSection>
  );
}

// ─── FINANCIAL SIDEBAR (Etapa E — resumo financeiro melhorado) ────────────────

function FinRow({ label, value, bold, muted, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: muted ? '#94a3b8' : '#64748b', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: 12, color: valueColor || (bold ? '#0f172a' : '#475569'), fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 4 }}>{label}</div>
  );
}

function FinancialSidebar({
  fin, guestCount, defaultMargin,
  onSave, loading, editingQuotation, status,
  onApprove, onCancel, onConvertToEvent,
  onApplyMarginToCosts, onDistributeGap, onAddOperationalFee,
}) {
  const {
    subtotalItens, discountAmt, receitaItens, receitaRepasse, receitaTotal, receitaTotalPessoa,
    custoFichas, custoVariavel, custoFixo, custoTotal, custoPessoa,
    lucro, margemReal, lucroPessoa, margemAlerta,
    receitaRecomendada, diferencaParaMargem, precoRecomendadoPessoa,
  } = fin;

  const hasCosts   = custoTotal > 0;
  const hasRepasse = receitaRepasse > 0;
  const guests     = Number(guestCount) || 0;

  const alertStyle = margemAlerta === 'danger'
    ? { background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b' }
    : { background: '#fefce8', border: '1px solid #fde047', color: '#854d0e' };

  return (
    <div style={{ ...S.card, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>💰</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Resumo Financeiro</h3>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── RECEITA ── */}
        <div>
          <SectionLabel label="Receita" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <FinRow label="Itens do evento" value={`R$ ${fmt(receitaItens)}`} />
            {discountAmt > 0 && <FinRow label="Desconto aplicado" value={`−R$ ${fmt(discountAmt)}`} valueColor="#dc2626" />}
            {hasRepasse && <FinRow label="Custos repassados" value={`+R$ ${fmt(receitaRepasse)}`} valueColor="#16a34a" />}
            <FinRow label="Receita total" value={`R$ ${fmt(receitaTotal)}`} bold />
            {guests > 0 && <FinRow label="Receita por pessoa" value={`R$ ${fmt(receitaTotalPessoa)}`} muted />}
          </div>
        </div>

        <div style={{ height: 1, background: '#f1f5f9' }} />

        {/* ── CUSTOS INTERNOS ── */}
        <div>
          <SectionLabel label="Custos Internos da Festa" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {custoFichas > 0    && <FinRow label="Fichas técnicas"  value={`R$ ${fmt(custoFichas)}`} />}
            {custoVariavel > 0  && <FinRow label="Custos variáveis" value={`R$ ${fmt(custoVariavel)}`} />}
            {custoFixo > 0      && <FinRow label="Custos fixos"     value={`R$ ${fmt(custoFixo)}`} />}
            {hasCosts
              ? <FinRow label="Custo total da festa" value={`R$ ${fmt(custoTotal)}`} bold />
              : <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Nenhum custo interno registrado</div>
            }
            {hasCosts && guests > 0 && <FinRow label="Custo por pessoa" value={`R$ ${fmt(custoPessoa)}`} muted />}
          </div>
        </div>

        <div style={{ height: 1, background: '#f1f5f9' }} />

        {/* ── RESULTADO ── */}
        {hasCosts && (
          <div>
            <SectionLabel label="Resultado" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <FinRow label="Lucro estimado" value={`R$ ${fmt(lucro)}`} bold valueColor={lucro >= 0 ? '#16a34a' : '#dc2626'} />
              <FinRow label="Margem real" value={`${margemReal.toFixed(1)}%`} bold valueColor={lucro >= 0 ? '#16a34a' : '#dc2626'} />
              {guests > 0 && <FinRow label="Lucro por pessoa"  value={`R$ ${fmt(lucroPessoa)}`} muted />}
            </div>
          </div>
        )}

        {/* Alerta de margem */}
        {margemAlerta && (
          <div style={{ ...alertStyle, borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 600 }}>
            {margemAlerta === 'danger' ? '🔴 Margem crítica' : '🟡 Margem baixa'} ({margemReal.toFixed(1)}%)
          </div>
        )}

        {/* Valor total destacado */}
        <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius: 12, padding: '12px 14px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Valor total da proposta</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1e40af', lineHeight: 1 }}>R$ {fmt(receitaTotal)}</div>
          {guests > 0 && (
            <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 3 }}>R$ {fmt(receitaTotalPessoa)} / pessoa · {guests} convidados</div>
          )}
        </div>

        {/* ── PRECIFICAÇÃO INTELIGENTE ── */}
        {hasCosts && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🎯 Precificação Inteligente
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>(margem = lucro / receita)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <FinRow label="Margem desejada" value={`${Number(defaultMargin).toFixed(1)}%`} />
              <FinRow label="Receita atual" value={`R$ ${fmt(receitaTotal)}`} />
              <FinRow label="Receita recomendada" value={`R$ ${fmt(receitaRecomendada)}`} bold />
              {guests > 0 && <FinRow label="Preço/pessoa recomendado" value={`R$ ${fmt(precoRecomendadoPessoa)}`} />}
              {diferencaParaMargem > 0.01 && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#b45309', fontWeight: 600, background: '#fefce8', borderRadius: 6, padding: '4px 8px' }}>
                  Faltam R$ {fmt(diferencaParaMargem)} para atingir {Number(defaultMargin).toFixed(0)}% de margem
                </div>
              )}
              {diferencaParaMargem <= 0.01 && receitaTotal > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#166534', fontWeight: 600, background: '#f0fdf4', borderRadius: 6, padding: '4px 8px' }}>
                  ✓ Margem desejada atingida
                </div>
              )}
            </div>
            {/* Ações rápidas — sempre visíveis, desabilitadas quando margem atingida */}
            {(onDistributeGap || onAddOperationalFee) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Ações rápidas</div>
                {onDistributeGap && (() => {
                  const disabled = diferencaParaMargem <= 0.01;
                  return (
                    <button
                      onClick={disabled ? undefined : onDistributeGap}
                      disabled={disabled}
                      title={disabled ? 'Margem desejada já atingida' : `Distribuir R$ ${fmt(diferencaParaMargem)} nos itens`}
                      style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid #e2e8f0', background: disabled ? '#f8fafc' : 'white', color: disabled ? '#cbd5e1' : '#475569', fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: disabled ? 0.6 : 1 }}>
                      ↑ Distribuir diferença nos itens
                    </button>
                  );
                })()}
                {onAddOperationalFee && (() => {
                  const disabled = diferencaParaMargem <= 0.01;
                  return (
                    <button
                      onClick={disabled ? undefined : onAddOperationalFee}
                      disabled={disabled}
                      title={disabled ? 'Margem desejada já atingida' : `Adicionar taxa de R$ ${fmt(diferencaParaMargem)}`}
                      style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid #e2e8f0', background: disabled ? '#f8fafc' : 'white', color: disabled ? '#cbd5e1' : '#475569', fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: disabled ? 0.6 : 1 }}>
                      + Adicionar diferença como taxa operacional
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Ações de salvar/aprovar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button onClick={onSave} disabled={loading} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Salvando...' : editingQuotation ? '💾 Salvar alterações' : '✓ Criar orçamento'}
          </button>
          {editingQuotation && status !== 'approved' && status !== 'cancelled' && (
            <button onClick={onApprove} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Aprovar proposta</button>
          )}
          {editingQuotation && status !== 'cancelled' && (
            <button onClick={onCancel} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #fed7aa', background: '#fff7ed', color: '#ea580c', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Cancelar orçamento</button>
          )}
          {editingQuotation && status === 'approved' && onConvertToEvent && (
            <button onClick={onConvertToEvent} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📅 Converter em Evento</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QUOTATION BUILDER ────────────────────────────────────────────────────────

function QuotationBuilder({
  form, items, clients, leads, editingQuotation, loading,
  fixedCosts, variableCosts, sheets,
  onFieldChange, onItemChange, onAddItem, onRemoveItem,
  onFixedCostAdd, onFixedCostChange, onFixedCostRemove,
  onVariableCostAdd, onVariableCostChange, onVariableCostRemove,
  onItemSheetChange,
  onAddBlock, onSubmit, onBack, onApprove, onCancel, onChangeTemplate, onConvertToEvent,
  onDistributeGap, onAddOperationalFee,
}) {
  const [showBlocks, setShowBlocks] = useState(false);

  // Cálculo financeiro centralizado — usa engine do calcFinancials.js
  const guestCount    = Number(form.guest_count)    || 0;
  const defaultMargin = Number(form.default_margin) || DEFAULT_MARGIN_PCT;

  const fin = calcFinancials({
    items, fixedCosts, variableCosts,
    discountPct:   Number(form.discount_percent) || 0,
    guestCount,
    defaultMargin,
    thresholds: MARGIN_THRESHOLDS,
  });

  const contactName =
    leads.find(l => String(l.id) === String(form.lead_id))?.name || 'Selecione o lead';

  const heroMetrics = [
    { label: 'Valor Total',  value: `R$ ${fmt(fin.receitaTotal)}`,                                                   icon: '💰', color: '#2563eb' },
    { label: 'Lucro Est.',   value: fin.custoTotal > 0 ? `R$ ${fmt(fin.lucro)}` : '—',                               icon: '📈', color: fin.lucro >= 0 ? '#16a34a' : '#dc2626' },
    { label: 'Convidados',   value: guestCount > 0 ? guestCount : '—',                                               icon: '👥', color: '#7c3aed' },
    { label: 'Data',         value: form.event_date ? new Date(form.event_date + 'T00:00').toLocaleDateString('pt-BR') : '—', icon: '📅', color: '#f59e0b' },
    { label: 'Custo/Pessoa', value: fin.custoTotal > 0 && guestCount > 0 ? `R$ ${fmt(fin.custoPessoa)}` : '—',       icon: '🧮', color: '#06b6d4' },
    { label: 'Margem',       value: fin.custoTotal > 0 ? `${fin.margemReal.toFixed(1)}%` : '—',                      icon: '📊', color: fin.margemReal >= 25 ? '#16a34a' : fin.margemReal >= 15 ? '#f59e0b' : '#dc2626' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Sticky Builder Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, gap: 16,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <button onClick={onBack} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '7px 14px', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 500,
              transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ← Voltar
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.event_type || 'Novo Evento'} — {contactName}
                </span>
                <StatusBadge status={form.status} />
              </div>
              {editingQuotation && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                  #{editingQuotation.id} · Editando orçamento
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="qs-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={onChangeTemplate} style={{
              padding: '7px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              🎨 Template
            </button>
            {editingQuotation && form.status !== 'approved' && form.status !== 'cancelled' && (
              <button onClick={onApprove} style={{
                padding: '7px 14px', borderRadius: 10, border: 'none',
                background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                ✓ Aprovar
              </button>
            )}
            {editingQuotation && form.status !== 'cancelled' && (
              <button onClick={onCancel} style={{
                padding: '7px 14px', borderRadius: 10, border: '1px solid #fed7aa',
                background: '#fff7ed', color: '#ea580c', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                ✕ Cancelar
              </button>
            )}
            <button onClick={onSubmit} disabled={loading} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Salvando...' : editingQuotation ? '💾 Salvar' : '✓ Criar'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Metrics */}
      <div style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="hero-metrics-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 12,
          }}>
            {heroMetrics.map(m => (
              <div key={m.label} style={{
                background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #f1f5f9',
              }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.2, marginBottom: 3 }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Builder */}
      <div className="builder-layout" style={{
        maxWidth: 1400, margin: '0 auto', padding: '24px',
        display: 'flex', gap: 24, alignItems: 'flex-start',
      }}>
        {/* Left: Sections */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Dados do Evento */}
          <BuilderSection title="Dados do Evento" icon="📋">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Contato — apenas Lead */}
              <div>
                <label style={S.label}>Lead / Contato</label>
                <select value={form.lead_id} onChange={e => onFieldChange('lead_id', e.target.value)} style={S.input}>
                  <option value="">Selecione um lead</option>
                  {(leads || []).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.email ? ` — ${l.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>

            <div className="qs-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Tipo de Evento *</label>
                <input
                  type="text" value={form.event_type}
                  onChange={e => onFieldChange('event_type', e.target.value)}
                  placeholder="Ex: Casamento, Formatura, Corporativo"
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Data do Evento *</label>
                <input
                  type="date" value={form.event_date}
                  onChange={e => onFieldChange('event_date', e.target.value)}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Convidados</label>
                <input
                  type="number" min={0}
                  value={form.guest_count === 0 || form.guest_count === '' ? '' : form.guest_count}
                  placeholder="0"
                  onChange={e => onFieldChange('guest_count', e.target.value)}
                  style={S.input}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => onFieldChange('notes', e.target.value)}
                  placeholder="Restrições alimentares, preferências, informações adicionais..."
                  style={{ ...S.input, minHeight: 78, resize: 'vertical' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                {/* Toggle de nota de cardápio */}
                <div
                  onClick={() => {
                    if (form.buffet_menu) {
                      onFieldChange('buffet_menu', '');
                    } else {
                      // Se já tem itens, importa automaticamente; senão abre vazio
                      const auto = items.filter(i => i.item_name?.trim())
                        .map(i => `• ${i.item_name.trim()} (${Number(i.quantity) || 1}x)`)
                        .join('\n');
                      onFieldChange('buffet_menu', auto || ' ');
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '10px 14px', borderRadius: 10, userSelect: 'none',
                    border: `1px solid ${form.buffet_menu ? '#3b82f6' : '#e2e8f0'}`,
                    background: form.buffet_menu ? '#eff6ff' : '#f8fafc',
                    marginBottom: form.buffet_menu ? 8 : 0,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{form.buffet_menu ? '📋' : '📋'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.buffet_menu ? '#2563eb' : '#475569' }}>
                      Incluir cardápio na proposta
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {form.buffet_menu ? 'Aparecerá como nota na proposta PDF' : 'Opcional — adiciona uma nota com os itens do buffet'}
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: form.buffet_menu ? '#2563eb' : '#cbd5e1',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: form.buffet_menu ? 18 : 3,
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>

                {form.buffet_menu && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                      {items.length > 0 && (
                        <button type="button" onClick={() => {
                          const texto = items.filter(i => i.item_name?.trim())
                            .map(i => `• ${i.item_name.trim()} (${Number(i.quantity) || 1}x)`)
                            .join('\n');
                          onFieldChange('buffet_menu', texto);
                        }} style={{
                          padding: '3px 10px', borderRadius: 7, border: '1px solid #3b82f620',
                          background: '#eff6ff', color: '#2563eb',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}>↑ Importar itens do evento</button>
                      )}
                    </div>
                    <textarea
                      value={form.buffet_menu}
                      onChange={e => onFieldChange('buffet_menu', e.target.value)}
                      placeholder={"Ex:\n• Coquetel de entrada: bruschetas, mini-quiches, canapés\n• Prato principal: risoto de camarão, filé ao molho madeira\n• Sobremesas: pudim, petit gateau, frutas da estação\n• Open bar: refrigerantes, sucos, espumante"}
                      style={{ ...S.input, minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          </BuilderSection>

          {/* Itens do Evento */}
          <BuilderSection
            title="Itens do Evento"
            icon="🍽️"
            action={
              <button onClick={() => setShowBlocks(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}>
                ⚡ Bloco Inteligente
              </button>
            }
          >
            {/* Column headers */}
            <div className="qs-items-section">
            <div className="qs-items-header" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 140px 110px 36px',
              gap: 8, padding: '0 8px 8px',
              borderBottom: '1px solid #f1f5f9', marginBottom: 8,
            }}>
              {['Item / Serviço', 'Qtd.', 'Valor Unit.', 'Subtotal', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {h}
                </div>
              ))}
            </div>

            <div className="qs-items-rows" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {items.map((item, idx) => (
                <ItemRow key={idx} item={item} idx={idx} onChange={onItemChange} onRemove={onRemoveItem} sheets={sheets} onSheetChange={onItemSheetChange} />
              ))}
            </div>
            </div>{/* fim qs-items-section */}

            <button onClick={onAddItem} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', marginTop: 10,
              background: 'none', border: '2px dashed #e2e8f0', borderRadius: 10,
              padding: '10px 16px', cursor: 'pointer', color: '#94a3b8', fontSize: 13, fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#f8faff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}>
              + Adicionar item manualmente
            </button>
          </BuilderSection>

          {/* Custos Variáveis (Etapa B) */}
          <VariableCostsSection
            variableCosts={variableCosts}
            guestCount={form.guest_count}
            onAdd={onVariableCostAdd}
            onChange={onVariableCostChange}
            onRemove={onVariableCostRemove}
          />

          {/* Custos Fixos (Etapa A) */}
          <FixedCostsSection
            fixedCosts={fixedCosts}
            onAdd={onFixedCostAdd}
            onChange={onFixedCostChange}
            onRemove={onFixedCostRemove}
          />

          {/* Configurações Financeiras */}
          <BuilderSection title="Configurações Financeiras" icon="💳">
            <div className="qs-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Desconto na proposta (%)</label>
                <input type="number" min={0} max={100} step="0.1"
                  value={form.discount_percent}
                  onChange={e => onFieldChange('discount_percent', e.target.value)}
                  placeholder="0" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Margem desejada (%)</label>
                <input type="number" min={0} max={99.9} step="0.5"
                  value={form.default_margin ?? DEFAULT_MARGIN_PCT}
                  onChange={e => onFieldChange('default_margin', e.target.value)}
                  placeholder="40" style={{ ...S.input, borderColor: '#bfdbfe' }} />
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Margem = lucro / receita (não markup)</div>
              </div>
              <div>
                <label style={S.label}>Status do Orçamento</label>
                <select value={form.status} onChange={e => onFieldChange('status', e.target.value)} style={S.input}>
                  <option value="draft">Rascunho</option>
                  <option value="approved">Aprovado</option>
                  <option value="active">Ativo</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
          </BuilderSection>
        </div>

        {/* Right: Sticky Sidebar */}
        <div className="builder-sidebar" style={{ width: 320, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 80 }}>
            <FinancialSidebar
              fin={fin}
              guestCount={form.guest_count}
              defaultMargin={form.default_margin ?? DEFAULT_MARGIN_PCT}
              onSave={onSubmit}
              loading={loading}
              editingQuotation={editingQuotation}
              status={form.status}
              onApprove={onApprove}
              onCancel={onCancel}
              onConvertToEvent={onConvertToEvent}
              onDistributeGap={onDistributeGap}
              onAddOperationalFee={onAddOperationalFee}
            />
          </div>
        </div>
      </div>

      {showBlocks && (
        <SmartBlockSelector
          onAddBlock={onAddBlock}
          onClose={() => setShowBlocks(false)}
        />
      )}
    </div>
  );
}

// ─── QUOTATION CARD ───────────────────────────────────────────────────────────

function QuotationCard({ quotation, getClientName, onEdit, onDuplicate, onApprove, onCancel, onDelete, onConvertToEvent, onExportPDF }) {
  const [hovered, setHovered] = useState(false);
  const eventDate = quotation.event_date
    ? new Date(quotation.event_date + (quotation.event_date.includes('T') ? '' : 'T00:00')).toLocaleDateString('pt-BR')
    : '—';

  return (
    <div style={{
      ...S.card,
      transition: 'all 0.2s ease',
      transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
      borderColor: hovered ? '#cbd5e1' : '#e2e8f0',
    }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}>

      {/* Top */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ minWidth: 0, paddingRight: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {quotation.event_type || 'Evento sem nome'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{getClientName(quotation.lead_id)}</div>
          </div>
          <StatusBadge status={quotation.status} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          R$ {fmt(Number(quotation.total_amount || 0))}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 20px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>📅 {eventDate}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>👥 {quotation.guest_count || '—'} conv.</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}># {quotation.id}</span>
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 7 }}>
        <button onClick={() => onEdit(quotation)} style={{
          flex: 1, padding: '8px 0', borderRadius: 10,
          border: '1px solid #e2e8f0', background: '#f8fafc',
          color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; }}>
          ✏️ Editar
        </button>
        <button onClick={() => onDuplicate(quotation.id)} title="Duplicar" style={{
          padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0',
          background: '#f8fafc', color: '#64748b', fontSize: 13, cursor: 'pointer',
        }}>📋</button>
        <button onClick={() => onExportPDF(quotation)} title="Exportar PDF" style={{
          padding: '8px 12px', borderRadius: 10, border: '1px solid #dbeafe',
          background: '#eff6ff', color: '#2563eb', fontSize: 13, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}>
          📄
        </button>
        {quotation.status !== 'approved' && quotation.status !== 'cancelled' && (
          <button onClick={() => onApprove(quotation)} title="Aprovar" style={{
            padding: '8px 12px', borderRadius: 10, border: '1px solid #bbf7d0',
            background: '#dcfce7', color: '#16a34a', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>✓</button>
        )}
        {quotation.status !== 'cancelled' && (
          <button onClick={() => onCancel(quotation)} title="Cancelar orçamento" style={{
            padding: '8px 12px', borderRadius: 10, border: '1px solid #fed7aa',
            background: '#fff7ed', color: '#ea580c', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>✕</button>
        )}
        {quotation.status === 'approved' && onConvertToEvent && (
          <button onClick={() => onConvertToEvent(quotation)} title="Converter em Evento" style={{
            padding: '8px 12px', borderRadius: 10, border: '1px solid #ede9fe',
            background: '#ede9fe', color: '#7c3aed', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>📅</button>
        )}
        <button onClick={() => { if (window.confirm('Excluir este orçamento?')) onDelete(quotation.id); }} title="Excluir" style={{
          padding: '8px 12px', borderRadius: 10, border: '1px solid #fecaca',
          background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}>
          🗑️
        </button>
      </div>
    </div>
  );
}

// ─── QUOTATION LIST ───────────────────────────────────────────────────────────

function QuotationList({
  quotations, clients, leads = [], loading,
  onNew, onEdit, onDuplicate, onApprove, onCancel, onDelete, onConvertToEvent, onExportPDF,
  filters, onFilterChange,
}) {
  const getLeadName = id => leads.find(l => String(l.id) === String(id))?.name || '—';

  const filtered = quotations.filter(q => {
    const matchLead   = filters.client ? String(q.lead_id) === String(filters.client) : true;
    const matchStatus = filters.status ? q.status === filters.status : true;
    return matchLead && matchStatus;
  });

  const totalValue = filtered.reduce((s, q) => s + Number(q.total_amount || 0), 0);
  const approved = filtered.filter(q => q.status === 'approved').length;

  return (
    <div className="page-buffet-wrap">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Orçamentos</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 14 }}>
            {filtered.length} orçamento{filtered.length !== 1 ? 's' : ''} · R$ {fmt(totalValue)} no total · {approved} aprovado{approved !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onNew} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '11px 22px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(37,99,235,0.3)', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.3)'; }}>
          ✦ Novo Orçamento
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #e2e8f0',
        padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>Filtrar</span>
        <select
          value={filters.client}
          onChange={e => onFilterChange('client', e.target.value)}
          style={{ ...S.input, width: 'auto', minWidth: 160, padding: '7px 30px 7px 12px', fontSize: 13 }}
        >
          <option value="">Todos os leads</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={e => onFilterChange('status', e.target.value)}
          style={{ ...S.input, width: 'auto', minWidth: 140, padding: '7px 30px 7px 12px', fontSize: 13 }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filters.client || filters.status) && (
          <button onClick={() => { onFilterChange('client', ''); onFilterChange('status', ''); }} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid #fecaca',
            background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Cards / States */}
      {loading ? (
        <div className="quotations-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 200, borderRadius: 20,
              background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 20, border: '2px dashed #e2e8f0',
          padding: '64px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.4 }}>📋</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#334155', margin: '0 0 8px' }}>
            Nenhum orçamento encontrado
          </h3>
          <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 15 }}>
            Crie seu primeiro orçamento com o Event Builder inteligente
          </p>
          <button onClick={onNew} style={{
            padding: '11px 24px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            ✦ Criar Primeiro Orçamento
          </button>
        </div>
      ) : (
        <div className="quotations-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(q => (
            <QuotationCard
              key={q.id}
              quotation={q}
              getClientName={getLeadName}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onApprove={onApprove}
              onCancel={onCancel}
              onDelete={onDelete}
              onConvertToEvent={onConvertToEvent}
              onExportPDF={onExportPDF}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BuffetQuotations({ isActive }) {
  const [view, setView] = useState('list'); // 'list' | 'template-gallery' | 'builder'
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [fixedCosts,    setFixedCosts]    = useState([]);
  const [variableCosts, setVariableCosts] = useState([]);
  const [sheets,        setSheets]        = useState([]);
  const [filters, setFilters] = useState({ client: '', status: '' });
  // PDF template da Valéria: path para /pdf-templates/*.pdf, ou null
  const [activePdfTemplate, setActivePdfTemplate] = useState(null);
  // Inicializa já com o que tem no localStorage (evita flash de nome errado)
  const [tenantInfo, setTenantInfo] = useState(() => {
    try {
      if (typeof window === 'undefined') return {};
      const raw = localStorage.getItem('tenant');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    loadData();
    getTenantProfile()
      .then(t => { if (t?.name) setTenantInfo(t); })
      .catch(() => {});
  }, []);

  // Recarrega leads sempre que a aba ficar ativa (CachedTabs mantém em memória)
  useEffect(() => {
    if (isActive) {
      getLeads().then(setLeads).catch(() => {});
    }
  }, [isActive]);

  // Recarrega leads imediatamente quando Leads.jsx cria/edita um lead
  useEffect(() => {
    const handler = () => getLeads().then(setLeads).catch(() => {});
    window.addEventListener('leads-updated', handler);
    return () => window.removeEventListener('leads-updated', handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qData, cData, lData] = await Promise.all([
        getAllQuotations(),
        getClients(),
        getLeads().catch(() => []),
      ]);
      setQuotations(qData || []);
      setClients(cData || []);
      setLeads(lData || []);
    } catch {
      showMsg('error', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
    // Sempre recarrega fichas técnicas junto — garante que fichas novas apareçam
    // mesmo sem remontar o componente (CachedTabs mantém em memória entre abas)
    getAllSheets().then(setSheets).catch(() => {});
  };

  const showMsg = (type, text) => setMessage({ type, text });

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));

    if (field === 'guest_count') {
      const guests = Number(value) || 0;
      setItems(curr => curr.map(item => {
        // Itens com ficha técnica: recalcula sheet_cost e atualiza quantidade pelo nº de convidados
        if (item.sheet_id) {
          const cpu  = Number(item.sheet_cost_per_unit) || 0;
          const qty  = guests > 0 ? guests : item.quantity;
          return { ...item, quantity: qty, sheet_cost: cpu * qty };
        }
        // Itens de template com quantity_per_person: rescala normalmente
        if (guests > 0) {
          const qpp = item.quantity_per_person;
          if (qpp != null && qpp > 0) {
            // Arredonda para 2 casas decimais, mínimo 1
            const scaled = Math.max(1, Math.round(qpp * guests * 100) / 100);
            return { ...item, quantity: scaled };
          }
        }
        return item;
      }));
    }
  };

  const handleItemChange = (idx, field, value) =>
    setItems(curr =>
      curr.map((item, i) => {
        if (i !== idx) return item;
        const numValue = (field === 'quantity' || field === 'unit_price') ? Number(value) : value;
        const updated = {
          ...item,
          [field]: numValue,
          // Edição manual de quantidade desativa auto-rescale para esse item
          ...(field === 'quantity' ? { quantity_per_person: null } : {}),
        };
        // Se quantidade mudou e o item tem ficha, recalcula custo proporcional
        if (field === 'quantity' && updated.sheet_id && updated.sheet_cost_per_unit > 0) {
          updated.sheet_cost = updated.sheet_cost_per_unit * (Number(value) || 0);
        }
        return updated;
      })
    );

  const handleAddItem = () => setItems(curr => [...curr, { ...emptyItem }]);
  const handleRemoveItem = idx => setItems(curr => curr.filter((_, i) => i !== idx));

  // ── Handlers de Ficha Técnica nos itens (Etapa D) ───────────────────────────
  const handleItemSheetChange = async (idx, sheetId) => {
    // Remover ficha
    if (!sheetId) {
      setItems(curr => curr.map((item, i) =>
        i === idx
          ? { ...item, sheet_id: null, sheet_cost: 0, sheet_cost_per_unit: 0 }
          : item
      ));
      return;
    }

    const guests = Number(form.guest_count) || 0;
    try {
      // Usa 1 como fallback quando convidados ainda não preenchidos
      const qtyForCost = guests > 0 ? guests : 1;
      const data = await getSheetCost(sheetId, qtyForCost);

      const costPerUnit    = Number(data?.cost_per_unit)  || 0;
      const sheetName      = data?.sheet_name             || '';
      const baseYield      = Number(data?.base_yield)     || 1;

      // Quantidade = nº de convidados (ou rendimento base como sugestão)
      const qty = guests > 0 ? guests : baseYield;
      const sheetCost = costPerUnit * qty;

      // Preço sugerido usando margem sobre preço final: custo / (1 - margem)
      const dm = Math.min(Math.max(Number(form.default_margin) || DEFAULT_MARGIN_PCT, 0), 99.9);
      const suggestedPrice = priceFromMargin(costPerUnit, dm);

      setItems(curr => curr.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          sheet_id:           sheetId,
          sheet_cost_per_unit: costPerUnit,
          sheet_cost:          sheetCost,
          quantity:            qty,
          quantity_per_person: null, // impede que o rescale de template interfira
          // Preenche nome só se vazio
          item_name: item.item_name?.trim() ? item.item_name : sheetName,
          // Preenche preço de venda sugerido só se zero ou vazio
          unit_price: (Number(item.unit_price) > 0) ? item.unit_price : suggestedPrice,
        };
      }));
    } catch {
      // Fallback silencioso: vincula a ficha mas sem custo calculado
      setItems(curr => curr.map((item, i) =>
        i === idx
          ? { ...item, sheet_id: sheetId, sheet_cost: 0, sheet_cost_per_unit: 0, quantity_per_person: null }
          : item
      ));
    }
  };

  // ── Precificação Inteligente ─────────────────────────────────────────────────

  // Identificador da taxa operacional criada automaticamente.
  // Usamos item_name como marcador para detectar e atualizar (não duplicar).
  const OPERATIONAL_FEE_NAME = 'Taxa operacional';

  // Calcula a diferença faltante usando o estado atual completo.
  // receitaTotal já inclui: itens + custos repassados + taxa operacional existente.
  // Portanto, se já foi adicionada taxa suficiente OU custos repassados cobrem,
  // diff será <= 0 e as ações ficam desabilitadas.
  const _currentFin = () => calcFinancials({
    items, fixedCosts, variableCosts,
    discountPct:   Number(form.discount_percent) || 0,
    guestCount:    Number(form.guest_count) || 0,
    defaultMargin: Math.min(Math.max(Number(form.default_margin) || DEFAULT_MARGIN_PCT, 0), 99.9),
  });

  // Distribui a diferença faltante nos itens REAIS (exclui taxa operacional automática).
  // Isso evita distribuir em cima de uma taxa que o próprio sistema criou.
  const handleDistributeGap = () => {
    const fin  = _currentFin();
    const diff = fin.diferencaParaMargem;
    if (diff <= 0.01) { showMsg('error', 'A margem desejada já foi atingida. Não há diferença para distribuir.'); return; }

    // Itens reais = todos exceto a taxa operacional criada automaticamente
    const realItems = items.filter(i => i.item_name !== OPERATIONAL_FEE_NAME);
    const totalVenda = realItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    if (totalVenda <= 0) { showMsg('error', 'Adicione itens com valor de venda antes de distribuir.'); return; }

    setItems(curr => curr.map(i => {
      // Taxa operacional: não mexe
      if (i.item_name === OPERATIONAL_FEE_NAME) return i;
      const subtItem  = (Number(i.quantity) || 0) * (Number(i.unit_price) || 0);
      const prop      = subtItem / totalVenda;
      const acrescimo = prop * diff;
      const qty       = Number(i.quantity) || 1;
      const newPrice  = qty > 0 ? (subtItem + acrescimo) / qty : Number(i.unit_price);
      return { ...i, unit_price: Math.round(newPrice * 100) / 100 };
    }));
    showMsg('success', `Diferença de R$ ${fmt(diff)} distribuída nos itens da proposta.`);
  };

  // Adiciona (ou atualiza) a taxa operacional com APENAS a diferença faltante.
  // A diferença já considera: itens + custos repassados + taxa existente.
  // Clicar várias vezes atualiza o mesmo item em vez de criar duplicatas.
  const handleAddOperationalFee = () => {
    const fin  = _currentFin();
    const diff = fin.diferencaParaMargem;
    if (diff <= 0.01) {
      showMsg('error', 'A margem desejada já foi atingida. Não há diferença para adicionar.');
      return;
    }
    const newPrice = Math.round(diff * 100) / 100;
    const existingIdx = items.findIndex(i => i.item_name === OPERATIONAL_FEE_NAME);

    if (existingIdx >= 0) {
      // Atualiza a taxa existente em vez de criar nova (evita duplicata)
      setItems(curr => curr.map((item, i) =>
        i === existingIdx ? { ...item, quantity: 1, unit_price: newPrice } : item
      ));
      showMsg('success', `Taxa operacional atualizada para R$ ${fmt(newPrice)}.`);
    } else {
      // Cria nova taxa somente quando não existe nenhuma
      const feeItem = { ...emptyItem, item_name: OPERATIONAL_FEE_NAME, quantity: 1, unit_price: newPrice };
      setItems(curr => [...curr, feeItem]);
      showMsg('success', `"Taxa operacional" de R$ ${fmt(newPrice)} adicionada.`);
    }
  };

  // ── Handlers de Custos Fixos (Etapa A) ──────────────────────────────────────
  const handleFixedCostAdd    = () => setFixedCosts(c => [...c, { ...emptyFixedCost, id: Date.now().toString() }]);
  const handleFixedCostChange = (idx, field, value) => setFixedCosts(c => c.map((x, i) => i === idx ? { ...x, [field]: value } : x));
  const handleFixedCostRemove = (idx) => setFixedCosts(c => c.filter((_, i) => i !== idx));

  // ── Handlers de Custos Variáveis (Etapa B) ──────────────────────────────────
  const handleVariableCostAdd    = () => setVariableCosts(c => [...c, { ...emptyVariableCost, id: Date.now().toString() }]);
  const handleVariableCostChange = (idx, field, value) => setVariableCosts(c => c.map((x, i) => i === idx ? { ...x, [field]: value } : x));
  const handleVariableCostRemove = (idx) => setVariableCosts(c => c.filter((_, i) => i !== idx));

  const handleAddBlock = block => {
    const filled = items.filter(i => i.item_name.trim() !== '');
    setItems([...filled, ...block.items]);
    showMsg('success', `Bloco "${block.name}" adicionado — ${block.items.length} itens incluídos.`);
  };

  const handleTemplateSelect = tpl => {
    const guests = Number(tpl.defaults.guest_count) || 0;
    setForm(prev => ({
      ...emptyForm,
      lead_id: prev.lead_id,
      event_type: tpl.defaults.event_type,
      guest_count: guests,
    }));
    // Escala quantidades pelo nº de convidados padrão (se > 0)
    const scaledItems = (tpl.items.length > 0 ? tpl.items : [{ ...emptyItem }]).map(i => {
      const qpp = i.quantity_per_person != null ? Number(i.quantity_per_person) : Number(i.quantity || 1);
      const scaled = guests > 0 ? Math.max(1, Math.round(qpp * guests * 100) / 100) : qpp;
      return { ...i, quantity_per_person: qpp, quantity: scaled };
    });
    setItems(scaledItems);
    setFixedCosts([]);
    setVariableCosts([]);
    setActivePdfTemplate(tpl.pdfTemplate || null);
    setView('builder');
    showMsg('success', `Template "${tpl.name}" carregado! Ajuste o nº de convidados para recalcular automaticamente.`);
  };

  const handleNewQuotation = () => {
    setEditingQuotation(null);
    setForm({ ...emptyForm });
    setItems([{ ...emptyItem }]);
    setFixedCosts([]);
    setVariableCosts([]);
    setActivePdfTemplate(null);
    // Recarrega fichas ao abrir novo orçamento — garante que fichas criadas
    // em outras abas (sem remontar este componente) já apareçam no seletor
    getAllSheets().then(setSheets).catch(() => {});
    setView('template-gallery');
  };

  const handleEditQuotation = async q => {
    setEditingQuotation(q);
    setActivePdfTemplate(null);
    setEditLoading(true);
    // Recarrega fichas ao abrir edição — idem ao handleNewQuotation
    getAllSheets().then(setSheets).catch(() => {});

    // getAllQuotations() retorna apenas cabeçalhos (sem items).
    // É obrigatório buscar o detalhe completo para carregar os itens existentes.
    let full = q;
    try {
      full = await getQuotation(q.id);
    } catch (err) {
      console.warn('[Edit] Falha ao buscar detalhe do orçamento, usando dados parciais:', err.message);
    } finally {
      setEditLoading(false);
    }

    setForm({
      contact_mode: 'lead',
      lead_id:      full.lead_id      || '',
      client_id:    '',
      temp_name:    '',
      event_type:   full.event_type   || '',
      event_date:   full.event_date ? full.event_date.split('T')[0] : '',
      guest_count:  full.guest_count  || 0,
      status:           full.status           || 'draft',
      notes:            full.notes            || '',
      buffet_menu:      full.buffet_menu      || '',
      discount_percent: full.discount_percent || 0,
      default_margin:   full.default_margin   != null ? Number(full.default_margin) : DEFAULT_MARGIN_PCT,
    });

    // Deriva quantity_per_person = quantidade ÷ convidados originais.
    // Isso permite que alterar o nº de convidados rescale os itens automaticamente,
    // igual ao comportamento ao criar pelo template.
    const originalGuests = Number(full.guest_count) || 0;
    const loadedItems = (full.items || []).map(i => {
      const qty       = Number(i.quantity)   || 1;
      const sheetCost = Number(i.sheet_cost) || 0;
      const hasSheet  = !!i.sheet_id;
      // Deriva custo por unidade: sheet_cost / quantity (retrocompat com dados antigos)
      const sheetCpu  = hasSheet && qty > 0 ? sheetCost / qty : 0;
      return {
        item_name:          i.item_name   || '',
        quantity:           qty,
        unit_price:         Number(i.unit_price) || 0,
        // Itens com ficha não devem ser auto-rescalados pela lógica de template
        quantity_per_person: hasSheet ? null : (originalGuests > 0 ? qty / originalGuests : null),
        sheet_id:            i.sheet_id   || null,
        sheet_cost:          sheetCost,
        sheet_cost_per_unit: sheetCpu,
      };
    });
    setItems(loadedItems.length > 0 ? loadedItems : [{ ...emptyItem }]);

    // Carrega custos fixos e variáveis — fallback seguro para orçamentos antigos
    setFixedCosts(Array.isArray(full.fixed_costs)    ? full.fixed_costs    : []);
    setVariableCosts(Array.isArray(full.variable_costs) ? full.variable_costs : []);

    setView('builder');
  };

  const handleSubmit = async () => {
    if (!form.event_type) {
      showMsg('error', 'Tipo de evento é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      // Sanitiza custos: garante amount numérico e remove entradas sem descrição
      const cleanFixed    = fixedCosts.filter(c => c.description?.trim()).map(c => ({ ...c, amount: Number(c.amount) || 0 }));
      const cleanVariable = variableCosts.filter(c => c.description?.trim()).map(c => ({ ...c, amount: Number(c.amount) || 0 }));

      const payload = {
        ...form,
        guest_count:      Number(form.guest_count) || 0,
        event_date:       form.event_date || null,
        discount_percent: Number(form.discount_percent) || 0,
        default_margin:   Number(form.default_margin)   ?? DEFAULT_MARGIN_PCT,
        fixed_costs:      cleanFixed,
        variable_costs:   cleanVariable,
        items: items.map(i => ({
          item_name:  i.item_name  || '',
          quantity:   Number(i.quantity)   || 0,
          unit_price: Number(i.unit_price) || 0,
          sheet_id:   i.sheet_id   || null,
          sheet_cost: Number(i.sheet_cost) || 0,
          // sheet_cost_per_unit e quantity_per_person são estado-only, não vão ao banco
        })),
        client_id: null,
        lead_id:   form.lead_id || null,
      };
      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, payload);
        showMsg('success', 'Orçamento atualizado com sucesso!');
      } else {
        await createQuotation(payload);
        showMsg('success', 'Orçamento criado com sucesso!');
      }
      await loadData();
      setEditingQuotation(null); // limpa estado de edição após salvar
      setView('list');
    } catch (e) {
      showMsg('error', e.message || 'Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async quotation => {
    const q = quotation || editingQuotation;
    if (!q) return;
    const name = leads.find(l => String(l.id) === String(q.lead_id))?.name || 'lead';
    if (!window.confirm(`Aprovar orçamento de ${name}?`)) return;
    try {
      await approveQuotation(q.id);
      showMsg('success', 'Orçamento aprovado com sucesso!');
      await loadData();
      if (view === 'builder') setForm(prev => ({ ...prev, status: 'approved' }));
    } catch (e) {
      showMsg('error', e.message || 'Erro ao aprovar.');
    }
  };

  const handleCancel = async quotation => {
    const q = quotation || editingQuotation;
    if (!q) return;
    const name = leads.find(l => String(l.id) === String(q.lead_id))?.name || 'lead';
    if (!window.confirm(`Cancelar orçamento de ${name}?`)) return;
    try {
      await cancelQuotation(q.id);
      showMsg('success', 'Orçamento cancelado.');
      await loadData();
      if (view === 'builder') setForm(prev => ({ ...prev, status: 'cancelled' }));
    } catch (e) {
      showMsg('error', e.message || 'Erro ao cancelar.');
    }
  };

  const handleDuplicate = async id => {
    const q = quotations.find(x => x.id === id);
    if (!q) return;
    try {
      await duplicateQuotation(id, q.client_id || null, q.lead_id || null);
      showMsg('success', 'Orçamento duplicado com sucesso!');
      await loadData();
    } catch (e) {
      showMsg('error', e.message || 'Erro ao duplicar.');
    }
  };

  const handleDelete = async id => {
    try {
      await deleteQuotation(id);
      showMsg('success', 'Orçamento excluído.');
      await loadData();
    } catch (e) {
      showMsg('error', e.message || 'Erro ao excluir.');
    }
  };

  const handleExportPDF = async (quotation) => {
    try {
      const full = await getQuotation(quotation.id);
      const leadName = leads.find(l => String(l.id) === String(quotation.lead_id))?.name;
      // Usa nome do lead; se não tiver, usa tipo do evento; senão 'A Definir'
      const clientName = leadName || quotation.event_type || 'A Definir';

      // Resolve o PDF template:
      //   1º: activePdfTemplate (setado quando template foi selecionado nesta sessão)
      //   2º: busca no registro de templates pelo event_type da proposta
      //       (garante funcionamento mesmo para propostas carregadas do banco)
      const resolvedPdfTemplate = activePdfTemplate || (() => {
        const allTemplates = getLocalTemplates(tenantInfo?.name);
        const match = allTemplates.find(
          t => t.defaults?.event_type === full.event_type
        );
        return match?.pdfTemplate || null;
      })();

      await generateQuotationPDF(full, clientName, tenantInfo, resolvedPdfTemplate);
    } catch (e) {
      console.error('PDF error:', e);
      showMsg('error', 'Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handleConvertToEvent = async (quotation) => {
    const q = quotation || (editingQuotation && { ...editingQuotation, ...form });
    if (!q) return;

    // Validação: data do evento é obrigatória no backend
    if (!q.event_date) {
      showMsg('error', 'Defina a data do evento antes de converter para evento.');
      return;
    }

    const contactName =
      leads.find(l => String(l.id) === String(q.lead_id))?.name || 'Lead';
    if (!window.confirm(`Criar evento para "${contactName}" a partir deste orçamento?`)) return;

    try {
      // Status 'confirmed' é o único aceito pelo ENUM do banco (confirmed/cancelled/completed).
      // Isso também garante que o evento apareça nos gráficos do Financeiro.
      // TODO (futura integração Google Calendar):
      //   após createEvent, chamar googleCalendarAPI.createEvent({ ...eventData, calendarId: tenant.googleCalendarId })
      //   Requer: OAuth2 por tenant, escopos: calendar.events / calendar.readonly
      //   Arquitetura sugerida: salvar google_event_id no registro de evento para sync futuro.
      await createEvent({
        client_name:  contactName,
        event_type:   q.event_type  || 'Evento',
        event_date:   q.event_date,
        guest_count:  q.guest_count || 0,
        notes:        q.notes       || '',
        quotation_id: q.id          || null,
        lead_id:      q.lead_id     || null,
        status:       'confirmed',
      });
      showMsg('success', `Evento "${q.event_type || 'Evento'}" criado com sucesso no calendário!`);
      await loadData(); // atualiza a lista para refletir conversão
      if (view === 'builder') setView('list');
    } catch (e) {
      showMsg('error', e.message || 'Erro ao criar evento.');
    }
  };

  return (
    <>
      {view === 'list' && (
        <QuotationList
          quotations={quotations}
          clients={clients}
          leads={leads}
          loading={loading}
          onNew={handleNewQuotation}
          onEdit={handleEditQuotation}
          onDuplicate={handleDuplicate}
          onApprove={handleApprove}
          onCancel={handleCancel}
          onDelete={handleDelete}
          onConvertToEvent={handleConvertToEvent}
          onExportPDF={handleExportPDF}
          filters={filters}
          onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
        />
      )}

      {view === 'template-gallery' && (
        <TemplateGallery
          onSelect={handleTemplateSelect}
          onClose={() => setView('list')}
          tenantName={tenantInfo.name}
        />
      )}

      {view === 'builder' && (
        <QuotationBuilder
          form={form}
          items={items}
          fixedCosts={fixedCosts}
          variableCosts={variableCosts}
          sheets={sheets}
          clients={clients}
          leads={leads}
          editingQuotation={editingQuotation}
          loading={saving || editLoading}
          onFieldChange={handleFieldChange}
          onItemChange={handleItemChange}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onItemSheetChange={handleItemSheetChange}
          onFixedCostAdd={handleFixedCostAdd}
          onFixedCostChange={handleFixedCostChange}
          onFixedCostRemove={handleFixedCostRemove}
          onVariableCostAdd={handleVariableCostAdd}
          onVariableCostChange={handleVariableCostChange}
          onVariableCostRemove={handleVariableCostRemove}
          onAddBlock={handleAddBlock}
          onSubmit={handleSubmit}
          onBack={() => setView('list')}
          onApprove={() => editingQuotation && handleApprove(editingQuotation)}
          onCancel={() => editingQuotation && handleCancel(editingQuotation)}
          onChangeTemplate={() => setView('template-gallery')}
          onConvertToEvent={() => handleConvertToEvent(null)}
          onDistributeGap={handleDistributeGap}
          onAddOperationalFee={handleAddOperationalFee}
        />
      )}

      <Toast message={message} onClose={() => setMessage(null)} />
    </>
  );
}
