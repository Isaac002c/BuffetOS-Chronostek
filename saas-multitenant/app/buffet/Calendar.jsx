'use client';

import { useState, useMemo } from 'react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const WEEK_DAYS   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS      = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_COLOR = {
  previsto:  '#6366f1',
  confirmed: '#16a34a',
  pending:   '#d97706',
  cancelled: '#94a3b8',
};

const STATUS_LABEL = {
  previsto:  'Previsto',
  confirmed: 'Confirmado',
  pending:   'Pendente',
  cancelled: 'Cancelado',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const isToday   = (d)    => isSameDay(d, new Date());

const getEventsForDay = (events, date) =>
  events.filter(ev => {
    const d = new Date(ev.event_date || ev.date);
    return !isNaN(d) && isSameDay(d, date);
  });

// ─── MONTH GRID ───────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, selectedDate, onDayClick, onEventClick }) {
  const days = useMemo(() => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLast = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = firstDow - 1; i >= 0; i--)
      cells.push({ date: new Date(year, month - 1, prevMonthLast - i), current: false });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: new Date(year, month, d), current: true });
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++)
      cells.push({ date: new Date(year, month + 1, d), current: false });
    return cells;
  }, [currentDate]);

  return (
    <div>
      {/* Weekday headers */}
      <div className="calendar-weekdays-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="calendar-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map(({ date, current }, i) => {
          const dayEvents = getEventsForDay(events, date);
          const today     = isToday(date);
          const selected  = selectedDate && isSameDay(date, selectedDate);

          return (
            <div
              key={i}
              onClick={() => onDayClick(date)}
              style={{
                minHeight: 80, padding: '6px 4px', borderBottom: '1px solid #f1f5f9',
                borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid #f1f5f9',
                background: selected ? '#eff6ff' : today ? '#fafafa' : '#fff',
                cursor: 'pointer', transition: 'background .1s',
                opacity: current ? 1 : .4,
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = today ? '#fafafa' : '#fff'; }}
            >
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: '50%', fontSize: 13, fontWeight: today ? 700 : 400,
                background: today ? '#0f172a' : 'transparent',
                color: today ? '#fff' : current ? '#0f172a' : '#94a3b8',
                marginBottom: 2,
              }}>{date.getDate()}</div>

              {dayEvents.slice(0, 2).map((ev, ei) => (
                <div
                  key={ei}
                  onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                  title={`${ev.event_type || 'Evento'} — ${ev.client_name || ''}`}
                  style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 3, marginBottom: 2,
                    background: (STATUS_COLOR[ev.status] || '#6366f1') + '22',
                    borderLeft: `3px solid ${STATUS_COLOR[ev.status] || '#6366f1'}`,
                    color: STATUS_COLOR[ev.status] || '#6366f1',
                    fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }}
                >
                  {ev.event_type || ev.client_name || 'Evento'}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div style={{ fontSize: 10, color: '#94a3b8', paddingLeft: 2 }}>+{dayEvents.length - 2} mais</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────

function WeekView({ currentDate, events, onDayClick, onEventClick }) {
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
        {days.map((d, i) => {
          const today = isToday(d);
          return (
            <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderRight: i < 6 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{WEEK_DAYS[d.getDay()]}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%', fontSize: 15, fontWeight: 600, marginTop: 2,
                background: today ? '#0f172a' : 'transparent',
                color: today ? '#fff' : '#0f172a',
              }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((d, i) => {
          const dayEvents = getEventsForDay(events, d);
          return (
            <div key={i} onClick={() => onDayClick(d)} style={{
              minHeight: 120, padding: 8, borderRight: i < 6 ? '1px solid #f1f5f9' : 'none',
              cursor: 'pointer', background: isToday(d) ? '#fafafa' : '#fff',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = isToday(d) ? '#fafafa' : '#fff'}
            >
              {dayEvents.map((ev, ei) => (
                <div key={ei} onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                  style={{
                    fontSize: 11, padding: '3px 6px', borderRadius: 4, marginBottom: 4,
                    background: (STATUS_COLOR[ev.status] || '#6366f1') + '18',
                    borderLeft: `3px solid ${STATUS_COLOR[ev.status] || '#6366f1'}`,
                    color: STATUS_COLOR[ev.status] || '#6366f1',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {ev.event_type || ev.client_name || 'Evento'}
                  {ev.client_name && <span style={{ fontWeight: 400, opacity: .8 }}> · {ev.client_name}</span>}
                </div>
              ))}
              {dayEvents.length === 0 && (
                <div style={{ fontSize: 11, color: '#e2e8f0', textAlign: 'center', paddingTop: 12 }}>—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AGENDA VIEW ──────────────────────────────────────────────────────────────

function AgendaView({ currentDate, events, onEventClick, onCreateEvent }) {
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...events]
      .filter(ev => {
        const d = new Date(ev.event_date || ev.date);
        return !isNaN(d) && d >= today;
      })
      .sort((a, b) => new Date(a.event_date || a.date) - new Date(b.event_date || b.date))
      .slice(0, 30);
  }, [events]);

  if (upcoming.length === 0) return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
      <p style={{ margin: 0, color: '#64748b' }}>Nenhum evento futuro agendado.</p>
    </div>
  );

  let lastDateStr = '';
  return (
    <div style={{ padding: '8px 0' }}>
      {upcoming.map((ev, i) => {
        const d = new Date(ev.event_date || ev.date);
        const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        const showHeader = dateStr !== lastDateStr;
        lastDateStr = dateStr;
        return (
          <div key={ev.id || i}>
            {showHeader && (
              <div style={{ padding: '12px 16px 6px', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                {dateStr}
                {isToday(d) && <span style={{ marginLeft: 8, background: '#0f172a', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>Hoje</span>}
              </div>
            )}
            <div
              onClick={() => onEventClick(ev)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{ width: 4, height: 40, borderRadius: 2, background: STATUS_COLOR[ev.status] || '#6366f1', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{ev.event_type || 'Evento'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  {ev.client_name}{ev.location ? ` · ${ev.location}` : ''}{ev.guest_count ? ` · ${ev.guest_count} convidados` : ''}
                </p>
              </div>
              <span style={{
                padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                color: STATUS_COLOR[ev.status] || '#6366f1',
                background: (STATUS_COLOR[ev.status] || '#6366f1') + '18',
              }}>{STATUS_LABEL[ev.status] || ev.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SELECTED DAY PANEL ───────────────────────────────────────────────────────

function DayPanel({ date, events, onEventSelect, onEventCreate }) {
  const dayEvents = getEventsForDay(events, date);
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      marginTop: 12, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
          {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {isToday(date) && <span style={{ marginLeft: 8, fontSize: 11, background: '#0f172a', color: '#fff', borderRadius: 10, padding: '2px 6px' }}>Hoje</span>}
        </span>
        <button
          onClick={() => onEventCreate(date)}
          style={{
            padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
            background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 600,
          }}>
          + Novo Evento
        </button>
      </div>
      {dayEvents.length === 0 ? (
        <p style={{ margin: 0, padding: '16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
          Nenhum evento neste dia. Clique em "+ Novo Evento" para criar.
        </p>
      ) : (
        dayEvents.map((ev, i) => (
          <div key={i} onClick={() => onEventSelect(ev)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            borderBottom: i < dayEvents.length - 1 ? '1px solid #f8fafc' : 'none',
            cursor: 'pointer',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[ev.status] || '#6366f1', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{ev.event_type || 'Evento'}</p>
              {ev.client_name && <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{ev.client_name}</p>}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
              color: STATUS_COLOR[ev.status] || '#6366f1',
              background: (STATUS_COLOR[ev.status] || '#6366f1') + '18',
            }}>{STATUS_LABEL[ev.status] || ev.status}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ─── MAIN CALENDAR ────────────────────────────────────────────────────────────

export default function Calendar({ events = [], onDateSelect, onEventCreate, onEventSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'agenda'

  const navigate = (dir) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    if (onDateSelect) onDateSelect(date);
  };

  const handleEventClick = (ev) => {
    if (onEventSelect) onEventSelect(ev);
  };

  const headerTitle = useMemo(() => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
    }
    if (viewMode === 'agenda') return 'Próximos eventos';
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, viewMode]);

  return (
    <div className="calendar-root" style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      {/* ── TOOLBAR ── */}
      <div className="calendar-toolbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 8,
      }}>
        {/* Nav */}
        <div className="calendar-nav-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {viewMode !== 'agenda' && (
            <>
              <button onClick={() => navigate(-1)} style={navBtnStyle}>‹</button>
              <button onClick={() => navigate(1)}  style={navBtnStyle}>›</button>
            </>
          )}
          <span className="calendar-toolbar-title" style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', minWidth: 180 }}>{headerTitle}</span>
        </div>

        {/* View switcher + Today */}
        <div className="calendar-view-group" style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCurrentDate(new Date())} style={{ ...navBtnStyle, padding: '5px 12px', fontSize: 12 }}>Hoje</button>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
            {[['month', 'Mês'], ['week', 'Semana'], ['agenda', 'Agenda']].map(([k, l]) => (
              <button key={k} onClick={() => setViewMode(k)} style={{
                padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                background: viewMode === k ? '#fff' : 'transparent',
                color: viewMode === k ? '#0f172a' : '#64748b',
                boxShadow: viewMode === k ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── VIEWS ── */}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate} events={events}
          selectedDate={selectedDate} onDayClick={handleDayClick} onEventClick={handleEventClick}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate} events={events}
          onDayClick={handleDayClick} onEventClick={handleEventClick}
        />
      )}
      {viewMode === 'agenda' && (
        <AgendaView
          currentDate={currentDate} events={events}
          onEventClick={handleEventClick} onCreateEvent={date => { if (onEventCreate) onEventCreate(date); }}
        />
      )}

      {/* ── SELECTED DAY PANEL ── */}
      {selectedDate && viewMode !== 'agenda' && (
        <div style={{ padding: '0 12px 12px' }}>
          <DayPanel
            date={selectedDate} events={events}
            onEventSelect={handleEventClick}
            onEventCreate={(date) => { if (onEventCreate) onEventCreate(date); }}
          />
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
  background: '#fff', cursor: 'pointer', fontSize: 16, color: '#475569',
  lineHeight: 1, transition: 'all .15s',
};
