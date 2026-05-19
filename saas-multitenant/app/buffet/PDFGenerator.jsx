'use client';

import { useState } from 'react';

export default function PDFGenerator({ quotation, client }) {
  const [generating, setGenerating] = useState(false);

  // Função para gerar PDF
  const generatePDF = async () => {
    if (!quotation || !client) return;

    setGenerating(true);
    try {
      // Importar jsPDF dinamicamente
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Configurações da página
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Cores da empresa
      const primaryColor = [37, 99, 235]; // #2563eb
      const secondaryColor = [71, 85, 105]; // #475569
      const accentColor = [16, 185, 129]; // #10b981

      // Função auxiliar para adicionar texto com quebra de linha
      const addText = (text, x, y, options = {}) => {
        const { fontSize = 12, fontWeight = 'normal', color = secondaryColor } = options;
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);

        if (fontWeight === 'bold') {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        doc.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };

      // Cabeçalho
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');

      yPosition = addText('ORÇAMENTO PROFISSIONAL', margin, 25, {
        fontSize: 20,
        fontWeight: 'bold',
        color: [255, 255, 255]
      });

      // Informações da empresa
      yPosition = 60;
      yPosition = addText('ChronosTek Buffet', margin, yPosition, {
        fontSize: 16,
        fontWeight: 'bold',
        color: primaryColor
      });

      yPosition = addText('Especialistas em Eventos Gastronômicos', margin, yPosition + 5, {
        fontSize: 10,
        color: secondaryColor
      });

      yPosition = addText('Telefone: (11) 99999-9999 | Email: contato@chronostek.com.br', margin, yPosition + 5, {
        fontSize: 10,
        color: secondaryColor
      });

      // Linha separadora
      yPosition += 10;
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;

      // Informações do cliente
      yPosition = addText('INFORMAÇÕES DO CLIENTE', margin, yPosition, {
        fontSize: 14,
        fontWeight: 'bold',
        color: primaryColor
      });

      yPosition += 10;
      yPosition = addText(`Nome: ${client.name}`, margin, yPosition);
      if (client.phone) {
        yPosition = addText(`Telefone: ${client.phone}`, margin, yPosition + 5);
      }
      if (client.email) {
        yPosition = addText(`Email: ${client.email}`, margin, yPosition + 5);
      }

      // Informações do evento
      yPosition += 15;
      yPosition = addText('DETALHES DO EVENTO', margin, yPosition, {
        fontSize: 14,
        fontWeight: 'bold',
        color: primaryColor
      });

      yPosition += 10;
      yPosition = addText(`Tipo de Evento: ${quotation.event_type || 'Não informado'}`, margin, yPosition);
      yPosition = addText(`Data do Evento: ${quotation.event_date ? new Date(quotation.event_date).toLocaleDateString('pt-BR') : 'A definir'}`, margin, yPosition + 5);
      yPosition = addText(`Número de Convidados: ${quotation.guests || quotation.guest_count || 'Não informado'}`, margin, yPosition + 5);

      // Tabela de itens
      yPosition += 20;
      yPosition = addText('ITENS DO ORÇAMENTO', margin, yPosition, {
        fontSize: 14,
        fontWeight: 'bold',
        color: primaryColor
      });

      yPosition += 10;

      // Cabeçalho da tabela
      const tableStartY = yPosition;
      const colWidths = [80, 20, 30, 30]; // Largura das colunas
      const colPositions = [margin];

      for (let i = 1; i < colWidths.length; i++) {
        colPositions.push(colPositions[i-1] + colWidths[i-1]);
      }

      // Cabeçalhos
      const headers = ['Item', 'Qtd', 'Valor Unit.', 'Total'];
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 12, 'F');

      doc.setTextColor(0, 0, 0);
      headers.forEach((header, index) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(header, colPositions[index] + 2, yPosition + 5);
      });

      yPosition += 12;

      // Linhas da tabela
      let totalGeral = 0;
      quotation.items.forEach((item, index) => {
        const itemTotal = item.quantity * item.price;
        totalGeral += itemTotal;

        // Linha zebrada
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 10, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        // Item
        const itemLines = doc.splitTextToSize(item.item_name, colWidths[0] - 4);
        doc.text(itemLines, colPositions[0] + 2, yPosition + 3);

        // Quantidade
        doc.text(item.quantity.toString(), colPositions[1] + 2, yPosition + 3);

        // Valor unitário
        doc.text(`R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colPositions[2] + 2, yPosition + 3);

        // Total
        doc.text(`R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colPositions[3] + 2, yPosition + 3);

        yPosition += Math.max(itemLines.length * 4, 10);
      });

      // Total geral
      yPosition += 5;
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(colPositions[2], yPosition, pageWidth - margin, yPosition);

      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`TOTAL GERAL: R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colPositions[2] + 2, yPosition);

      // Observações
      if (quotation.notes) {
        yPosition += 20;
        yPosition = addText('OBSERVAÇÕES', margin, yPosition, {
          fontSize: 12,
          fontWeight: 'bold',
          color: primaryColor
        });

        yPosition += 10;
        yPosition = addText(quotation.notes, margin, yPosition, {
          fontSize: 10,
          color: secondaryColor
        });
      }

      // Rodapé
      const footerY = pageHeight - 30;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Orçamento válido por 30 dias | ChronosTek Buffet - Excelência em Gastronomia', margin, footerY + 15);

      // Salvar PDF
      const fileName = `orcamento_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="pdf-generator">
      <div className="pdf-header">
        <h3>Gerar PDF do orçamento</h3>
        <p>Crie um PDF profissional para enviar ao cliente</p>
      </div>

      <button
        className="btn-pdf-generate"
        onClick={generatePDF}
        disabled={generating || !quotation || !client}
      >
        {generating ? 'Gerando...' : 'Gerar PDF'}
      </button>

      {(!quotation || !client) && (
        <div className="warning-message">
          Complete as informações do cliente e orçamento primeiro
        </div>
      )}
    </div>
  );
}