import { useMemo, useState } from 'react';
import type { Session, CommitteeId } from '../App';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'JANVIER',
  'FÉVRIER',
  'MARS',
  'AVRIL',
  'MAI',
  'JUIN',
  'JUILLET',
  'AOÛT',
  'SEPTEMBRE',
  'OCTOBRE',
  'NOVEMBRE',
  'DÉCEMBRE',
];

function makeDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface CalendarProps {
  sessions?: Session[];
  committeeFilter?: CommitteeId | 'all';
  onSelectDate?: (isoDate: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [extra: string]: any;
}

export default function Calendar(props: CalendarProps) {
  const allSessions: Session[] = (props.sessions ?? []) as Session[];
  const committeeFilter = props.committeeFilter ?? 'all';

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();

    for (const s of allSessions) {
      if (committeeFilter !== 'all' && s.committeeId !== committeeFilter) continue;
      const key = s.date; // format YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    return map;
  }, [allSessions, committeeFilter]);

  const monthCellDates = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const jsDay = firstOfMonth.getDay(); // 0..6 (0 = dimanche)
    const firstWeekday = (jsDay + 6) % 7; // 0 = lundi, 6 = dimanche

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];

    // 42 cases = 6 semaines
    for (let index = 0; index < 42; index++) {
      const dayNumber = index - firstWeekday + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        cells.push(null);
      } else {
        cells.push(new Date(currentYear, currentMonth, dayNumber));
      }
    }

    return cells;
  }, [currentYear, currentMonth]);

  function goToPreviousMonth() {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function goToNextMonth() {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={goToPreviousMonth}
        >
          ‹
        </button>

        <div className="calendar-month">
          {MONTHS[currentMonth]} {currentYear}
        </div>

        <button
          type="button"
          className="calendar-nav-btn"
          onClick={goToNextMonth}
        >
          ›
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {monthCellDates.map((cellDate, index) => {
          if (!cellDate) {
            return (
              <div
                key={index}
                className="calendar-day calendar-day--empty"
              />
            );
          }

          const key = makeDateKey(cellDate);
          const sessionsOnDay = sessionsByDate.get(key) ?? [];
          const hasSessions = sessionsOnDay.length > 0;
          const committees = Array.from(
            new Set(sessionsOnDay.map((s) => s.committeeId)),
          );

          const isToday =
            cellDate.getFullYear() === today.getFullYear() &&
            cellDate.getMonth() === today.getMonth() &&
            cellDate.getDate() === today.getDate();

          const baseClass = [
            'calendar-day',
            hasSessions ? 'calendar-day--has-session' : '',
            isToday ? 'calendar-day--today' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={index}
              type="button"
              className={baseClass}
              onClick={() => props.onSelectDate?.(key)}
            >
              <span className="calendar-day-number">{cellDate.getDate()}</span>

              {hasSessions && (
                <div className="calendar-day-badges">
                  {committees.map((c) => (
                    <span
                      key={c}
                      className={`calendar-badge calendar-badge--${c.toLowerCase()}`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
