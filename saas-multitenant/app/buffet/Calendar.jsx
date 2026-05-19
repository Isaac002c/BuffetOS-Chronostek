'use client';

import { useState, useEffect } from 'react';

export default function Calendar({ events = [], onDateSelect, onEventCreate, onEventSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Meses
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Gerar dias do mês atual
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Dias do mês anterior para completar a primeira semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        events: []
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.event_date || event.date);
        return eventDate.toDateString() === date.toDateString();
      });

      days.push({
        date,
        isCurrentMonth: true,
        events: dayEvents
      });
    }

    // Dias do próximo mês para completar a última semana
    const remainingDays = 42 - days.length; // 6 semanas x 7 dias
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        events: []
      });
    }

    return days;
  };

  const days = getDaysInMonth(currentDate);

  // Navegação do calendário
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Selecionar data
  const handleDateClick = (day) => {
    setSelectedDate(day.date);
    if (onDateSelect) {
      onDateSelect(day.date);
    }
  };

  // Verificar se uma data é hoje
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Verificar se uma data está selecionada
  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  // Renderizar dia do calendário
  const renderDay = (day, index) => {
    const hasEvents = day.events.length > 0;
    const isCurrentDay = isToday(day.date);
    const isSelectedDay = isSelected(day.date);

    return (
      <div
        key={index}
        className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''} ${isSelectedDay ? 'selected' : ''} ${hasEvents ? 'has-events' : ''}`}
        onClick={() => handleDateClick(day)}
      >
        <div className="day-number">
          {day.date.getDate()}
        </div>

        {hasEvents && (
          <div className="day-events">
            {day.events.slice(0, 2).map((event, eventIndex) => {
              const eventTitle = event.event_type || event.title || 'Evento';
              return (
                <div key={eventIndex} className="event-indicator" title={eventTitle}>
                  {eventTitle.length > 10 ? `${eventTitle.substring(0, 10)}...` : eventTitle}
                </div>
              );
            })}
            {day.events.length > 2 && (
              <div className="event-more">+{day.events.length - 2} mais</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={() => navigateMonth(-1)} className="nav-btn">
            ‹
          </button>
          <h2 className="calendar-title">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={() => navigateMonth(1)} className="nav-btn">
            ›
          </button>
        </div>

        <div className="calendar-actions">
          <button onClick={goToToday} className="btn-secondary">
            Hoje
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {/* Cabeçalhos dos dias da semana */}
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}

        {/* Dias do calendário */}
        {days.map((day, index) => renderDay(day, index))}
      </div>

      {selectedDate && (
        <div className="calendar-details">
          <h3>Eventos do dia {selectedDate.toLocaleDateString('pt-BR')}</h3>

          {events.filter(event => {
            const eventDate = new Date(event.event_date || event.date);
            return eventDate.toDateString() === selectedDate.toDateString();
          }).length === 0 ? (
            <p className="no-events">Nenhum evento agendado</p>
          ) : (
            <div className="events-list">
              {events.filter(event => {
                const eventDate = new Date(event.event_date || event.date);
                return eventDate.toDateString() === selectedDate.toDateString();
              }).map((event, index) => {
                const eventTitle = event.event_type || event.title || 'Evento';
                return (
                  <div
                    key={index}
                    className="event-item"
                    onClick={() => onEventSelect && onEventSelect(event)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onEventSelect && onEventSelect(event); }}
                  >
                    <div className="event-time">
                      {event.time || 'Todo o dia'}
                    </div>
                    <div className="event-info">
                      <h4>{eventTitle}</h4>
                      {(event.notes || event.description) && <p>{event.notes || event.description}</p>}
                      {event.client_name || event.client ? (
                        <span className="event-client">Cliente: {event.client_name || event.client}</span>
                      ) : null}
                    </div>
                    <div className="event-status">
                      <span className={`status-badge ${event.status || 'pending'}`}>
                        {event.status === 'confirmed' ? 'Confirmado' :
                         event.status === 'pending' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={() => onEventCreate && onEventCreate(selectedDate)}
          >
            + Novo Evento
          </button>
        </div>
      )}
    </div>
  );
}