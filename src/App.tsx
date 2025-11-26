import { useEffect, useMemo, useState } from "react";

/* ---------- Types de base ---------- */

type CommitteeId = "CCC" | "CCSRM" | "CCU";
type CommitteeGroup = "CCSRM" | "CCU";

type PageRoute = "home" | "ccu" | "ccsrm";

interface DocumentLink {
  label: string;
  url: string;
}

interface Session {
  id: string;
  number: string;
  committeeId: CommitteeId;
  committeeGroup: CommitteeGroup;
  date: string; // yyyy-mm-dd
  time?: string; // hh:mm
  title?: string;
  pvDocuments: DocumentLink[];
}

/* ---------- Config comités ---------- */

const STORAGE_KEY = "comites-valdor-v3";

const COMMITTEES: Record<
  CommitteeId,
  { label: string; group: CommitteeGroup; color: string }
> = {
  CCC: {
    label: "CCC – Comité consultatif de circulation",
    group: "CCSRM",
    color: "#f24405",
  },
  CCSRM: {
    label: "CCSRM – Comité consultatif de la sécurité routière et de mobilité",
    group: "CCSRM",
    color: "#f24405",
  },
  CCU: {
    label: "CCU – Comité consultatif d’urbanisme",
    group: "CCU",
    color: "#266B73",
  },
};

const COMMITTEE_GROUP_LABEL: Record<CommitteeGroup, string> = {
  CCU: "Urbanisme (CCU)",
  CCSRm: "Mobilité & sécurité (CCC / CCSRM)",
} as any; // on va utiliser le label manuellement plus bas

/* ---------- État de l’app ---------- */

interface AppState {
  sessions: Session[];
}

const defaultState: AppState = {
  sessions: [],
};

/* ---------- Utilitaires ---------- */

function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.sessions) return defaultState;
    return parsed;
  } catch {
    return defaultState;
  }
}

function saveState(state: AppState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // rien, ce n’est pas grave en prototype
  }
}

function toDateKey(d: string) {
  // yyyy-mm-dd (on garde tel quel pour les clés)
  return d;
}

function sortSessions(sessions: Session[]) {
  return [...sessions].sort((a, b) => {
    if (a.date === b.date) {
      return a.time && b.time ? a.time.localeCompare(b.time) : 0;
    }
    return a.date.localeCompare(b.date);
  });
}

/* ---------- Composants réutilisables ---------- */

interface BadgeProps {
  committeeId: CommitteeId;
}

function CommitteeBadge({ committeeId }: BadgeProps) {
  const info = COMMITTEES[committeeId];
  return (
    <span
      className="committee-badge"
      style={{
        backgroundColor: `${info.color}10`,
        borderColor: `${info.color}40`,
        color: info.color,
      }}
    >
      {committeeId}
    </span>
  );
}

interface DocumentListEditorProps {
  label: string;
  items: DocumentLink[];
  onChange: (items: DocumentLink[]) => void;
}

