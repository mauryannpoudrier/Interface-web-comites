/**
 * Calendrier mensuel minimaliste.
 * - Couleurs par groupe de comité : ajuster la prop groupColors ou étendre le mapping si un 3e groupe est ajouté.
 * - Pastilles par comité : la prop committeeColors permet de changer le code couleur individuel.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CommitteeGroup, CommitteeId, Session } from '../App';

const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function formatKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildMonthGrid(reference: Date) {
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lundi = 0
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startOffset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    cells.push(current);
  }
  return cells;
}

type CalendarProps = {
  sessions: Session[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  groupColors: Record<CommitteeGroup, string>;
  committeeColors: Record<CommitteeId, { label: string; group: CommitteeGroup; color: string }>;
};

export default function Calendar({
  sessions,
  selectedDate,
  onSelectDate,
  groupColors,
  committeeColors,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate);
      if (!Number.isNaN(parsed.getTime())) {
        setViewDate(parsed);
      }
    }
  }, [selectedDate]);

  const sessionsByDate = useMemo(() => {
    return sessions.reduce<Record<string, Session[]>>((acc, session) => {
      const key = session.date;
      acc[key] = acc[key] ? [...acc[key], session] : [session];
      return acc;
    }, {});
  }, [sessions]);

  const currentMonthLabel = `${MONTHS_FR[viewDate.getMonth()]?.toUpperCase()} ${viewDate.getFullYear()}`;
  const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const todayKey = formatKey(new Date());

  const changeMonth = (delta: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const toggleDate = (dateKey: string) => {
    onSelectDate(selectedDate === dateKey ? null : dateKey);
  };

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button className="bouton-lien" aria-label="Mois précédent" onClick={() => changeMonth(-1)}>
          ‹
        </button>
        <div className="calendar__title">{currentMonthLabel}</div>
        <button className="bouton-lien" aria-label="Mois suivant" onClick={() => changeMonth(1)}>
          ›
        </button>
      </div>

      <div className="calendar__weekdays">
        {WEEK_DAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar__grid" role="grid" aria-label={`Calendrier ${currentMonthLabel}`}>
        {days.map((day) => {
          const key = formatKey(day);
          const isCurrentMonth = day.getMonth() === viewDate.getMonth();
          const isSelected = selectedDate === key;
          const daySessions = sessionsByDate[key] || [];
          const hasSessions = daySessions.length > 0;
          const hasMultipleGroups = new Set(daySessions.map((s) => s.committeeGroup)).size > 1;
          const indicatorGroups = Array.from(new Set(daySessions.map((s) => s.committeeGroup)));

          return (
            <button
              key={key}
              className={`calendar__day ${isCurrentMonth ? '' : 'calendar__day--muted'} ${
                isSelected ? 'calendar__day--selected' : ''
              } ${hasSessions ? 'calendar__day--has-sessions' : ''} ${key === todayKey ? 'calendar__day--today' : ''}`}
              onClick={() => toggleDate(key)}
              role="gridcell"
              aria-pressed={isSelected}
              aria-label={`Le ${day.getDate()} ${MONTHS_FR[day.getMonth()]} ${day.getFullYear()}${
                hasSessions ? `, ${daySessions.length} séance(s)` : ''
              }`}
            >
              <span className="calendar__number">{day.getDate()}</span>
              {hasSessions && (
                <span
                  className={`calendar__indicator ${hasMultipleGroups ? 'calendar__indicator--stacked' : ''}`}
                  aria-hidden="true"
                >
                  {indicatorGroups.map((group) => (
                    <span key={group} style={{ backgroundColor: groupColors[group] }} />
                  ))}
                </span>
              )}
              {hasSessions && !hasMultipleGroups && (
                <span className="calendar__badges">
                  {daySessions.map((session) => {
                    const committeeColor = committeeColors[session.committeeId]?.color ?? '#6b7280';
                    return (
                      <span
                        key={`${session.id}-badge`}
                        className="calendar__badge"
                        style={{ backgroundColor: `${committeeColor}22`, color: committeeColor }}
                      >
                        {session.committeeId}
                      </span>
                    );
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
