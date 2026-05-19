'use client';

import { useState } from 'react';

export default function WhatsAppIntegration({ quotation, client }) {
  const [message, setMessage] = useState('');
  const [customMessage, setCustomMessage] = useState(false);

  // Gera mensagem padrão para orçamento
  const generateDefaultMessage = () => {
    if (!quotation || !client) return '';

    const items = quotation.items || [];
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    return `Olá ${client.name}!

Aqui está o orçamento para seu evento:

Data: ${quotation.event_date || 'A definir'}
Tipo: ${quotation.event_type || 'Evento'}
Convidados: ${quotation.guests || 'A definir'}

Valor Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionRate: 2 })}

Para confirmar ou fazer ajustes, entre em contato conosco.

Atenciosamente,
${quotation.company_name || 'ChronosTek Buffet'}
Telefone: ${quotation.phone || '(11) 99999-9999'}`;
  };

  // Gera link do WhatsApp
  const generateWhatsAppLink = (phone, text) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/55${cleanPhone}?text=${encodedText}`;
  };

  // Manipula envio do WhatsApp
  const handleSendWhatsApp = () => {
    if (!client?.phone) {
      alert('Cliente não possui telefone cadastrado');
      return;
    }

    const finalMessage = customMessage ? message : generateDefaultMessage();
    const link = generateWhatsAppLink(client.phone, finalMessage);

    // Abre WhatsApp Web em nova aba
    window.open(link, '_blank');
  };

  // Manipula cópia para área de transferência
  const handleCopyMessage = () => {
    const finalMessage = customMessage ? message : generateDefaultMessage();
    navigator.clipboard.writeText(finalMessage);
    alert('Mensagem copiada para área de transferência!');
  };

  return (
    <div className="whatsapp-integration">
      <div className="whatsapp-header">
        <h3>Integração WhatsApp</h3>
        <p>Envie orçamentos diretamente pelo WhatsApp</p>
      </div>

      <div className="message-options">
        <label className="radio-option">
          <input
            type="radio"
            name="messageType"
            checked={!customMessage}
            onChange={() => setCustomMessage(false)}
          />
          <span>Mensagem automática</span>
        </label>

        <label className="radio-option">
          <input
            type="radio"
            name="messageType"
            checked={customMessage}
            onChange={() => setCustomMessage(true)}
          />
          <span>Mensagem personalizada</span>
        </label>
      </div>

      {customMessage ? (
        <textarea
          className="custom-message-input"
          placeholder="Digite sua mensagem personalizada..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
        />
      ) : (
        <div className="default-message-preview">
          <h4>Prévia da mensagem:</h4>
          <div className="message-preview">
            {generateDefaultMessage().split('\n').map((line, index) => (
              <div key={index}>{line || <br />}</div>
            ))}
          </div>
        </div>
      )}

      <div className="whatsapp-actions">
        <button
          className="btn-whatsapp-send"
          onClick={handleSendWhatsApp}
          disabled={!client?.phone}
        >
          Enviar pelo WhatsApp
        </button>

        <button
          className="btn-copy-message"
          onClick={handleCopyMessage}
        >
          Copiar mensagem
        </button>
      </div>

      {!client?.phone && (
        <div className="warning-message">
          Cliente não possui telefone cadastrado
        </div>
      )}
    </div>
  );
}