function DocumentListEditor({
  label,
  items,
  onChange,
}: DocumentListEditorProps) {
  const handleChange = (index: number, field: keyof DocumentLink, value: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...items, { label: "PV de la séance", url: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="form-field">
      <div className="form-label-row">
        <span className="form-label">{label}</span>
        <button
          type="button"
          className="app-btn app-btn-secondary app-btn-soft"
          onClick={handleAdd}
        >
          + Ajouter un document
        </button>
      </div>

      {items.length > 0 && (
        <div className="document-list">
          {items.map((doc, index) => (
            <div key={index} className="document-list-item">
              <input
                className="input"
                placeholder="Nom du document (ex.: PV, annexe...)"
                value={doc.label}
                onChange={(e) => handleChange(index, "label", e.target.value)}
              />
              <input
                className="input"
                placeholder="Lien ou URL"
                value={doc.url}
                onChange={(e) => handleChange(index, "url", e.target.value)}
              />
              <button
                type="button"
                className="app-btn app-btn-ghost"
                onClick={() => handleRemove(index)}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Formulaire de séance ---------- */

interface SessionFormValue {
  id?: string;
  number: string;
  committeeId: CommitteeId;
  date: string;
  time: string;
  title: string;
  pvDocuments: DocumentLink[];
}

interface SessionFormProps {
  value: SessionFormValue;
  onChange: (value: SessionFormValue) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

function SessionForm({ value, onChange, onSubmit, onCancel }: SessionFormProps) {
  const handleFieldChange = (field: keyof SessionFormValue, val: string | DocumentLink[]) => {
    onChange({ ...value, [field]: val } as SessionFormValue);
  };

  const currentCommittee = COMMITTEES[value.committeeId];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Ajouter ou modifier une séance</h2>
          <p className="card-subtitle">
            Numéro, date, comité et documents pour le PV.
          </p>
        </div>
        <CommitteeBadge committeeId={value.committeeId} />
      </div>

      <div className="card-body">
        <div className="form-grid">
          <div className="form-field">
            <span className="form-label">Numéro de séance</span>
            <input
              className="input"
              placeholder="CCU-2026-01"
              value={value.number}
              onChange={(e) => handleFieldChange("number", e.target.value)}
            />
          </div>

          <div className="form-field">
            <span className="form-label">Date</span>
            <input
              type="date"
              className="input"
              value={value.date}
              onChange={(e) => handleFieldChange("date", e.target.value)}
            />
          </div>

          <div className="form-field">
            <span className="form-label">Heure</span>
            <input
              type="time"
              className="input"
              value={value.time}
              onChange={(e) => handleFieldChange("time", e.target.value)}
            />
          </div>

          <div className="form-field">
            <span className="form-label">Comité</span>
            <select
              className="input"
              value={value.committeeId}
              onChange={(e) =>
                handleFieldChange("committeeId", e.target.value as CommitteeId)
              }
            >
              <option value="CCU">
                CCU – Comité consultatif d’urbanisme
              </option>
              <option value="CCC">
                CCC – Comité consultatif de circulation
              </option>
              <option value="CCSRM">
                CCSRM – Comité consultatif de la sécurité routière et de mobilité
              </option>
            </select>
          </div>

          <div className="form-field form-field-wide">
            <span className="form-label">Titre (optionnel)</span>
            <input
              className="input"
              placeholder={`Séance ${value.number || ""} – ${
                currentCommittee?.label ?? ""
              }`}
              value={value.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
            />
          </div>
        </div>

        <DocumentListEditor
          label="PV de séance"
          items={value.pvDocuments}
          onChange={(docs) => handleFieldChange("pvDocuments", docs)}
        />

        <div className="actions-formulaire">
          <button
            type="button"
            className="app-btn app-btn-primary"
            onClick={onSubmit}
          >
            Enregistrer la séance
          </button>
          {onCancel && (
            <button
              type="button"
              className="app-btn app-btn-secondary app-btn-ghost"
              onClick={onCancel}
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Calendrier mensuel ---------- */

interface CalendarProps {
  monthDate: Date; // n’importe quel jour du mois affiché
  sessions: Session[];
  highlightedGroup?: CommitteeGroup | null;
  onChangeMonth: (newMonth: Date) => void;
  onSelectDate: (dateKey: string | null) => void;
  selectedDateKey: string | null;
}

function CalendarMonth({
  monthDate,
  sessions,
  highlightedGroup,
  onChangeMonth,
  onSelectDate,
  selectedDateKey,
}: CalendarProps) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth(); // 0-11

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Lundi=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const sessionByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of sessions) {
      if (highlightedGroup && s.committeeGroup !== highlightedGroup) continue;
      const key = toDateKey(s.date);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions, highlightedGroup]);

  const handlePrevMonth = () => {
    onChangeMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onChangeMonth(new Date(year, month + 1, 1));
  };

  const monthFormatter = new Intl.DateTimeFormat("fr-CA", {
    month: "long",
    year: "numeric",
  });

  const weekdayShort = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="card calendar-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Prochaines séances</h2>
        </div>
        <div className="calendar-header-controls">
          <button
            type="button"
            className="app-btn app-btn-ghost app-btn-icon"
            onClick={handlePrevMonth}
          >
            ‹
          </button>
          <span className="calendar-month-label">
            {monthFormatter.format(monthDate).toUpperCase()}
          </span>
          <button
            type="button"
            className="app-btn app-btn-ghost app-btn-icon"
            onClick={handleNextMonth}
          >
            ›
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="calendar-grid">
          {/* Ligne unique L M M J V S D parfaitement alignée */}
          {weekdayShort.map((label, index) => (
            <div key={index} className="calendar-weekday">
              {label}
            </div>
          ))}

          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="calendar-day empty" />;
            }
            const dateKey = day.toISOString().slice(0, 10);
            const sameDay = sessionByDay[dateKey] ?? [];
            const isSelected = selectedDateKey === dateKey;

            return (
              <button
                key={index}
                type="button"
                className={
                  "calendar-day" +
                  (sameDay.length > 0 ? " has-session" : "") +
                  (isSelected ? " is-selected" : "")
                }
                onClick={() =>
                  onSelectDate(isSelected ? null : dateKey)
                }
              >
                <span className="calendar-day-number">{day.getDate()}</span>
                {/* Pastilles de comités si séances */}
                {sameDay.length > 0 && (
                  <div className="calendar-day-badges">
                    {sameDay.slice(0, 3).map((s) => (
                      <CommitteeBadge
                        key={s.id}
                        committeeId={s.committeeId}
                      />
                    ))}
                    {sameDay.length > 3 && (
                      <span className="calendar-day-more">
                        +{sameDay.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Liste de séances sous le calendrier ---------- */

interface SessionListProps {
  sessions: Session[];
  selectedDateKey: string | null;
  filteredGroup?: CommitteeGroup | null;
}

function SessionList({ sessions, selectedDateKey, filteredGroup }: SessionListProps) {
  const sorted = useMemo(
    () => sortSessions(sessions),
    [sessions]
  );

  const filtered = sorted.filter((s) => {
    if (filteredGroup && s.committeeGroup !== filteredGroup) return false;
    if (selectedDateKey && s.date !== selectedDateKey) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <p className="muted">
        Aucune séance à venir pour ce filtre / cette date.
      </p>
    );
  }

  return (
    <div className="session-list">
      {filtered.map((s) => (
        <div key={s.id} className="session-list-item">
          <div className="session-list-main">
            <CommitteeBadge committeeId={s.committeeId} />
            <div>
              <div className="session-list-title">
                {s.number || "Séance"}{" "}
                {s.title && <span className="session-list-subtitle">– {s.title}</span>}
              </div>
              <div className="session-list-meta">
                <span>
                  {new Date(s.date).toLocaleDateString("fr-CA", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {s.time && <span>• {s.time}</span>}
              </div>
            </div>
          </div>
          {s.pvDocuments.length > 0 && (
            <div className="session-list-docs">
              {s.pvDocuments.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url || "#"}
                  className="session-doc-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  {doc.label || "Document"}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Composant principal App ---------- */

function App() {
  const [state, setState] = useState<AppState>(() =>
    typeof window === "undefined" ? defaultState : loadState()
  );
  const [page, setPage] = useState<PageRoute>("home");

  const [formValue, setFormValue] = useState<SessionFormValue>({
    number: "",
    committeeId: "CCU",
    date: "",
    time: "",
    title: "",
    pvDocuments: [],
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Sauvegarde localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      saveState(state);
    }
  }, [state]);

  const allSessions = useMemo(
    () => sortSessions(state.sessions),
    [state.sessions]
  );

  const currentGroup: CommitteeGroup | null = page === "home"
    ? null
    : page === "ccu"
    ? "CCU"
    : "CCSRM";

  const filteredSessionsForCalendar = currentGroup
    ? allSessions.filter((s) => s.committeeGroup === currentGroup)
    : allSessions;

  const handleSubmitSession = () => {
    if (!formValue.date || !formValue.number) {
      alert("Merci d’indiquer au minimum le numéro et la date de la séance.");
      return;
    }

    const committeeInfo = COMMITTEES[formValue.committeeId];

    const newSession: Session = {
      id: editingId ?? `session-${Date.now()}`,
      number: formValue.number,
      committeeId: formValue.committeeId,
      committeeGroup: committeeInfo.group,
      date: formValue.date,
      time: formValue.time || undefined,
      title: formValue.title || undefined,
      pvDocuments: formValue.pvDocuments || [],
    };

    setState((prev) => {
      const other = prev.sessions.filter((s) => s.id !== newSession.id);
      return { ...prev, sessions: [...other, newSession] };
    });

    setEditingId(null);
    setFormValue({
      number: "",
      committeeId: formValue.committeeId,
      date: "",
      time: "",
      title: "",
      pvDocuments: [],
    });
  };

  const handleEditSession = (session: Session) => {
    setEditingId(session.id);
    setFormValue({
      id: session.id,
      number: session.number,
      committeeId: session.committeeId,
      date: session.date,
      time: session.time ?? "",
      title: session.title ?? "",
      pvDocuments: session.pvDocuments ?? [],
    });
    setPage("home");
  };

  const handleDeleteSession = (id: string) => {
    if (
      !window.confirm(
        "Supprimer cette séance et tous ses documents associés ?"
      )
    ) {
      return;
    }
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
    }));
  };

  const sessionsForPage = currentGroup
    ? allSessions.filter((s) => s.committeeGroup === currentGroup)
    : allSessions;

  /* ---------- Rendu ---------- */

  return (
    <div className="app-shell">
      {/* Bande du haut */}
      <header className="app-header">
        <div className="app-header-main">
          <div className="app-header-left">
            <div className="app-header-title-block">
              <h1 className="app-title">Suivi des comités CCC, CCSRM et CCU</h1>
              <p className="app-subtitle">
                Interface de travail pour suivre les séances, les PV et les sujets
                prioritaires.
              </p>
            </div>
          </div>

          <div className="app-header-right">
            {/* Bouton fictif pour rappeler que c’est un outil interne */}
            <span className="app-pill">Prototype interne</span>
          </div>
        </div>

        <nav className="app-nav">
          <button
            type="button"
            className={
              "app-nav-item" + (page === "home" ? " is-active" : "")
            }
            onClick={() => setPage("home")}
          >
            Accueil
          </button>
          <button
            type="button"
            className={
              "app-nav-item" + (page === "ccu" ? " is-active" : "")
            }
            onClick={() => setPage("ccu")}
          >
            Urbanisme (CCU)
          </button>
          <button
            type="button"
            className={
              "app-nav-item" + (page === "ccsrm" ? " is-active" : "")
            }
            onClick={() => setPage("ccsrm")}
          >
            Mobilité & sécurité (CCC / CCSRM)
          </button>
        </nav>
      </header>

      {/* Contenu principal */}
      <main className="app-main">
        {/* ACCUEIL : formulaire + calendrier */}
        {page === "home" && (
          <div className="layout-two-columns">
            <div className="layout-column">
              <SessionForm
                value={formValue}
                onChange={setFormValue}
                onSubmit={handleSubmitSession}
                onCancel={
                  editingId
                    ? () => {
                        setEditingId(null);
                        setFormValue({
                          number: "",
                          committeeId: formValue.committeeId,
                          date: "",
                          time: "",
                          title: "",
                          pvDocuments: [],
                        });
                      }
                    : undefined
                }
              />
            </div>

            <div className="layout-column">
              <CalendarMonth
                monthDate={calendarMonth}
                sessions={filteredSessionsForCalendar}
                highlightedGroup={currentGroup}
                onChangeMonth={setCalendarMonth}
                selectedDateKey={selectedDateKey}
                onSelectDate={setSelectedDateKey}
              />

              <div className="card mt-lg">
                <div className="card-header">
                  <h2 className="card-title">Séances à venir</h2>
                </div>
                <div className="card-body">
                  <SessionList
                    sessions={sessionsForPage}
                    selectedDateKey={selectedDateKey}
                    filteredGroup={currentGroup}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE CCU */}
        {page === "ccu" && (
          <div className="layout-single-column">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Séances du CCU</h2>
                <p className="card-subtitle">
                  Liste des séances du Comité consultatif d’urbanisme.
                </p>
              </div>
              <div className="card-body">
                <SessionList
                  sessions={sessionsForPage}
                  selectedDateKey={null}
                  filteredGroup="CCU"
                />
                {sessionsForPage.length > 0 && (
                  <div className="session-actions-inline">
                    {sessionsForPage.map((s) => (
                      <div key={s.id} className="session-inline-row">
                        <button
                          type="button"
                          className="app-btn app-btn-secondary app-btn-soft"
                          onClick={() => handleEditSession(s)}
                        >
                          Modifier {s.number}
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-ghost"
                          onClick={() => handleDeleteSession(s.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE CCC / CCSRM */}
        {page === "ccsrm" && (
          <div className="layout-single-column">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  Séances CCC / CCSRM – sécurité routière et mobilité
                </h2>
                <p className="card-subtitle">
                  Pour suivre les dossiers liés à la circulation, la sécurité
                  et la mobilité.
                </p>
              </div>
              <div className="card-body">
                <SessionList
                  sessions={sessionsForPage}
                  selectedDateKey={null}
                  filteredGroup="CCSRM"
                />
                {sessionsForPage.length > 0 && (
                  <div className="session-actions-inline">
                    {sessionsForPage.map((s) => (
                      <div key={s.id} className="session-inline-row">
                        <button
                          type="button"
                          className="app-btn app-btn-secondary app-btn-soft"
                          onClick={() => handleEditSession(s)}
                        >
                          Modifier {s.number}
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-ghost"
                          onClick={() => handleDeleteSession(s.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
