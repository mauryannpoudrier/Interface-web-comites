import { useEffect, useMemo, useState } from 'react';
import Calendar from './components/Calendar';
import MapView, { type MapMarker } from './components/MapView';

export type CommitteeId = 'CCC' | 'CCSRM' | 'CCU';
export type CommitteeGroup = 'CCSRM' | 'CCU';

export interface DocumentLink {
  label: string;
  url: string;
}

export interface Session {
  id: string;
  committeeId: CommitteeId;
  committeeGroup: CommitteeGroup;
  sessionNumber: string;
  date: string;
  time?: string;
  title?: string;
  pvDocuments: DocumentLink[];
}

interface Category {
  id: string;
  label: string;
  color?: string;
}

interface Subject {
  id: string;
  sessionId: string;
  subjectNumber: string;
  subjectTitle: string;
  shortLabel?: string;
  longDescription: string;
  categoriesIds: string[];
  keywords: string[];
  resolutionNumbers: string[];
  extraitDocuments: DocumentLink[];
  attachments: DocumentLink[];
  location?: {
    lat: number;
    lng: number;
    pinColor?: string;
  };
}

interface AppState {
  sessions: Session[];
  subjects: Subject[];
  categories: Category[];
}

type Route =
  | { page: 'home' }
  | { page: 'ccu' }
  | { page: 'ccsrm' }
  | { page: 'search' }
  | { page: 'session'; sessionId: string };

const STORAGE_KEY = 'comites-valdor:v2';

const COMMITTEES: Record<CommitteeId, { label: string; group: CommitteeGroup; color: string }> = {
  CCC:  { label: 'CCC – Comité consultatif de circulation', group: 'CCSRM', color: '#F24405' },
  CCSRM: {
    label: 'CCSRM – Comité consultatif de la sécurité routière et de mobilité',
    group: 'CCSRM',
    color: '#590202', // ou une autre couleur si tu veux différencier
  },
  CCU:  { label: 'CCU – Comité consultatif d’urbanisme', group: 'CCU',  color: '#266B73' },
};

const COMMITTEE_GROUP_COLORS: Record<CommitteeGroup, string> = {
  CCSRM: '#590202',
  CCU: '#266B73',
};

const MAP_PIN_COLORS: Record<CommitteeGroup, string> = {
  CCU: '#22c55e',
  CCSRM: '#3b82f6',
};

const defaultState: AppState = {
  categories: [
    { id: 'mobilite active', label: 'Mobilité active', color: '#0ea5e9' },
    { id: 'securite routiere', label: 'Sécurité routière', color: '#f59e0b' },
  ],
  sessions: [
    {
      id: 'CCSRM-12-2025-03-10',
      committeeId: 'CCSRM',
      committeeGroup: 'CCSRM',
      sessionNumber: 'CCSRM-12',
      date: '2025-03-10',
      time: '19:00',
      title: 'Séance ordinaire de mars',
      pvDocuments: [
        { label: 'PV global', url: 'https://exemple.org/pv/ccsrm-12.pdf' },
      ],
    },
    {
      id: 'CCC-07-2025-02-12',
      committeeId: 'CCC',
      committeeGroup: 'CCSRM',
      sessionNumber: 'CCC-07',
      date: '2025-02-12',
      time: '18:00',
      title: 'Comité circulation février',
      pvDocuments: [],
    },
    {
      id: 'CCU-08-2025-03-05',
      committeeId: 'CCU',
      committeeGroup: 'CCU',
      sessionNumber: 'CCU-08',
      date: '2025-03-05',
      time: '17:30',
      title: 'Urbanisme – mars',
      pvDocuments: [
        { label: 'PV', url: 'https://exemple.org/pv/ccu-08.pdf' },
      ],
    },
  ],
  subjects: [
    {
      id: 'sub-veloroute',
      sessionId: 'CCC-07-2025-02-12',
      subjectNumber: '1',
      subjectTitle: 'Boucle cyclable temporaire',
      shortLabel: 'Véloroute',
      longDescription:
        'Analyse des corridors temporaires pour l’été, intersections prioritaires et signalisation à déployer.',
      categoriesIds: ['mobilite', 'securite'],
      keywords: ['cyclisme', 'boucle', 'signalisation'],
      resolutionNumbers: ['2025-04'],
      extraitDocuments: [{ label: 'Extrait résolution 2025-04', url: 'https://exemple.org/extraits/2025-04.pdf' }],
      attachments: [{ label: 'Carte proposée', url: 'https://exemple.org/cartes/velo.pdf' }],
      location: { lat: 48.095, lng: -77.782, pinColor: '#0ea5e9' },
    },
    {
      id: 'sub-frp',
      sessionId: 'CCSRM-12-2025-03-10',
      subjectNumber: 'A-3',
      subjectTitle: 'Feux rectangulaires rapides devant les écoles',
      longDescription:
        'Retour sur le projet pilote et priorisation des sites pour déploiement permanent. Mention des budgets et partenaires.',
      categoriesIds: ['securite'],
      keywords: ['écoles', 'FRR', 'piétons'],
      resolutionNumbers: ['2025-12', '2025-13'],
      extraitDocuments: [
        { label: 'Extrait FRR', url: 'https://exemple.org/extraits/frr.pdf' },
      ],
      attachments: [
        { label: 'Lettre de l’école', url: 'https://exemple.org/docs/lettes-ecole.pdf' },
      ],
    },
    {
      id: 'sub-valmont',
      sessionId: 'CCU-08-2025-03-05',
      subjectNumber: 'CCU-2025-14',
      subjectTitle: 'Projet résidentiel Valmont',
      shortLabel: 'Valmont',
      longDescription:
        'Analyse de conformité au PIIA, intégration paysagère et verdissement. Le promoteur souhaite un phasage en deux étapes.',
      categoriesIds: ['urbanisme', 'amenagement'],
      keywords: ['habitation', 'verdissement', 'zonage'],
      resolutionNumbers: ['2025-22'],
      extraitDocuments: [],
      attachments: [{ label: 'Plan d’implantation', url: 'https://exemple.org/plans/valmont.pdf' }],
    },
  ],
};

function loadInitialState(): AppState {
  if (typeof window === 'undefined') return defaultState;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultState;
  try {
    const parsed = JSON.parse(saved) as AppState;
    if (!parsed.sessions || !parsed.subjects || !parsed.categories) return defaultState;
    return parsed;
  } catch (error) {
    console.warn('Impossible de lire les données locales', error);
    return defaultState;
  }
}

function saveState(state: AppState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(date: string, time?: string) {
  const composed = time ? `${date}T${time}` : date;
  const parsed = new Date(composed);
  return parsed.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function parseHash(): Route {
  const hash = window.location.hash.replace('#', '');
  const parts = hash.split('/').filter(Boolean);
  if (!parts.length) return { page: 'home' };
  if (parts[0] === 'ccu') return { page: 'ccu' };
  if (parts[0] === 'ccsrm') return { page: 'ccsrm' };
  if (parts[0] === 'search') return { page: 'search' };
  if (parts[0] === 'sessions' && parts[1]) return { page: 'session', sessionId: parts[1] };
  return { page: 'home' };
}

function buildHash(route: Route) {
  switch (route.page) {
    case 'home':
      return '#/';
    case 'ccu':
      return '#/ccu';
    case 'ccsrm':
      return '#/ccsrm';
    case 'search':
      return '#/search';
    case 'session':
      return `#/sessions/${route.sessionId}`;
    default:
      return '#/';
  }
}

function Badge({ committeeId }: { committeeId: CommitteeId }) {
  const meta = COMMITTEES[committeeId];
  return (
    <span className="badge-comite" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
      {committeeId}
    </span>
  );
}

function DocumentListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: DocumentLink[];
  onChange: (docs: DocumentLink[]) => void;
}) {
  const updateItem = (index: number, key: keyof DocumentLink, value: string) => {
    onChange(items.map((doc, idx) => (idx === index ? { ...doc, [key]: value } : doc)));
  };

  return (
    <div className="liste-docs">
      <div className="liste-docs-entete">
        <p className="surTitre">{label}</p>
        <button
          type="button"
          className="bouton-lien"
          onClick={() => onChange([...items, { label: 'Nouveau document', url: '' }])}
        >
          + Ajouter un document
        </button>
      </div>
      {items.map((doc, index) => (
        <div key={`${doc.label}-${index}`} className="ligne-formulaire">
          <label>
            Libellé
            <input value={doc.label} onChange={(e) => updateItem(index, 'label', e.target.value)} />
          </label>
          <label>
            URL
            <input value={doc.url} onChange={(e) => updateItem(index, 'url', e.target.value)} placeholder="https://..." />
          </label>
          <button
            type="button"
            className="bouton-lien"
            onClick={() => onChange(items.filter((_, idx) => idx !== index))}
          >
            Supprimer
          </button>
        </div>
      ))}
      {items.length === 0 && <p className="vide">Aucun document pour l’instant.</p>}
    </div>
  );
}

function CategorySelector({
  categories,
  selected,
  onChange,
  onCreate,
}: {
  categories: Category[];
  selected: string[];
  onChange: (values: string[]) => void;
  onCreate: (categorie: Category) => void;
}) {
  const [newCategory, setNewCategory] = useState({ label: '', color: '' });

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((cat) => cat !== id) : [...selected, id]);
  };

  const addCategory = () => {
    if (!newCategory.label.trim()) return;
    const id = newCategory.label.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    const created = { id, label: newCategory.label.trim(), color: newCategory.color || undefined };
    onCreate(created);
    onChange([...selected, created.id]);
    setNewCategory({ label: '', color: '' });
  };

  return (
    <div className="bloc">
      <p className="surTitre">Catégories</p>
      <div className="categories">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`tag ${selected.includes(cat.id) ? 'actif' : ''}`}
            style={{ borderColor: cat.color ?? '#d0d7ff', color: cat.color ?? '#111827' }}
            onClick={() => toggle(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="ligne-formulaire nouveau-cat">
        <label>
          + Nouvelle catégorie
          <input
            value={newCategory.label}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Titre de la catégorie"
          />
        </label>
        <label>
          Couleur (optionnel)
          <input
            value={newCategory.color}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, color: e.target.value }))}
            placeholder="#14b8a6"
          />
        </label>
        <button type="button" className="bouton-secondaire" onClick={addCategory}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

function SessionForm({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: Omit<Session, 'id' | 'committeeGroup'>;
  onChange: (field: keyof Omit<Session, 'id' | 'committeeGroup'>, val: string | DocumentLink[]) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="session-form">
      <div className="form-row">
        <div className="form-field">
          <p className="surTitre">Séances</p>
          <h2>Ajouter ou modifier une séance</h2>
        </div>
        <div className="form-field" style={{ textAlign: 'right' }}>
          <Badge committeeId={value.committeeId} />
        </div>
      </div>
      <div className="form-row">
        <label className="form-field">
          <span className="form-label">Numéro de séance</span>
          <input value={value.sessionNumber} onChange={(e) => onChange('sessionNumber', e.target.value)} />
        </label>
        <label className="form-field">
          <span className="form-label">Date</span>
          <input type="date" value={value.date} onChange={(e) => onChange('date', e.target.value)} />
        </label>
        <label className="form-field">
          <span className="form-label">Heure</span>
          <input type="time" value={value.time ?? ''} onChange={(e) => onChange('time', e.target.value)} />
        </label>
      </div>
      <div className="form-row">
        <label className="form-field">
          <span className="form-label">Comité</span>
          <select value={value.committeeId} onChange={(e) => onChange('committeeId', e.target.value as CommitteeId)}>
            {Object.entries(COMMITTEES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="form-label">Titre (optionnel)</span>
          <input value={value.title ?? ''} onChange={(e) => onChange('title', e.target.value)} />
        </label>
      </div>
      <DocumentListEditor
        label="PV de séance"
        items={value.pvDocuments}
        onChange={(docs) => onChange('pvDocuments', docs)}
      />
      <div className="actions-formulaire">
        <button className="bouton-principal" type="button" onClick={onSubmit}>
          Enregistrer la séance
        </button>
        {onCancel && (
          <button className="bouton-secondaire" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function SubjectForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  categories,
  onCreateCategory,
}: {
  value: Omit<Subject, 'id' | 'sessionId'>;
  onChange: (field: keyof Omit<Subject, 'id' | 'sessionId'>, val: unknown) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  categories: Category[];
  onCreateCategory: (categorie: Category) => void;
}) {
  const parseList = (input: string) => input.split(',').map((v) => v.trim()).filter(Boolean);

  return (
    <div className="card sujet-form">
      <div className="entete-formulaire">
        <div>
          <p className="surTitre">Sujet</p>
          <h3>Ajouter / modifier un sujet</h3>
        </div>
        <span className="pastille">Dossier</span>
      </div>
      <div className="ligne-formulaire">
        <label>
          Numéro du sujet
          <input value={value.subjectNumber} onChange={(e) => onChange('subjectNumber', e.target.value)} />
        </label>
        <label>
          Titre
          <input value={value.subjectTitle} onChange={(e) => onChange('subjectTitle', e.target.value)} />
        </label>
        <label>
          Libellé court (optionnel)
          <input value={value.shortLabel ?? ''} onChange={(e) => onChange('shortLabel', e.target.value)} />
        </label>
      </div>
      <label className="bloc">
        Description longue
        <textarea
          rows={5}
          value={value.longDescription}
          onChange={(e) => onChange('longDescription', e.target.value)}
          placeholder="Coller ici le texte complet du PV, considérants, etc."
        />
      </label>
      <CategorySelector
        categories={categories}
        selected={value.categoriesIds}
        onChange={(vals) => onChange('categoriesIds', vals)}
        onCreate={onCreateCategory}
      />
      <div className="ligne-formulaire">
        <label>
          Mots-clés (séparés par des virgules)
          <input
            value={value.keywords.join(', ')}
            onChange={(e) => onChange('keywords', parseList(e.target.value))}
            placeholder="piétons, vitesse, corridor"
          />
        </label>
        <label>
          Numéros de résolution (séparés par des virgules)
          <input
            value={value.resolutionNumbers.join(', ')}
            onChange={(e) => onChange('resolutionNumbers', parseList(e.target.value))}
            placeholder="2025-04, 2025-05"
          />
        </label>
      </div>
      <div className="ligne-formulaire">
        <label>
          Latitude (optionnel)
          <input
            type="number"
            value={value.location?.lat ?? ''}
            onChange={(e) =>
              onChange('location', {
                ...value.location,
                lat: Number(e.target.value),
                lng: value.location?.lng ?? 0,
                pinColor: value.location?.pinColor,
              })
            }
          />
        </label>
        <label>
          Longitude (optionnel)
          <input
            type="number"
            value={value.location?.lng ?? ''}
            onChange={(e) =>
              onChange('location', {
                ...value.location,
                lat: value.location?.lat ?? 0,
                lng: Number(e.target.value),
                pinColor: value.location?.pinColor,
              })
            }
          />
        </label>
        <label>
          Couleur du point (optionnel)
          <input
            value={value.location?.pinColor ?? ''}
            onChange={(e) =>
              onChange('location', {
                ...value.location,
                lat: value.location?.lat ?? 0,
                lng: value.location?.lng ?? 0,
                pinColor: e.target.value,
              })
            }
            placeholder="#ff0000"
          />
        </label>
      </div>
      <DocumentListEditor
        label="Extraits (résolutions)"
        items={value.extraitDocuments}
        onChange={(docs) => onChange('extraitDocuments', docs)}
      />
      <DocumentListEditor
        label="Pièces jointes"
        items={value.attachments}
        onChange={(docs) => onChange('attachments', docs)}
      />
      <div className="actions-formulaire">
        <button className="bouton-principal" type="button" onClick={onSubmit}>
          Enregistrer le sujet
        </button>
        {onCancel && (
          <button className="bouton-secondaire" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  subjects,
  onEdit,
  onDelete,
  navigate,
}: {
  session: Session;
  subjects: Subject[];
  onEdit?: (session: Session) => void;
  onDelete?: (id: string) => void;
  navigate: (route: Route) => void;
}) {
  const meta = COMMITTEES[session.committeeId];
  const committeeClass = `session-committee-pill ${session.committeeGroup === 'CCU' ? 'ccu' : 'ccsrm'}`;
  return (
    <article className="session-card">
      <div>
        <div className="session-card-header">
          <span className={committeeClass}>{session.committeeId}</span>
          <p className="surTitre">{session.sessionNumber}</p>
        </div>
        <h3>{meta.label}</h3>
        <p className="session-date">
          {formatDate(session.date, session.time)} {session.time && <span>• {session.time}</span>}
        </p>
        {session.title && <p className="session-subject-title">{session.title}</p>}
        <div className="meta">
          {session.pvDocuments.map((doc) => (
            <a key={doc.label} className="etiquette" href={doc.url} target="_blank" rel="noreferrer">
              Ouvrir le PV · {doc.label}
            </a>
          ))}
        </div>
        <p className="surTitre">{subjects.length} sujet(s) liés</p>
      </div>
      <div className="actions">
        <button className="bouton-secondaire" onClick={() => navigate({ page: 'session', sessionId: session.id })}>
          Voir la séance
        </button>
        {onEdit && <button className="bouton-lien" onClick={() => onEdit(session)}>Modifier</button>}
        {onDelete && (
          <button className="bouton-lien" onClick={() => onDelete(session.id)}>
            Supprimer
          </button>
        )}
      </div>
    </article>
  );
}

function SubjectDetail({ subject, categories }: { subject: Subject; categories: Category[] }) {
  const categoryLabels = subject.categoriesIds
    .map((id) => categories.find((c) => c.id === id)?.label)
    .filter(Boolean) as string[];

  return (
    <div className="card sujet-detail">
      <div className="ligne-titre">
        <h4>
          {subject.subjectNumber} – {subject.subjectTitle}
        </h4>
        {subject.shortLabel && <span className="etiquette secondaire">{subject.shortLabel}</span>}
      </div>
      <p className="surTitre">Catégories</p>
      <div className="meta">
        {categoryLabels.length ? (
          categoryLabels.map((label) => (
            <span key={label} className="etiquette">
              {label}
            </span>
          ))
        ) : (
          <span className="etiquette neutre">Non classé</span>
        )}
      </div>
      <p className="description">
        {subject.longDescription.split('\n').map((line, idx) => (
          <span key={idx}>
            {line}
            <br />
          </span>
        ))}
      </p>
      <div className="grille-docs">
        <div>
          <p className="surTitre">Extraits (résolutions)</p>
          {subject.extraitDocuments.length ? (
            <ul>
              {subject.extraitDocuments.map((doc) => (
                <li key={doc.label}>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vide">Aucun extrait disponible.</p>
          )}
        </div>
        <div>
          <p className="surTitre">Pièces jointes</p>
          {subject.attachments.length ? (
            <ul>
              {subject.attachments.map((doc) => (
                <li key={doc.label}>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vide">Aucune pièce jointe.</p>
          )}
        </div>
      </div>
      <div className="meta">
        <span className="etiquette clair">Mots-clés : {subject.keywords.join(', ') || '—'}</span>
        <span className="etiquette clair">Résolutions : {subject.resolutionNumbers.join(', ') || '—'}</span>
      </div>
    </div>
  );
}

function HomePage({
  sessions,
  subjects,
  onUpsert,
  onDelete,
  navigate,
}: {
  sessions: Session[];
  subjects: Subject[];
  onUpsert: (session: Session | Omit<Session, 'committeeGroup'> & { id?: string }) => void;
  onDelete: (id: string) => void;
  navigate: (route: Route) => void;
}) {
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState<Omit<Session, 'id' | 'committeeGroup'>>({
    committeeId: 'CCU',
    sessionNumber: '',
    date: '',
    time: '',
    title: '',
    pvDocuments: [],
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      const { id, committeeGroup, ...rest } = editing;
      setForm(rest);
    }
  }, [editing]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) =>
        new Date(`${a.date}T${a.time ?? '00:00'}`).getTime() -
        new Date(`${b.date}T${b.time ?? '00:00'}`).getTime(),
      ),
    [sessions],
  );

  const visibleSessions = useMemo(
    () => (selectedDate ? sortedSessions.filter((session) => session.date === selectedDate) : sortedSessions),
    [selectedDate, sortedSessions],
  );

  const submit = () => {
    if (!form.sessionNumber || !form.date) return;
    const payload = editing ? { ...editing, ...form } : { ...form };
    onUpsert(payload as Session);
    setEditing(null);
    setForm({ committeeId: 'CCU', sessionNumber: '', date: '', time: '', title: '', pvDocuments: [] });
  };

  return (
    <div className="home-screen">
      <div className="home-grid">
        <div className="card calendar-card">
          <div className="calendar-header">
            <div>
              <p className="surTitre">Calendrier</p>
              <h2>Prochaines séances</h2>
            </div>
            <span className="pastille">Agenda</span>
          </div>
          <Calendar
            sessions={sortedSessions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            groupColors={COMMITTEE_GROUP_COLORS}
            committeeColors={COMMITTEES}
          />
        </div>
        <div className="card add-session-card">
          <SessionForm
            value={form}
            onChange={(field, val) => setForm((prev) => ({ ...prev, [field]: val }))}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      </div>
      <div className="card upcoming-card">
        <div className="entete-liste">
          <p className="surTitre">
            {selectedDate ? `Séances du ${formatDate(selectedDate)}` : 'Séances à venir'}
          </p>
          {selectedDate && (
            <button className="bouton-lien" type="button" onClick={() => setSelectedDate(null)}>
              Tout voir
            </button>
          )}
        </div>
        <div className="session-list">
          {visibleSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              subjects={subjects.filter((s) => s.sessionId === session.id)}
              onEdit={(s) => setEditing(s)}
              onDelete={onDelete}
              navigate={navigate}
            />
          ))}
          {visibleSessions.length === 0 && <p className="vide">Aucune séance ce jour-là.</p>}
        </div>
      </div>
    </div>
  );
}

function CommitteePage({
  group,
  sessions,
  subjects,
  categories,
  navigate,
  onSelectSujet,
}: {
  group: CommitteeGroup;
  sessions: Session[];
  subjects: Subject[];
  categories: Category[];
  navigate: (route: Route) => void;
  onSelectSujet: (sujetId: string) => void;
}) {
  const [filterCat, setFilterCat] = useState<string>('');
  const filteredSessions = sessions.filter((s) => s.committeeGroup === group);
  const mapMarkers: MapMarker[] = useMemo(() => {
    const sessionIds = filteredSessions.map((s) => s.id);
    return subjects
      .filter((subject) => sessionIds.includes(subject.sessionId))
      .filter((subject) => (filterCat ? subject.categoriesIds.includes(filterCat) : true))
      .flatMap((subject) =>
        subject.location
          ? [
              {
                lat: subject.location.lat,
                lng: subject.location.lng,
                color: MAP_PIN_COLORS[group],
                title: subject.subjectTitle,
                label: subject.subjectNumber,
                subjectId: subject.id,
              },
            ]
          : [],
      );
  }, [filteredSessions, filterCat, group, subjects]);

  return (
    <div className="committee-page">
      <div className="card map-card">
        <div className="entete-formulaire">
          <div>
            <p className="surTitre">Carte globale</p>
            <h2>Sujets {group === 'CCU' ? 'CCU' : 'CCSRM/CCC'}</h2>
          </div>
          <span className="pastille">Carte</span>
        </div>
        <MapView
          title={`Carte en vue satellite avec tous les sujets ${group === 'CCU' ? 'CCU' : 'CCSRM/CCC'}`}
          accent={COMMITTEE_GROUP_COLORS[group]}
          markers={mapMarkers}
          onSelectSujet={onSelectSujet}
        />
      </div>
      <div className="card filters-card">
        <div className="entete-formulaire">
          <div>
            <p className="surTitre">Filtres</p>
            <h2>Catégorie des sujets</h2>
          </div>
          <span className="pastille">Recherche</span>
        </div>
        <label>
          Filtrer par catégorie
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">Toutes</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="session-list">
        {filteredSessions.map((session) => {
          const sessionSubjects = subjects.filter((s) => s.sessionId === session.id);
          const visibles = filterCat
            ? sessionSubjects.filter((s) => s.categoriesIds.includes(filterCat))
            : sessionSubjects;
          const committeeClass = `session-committee-pill ${
            COMMITTEES[session.committeeId].group === 'CCU' ? 'ccu' : 'ccsrm'
          }`;
          return (
            <div key={session.id} className="session-card">
              <div>
                <div className="session-card-header">
                  <span className={committeeClass}>{session.committeeId}</span>
                  <p className="surTitre">{session.sessionNumber}</p>
                </div>
                <h3>{COMMITTEES[session.committeeId].label}</h3>
                <p className="session-date">{formatDate(session.date, session.time)}</p>
              </div>
              <div className="session-actions">
                <button
                  className="bouton-secondaire"
                  onClick={() => navigate({ page: 'session', sessionId: session.id })}
                >
                  Ouvrir la séance
                </button>
                {session.pvDocuments.map((doc) => (
                  <a key={doc.url} className="bouton-lien" href={doc.url} target="_blank" rel="noreferrer">
                    {doc.label}
                  </a>
                ))}
              </div>
              <div className="liste-sujets">
                {visibles.map((subject) => (
                  <SubjectDetail key={subject.id} subject={subject} categories={categories} />
                ))}
                {visibles.length === 0 && <p className="vide">Aucun sujet pour ce filtre.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchPage({
  sessions,
  subjects,
  categories,
  navigate,
  onSelectSujet,
}: {
  sessions: Session[];
  subjects: Subject[];
  categories: Category[];
  navigate: (route: Route) => void;
  onSelectSujet: (sujetId: string) => void;
}) {
  const [committee, setCommittee] = useState<CommitteeGroup | 'all'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [keywords, setKeywords] = useState('');
  const [resolution, setResolution] = useState('');

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const reset = () => {
    setCommittee('all');
    setSelectedCategories([]);
    setKeywords('');
    setResolution('');
  };

  const results = useMemo(() => {
    return subjects
      .map((subject) => {
        const session = sessions.find((s) => s.id === subject.sessionId);
        return { subject, session };
      })
      .filter((entry) => Boolean(entry.session))
      .filter((entry) => {
        if (!entry.session) return false;
        if (committee !== 'all' && entry.session.committeeGroup !== committee) return false;
        if (selectedCategories.length && !entry.subject.categoriesIds.some((c) => selectedCategories.includes(c))) {
          return false;
        }
        if (keywords.trim()) {
          const haystack = `${entry.subject.subjectTitle} ${entry.subject.longDescription} ${entry.subject.keywords.join(' ')}`.toLowerCase();
          if (!haystack.includes(keywords.toLowerCase())) return false;
        }
        if (resolution.trim()) {
          const hasResolution = entry.subject.resolutionNumbers.some((num) =>
            num.toLowerCase().includes(resolution.toLowerCase()),
          );
          if (!hasResolution) return false;
        }
        return true;
      })
      .sort((a, b) => (b.session ? new Date(`${b.session.date}`).getTime() : 0) - (a.session ? new Date(`${a.session.date}`).getTime() : 0));
  }, [committee, keywords, resolution, selectedCategories, sessions, subjects]);

  const filteredCategories = committee === 'all' ? categories : categories;
  const resultMarkers: MapMarker[] = useMemo(
    () =>
      results
        .filter(({ subject }) => Boolean(subject.location))
        .map(({ subject, session }) => ({
          lat: subject.location!.lat,
          lng: subject.location!.lng,
          color: MAP_PIN_COLORS[session?.committeeGroup ?? 'CCSRM'],
          title: subject.subjectTitle,
          label: subject.subjectNumber,
          subjectId: subject.id,
        })),
    [results],
  );

  return (
    <div className="search-page">
      <div className="card map-card">
        <div className="entete-formulaire">
          <div>
            <p className="surTitre">Carte globale</p>
            <h2>Tous les sujets</h2>
          </div>
          <span className="pastille">Recherche</span>
        </div>
        <MapView
          title="Carte avec tous les sujets filtrés (CCU et CCSRM/CCC)"
          accent="#f24405"
          markers={resultMarkers}
          onSelectSujet={onSelectSujet}
        />
      </div>

      <div className="card filters-card">
        <div className="filters-grid">
          <label>
            <span className="form-label">Type de comité</span>
            <select value={committee} onChange={(e) => setCommittee(e.target.value as CommitteeGroup | 'all')}>
              <option value="all">Tous</option>
              <option value="CCU">CCU</option>
              <option value="CCSRM">CCSRM/CCC</option>
            </select>
          </label>
          <label>
            <span className="form-label">Mots-clés</span>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Titre, commentaire, etc."
            />
          </label>
          <label>
            <span className="form-label"># Résolution / commentaire</span>
            <input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="2025-04" />
          </label>
        </div>
        <div className="categories">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`tag ${selectedCategories.includes(cat.id) ? 'actif' : ''}`}
              onClick={() => toggleCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="actions-formulaire align-end">
          <button className="bouton-secondaire" type="button" onClick={reset}>
            Réinitialiser / Afficher tout
          </button>
        </div>
      </div>

      <div className="card results-card">
        <div className="entete-liste">
          <p className="surTitre">Résultat de la recherche</p>
          <span className="pastille">{results.length} sujets</span>
        </div>
        <div className="result-list">
          {results.map(({ subject, session }) => (
            <button
              key={subject.id}
              className={`result-card ${session?.committeeGroup === 'CCU' ? 'ccu' : 'ccsrm'}`}
              onClick={() => session && navigate({ page: 'session', sessionId: session.id })}
            >
              <div className="result-meta">
                <span className="surTitre">{session?.sessionNumber}</span>
                <Badge committeeId={session?.committeeId ?? 'CCU'} />
              </div>
              <h3>{subject.subjectTitle}</h3>
              <p className="result-infos">{session ? formatDate(session.date, session.time) : ''}</p>
            </button>
          ))}
          {results.length === 0 && <p className="vide">Aucun sujet trouvé.</p>}
        </div>
      </div>
    </div>
  );
}

function SessionDetail({
  session,
  subjects,
  categories,
  onUpsertSubject,
  onDeleteSubject,
  onCreateCategory,
  onSelectSujet,
}: {
  session: Session;
  subjects: Subject[];
  categories: Category[];
  onUpsertSubject: (subject: Subject | (Omit<Subject, 'id'> & { id?: string })) => void;
  onDeleteSubject: (id: string) => void;
  onCreateCategory: (categorie: Category) => void;
  onSelectSujet: (sujetId: string) => void;
  focusedSubjectId?: string | null;
}) {
  const [editing, setEditing] = useState<Subject | null>(null);
  const [filterCat, setFilterCat] = useState<string>('');
  const [locatingSubject, setLocatingSubject] = useState<Subject | null>(null);
  const [draftLocation, setDraftLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState<Omit<Subject, 'id' | 'sessionId'>>({
    subjectNumber: '',
    subjectTitle: '',
    shortLabel: '',
    longDescription: '',
    categoriesIds: [],
    keywords: [],
    resolutionNumbers: [],
    extraitDocuments: [],
    attachments: [],
    location: undefined,
  });

  useEffect(() => {
    if (editing) {
      const { sessionId, id, ...rest } = editing;
      setForm(rest);
    }
  }, [editing]);

  useEffect(() => {
    if (locatingSubject?.location) {
      setDraftLocation({ lat: locatingSubject.location.lat, lng: locatingSubject.location.lng });
    } else {
      setDraftLocation(null);
    }
  }, [locatingSubject]);

  useEffect(() => {
    if (!focusedSubjectId) return;
    const el = document.getElementById(`subject-${focusedSubjectId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedSubjectId]);

  const save = () => {
    if (!form.subjectNumber || !form.subjectTitle || !form.longDescription) return;
    const payload = editing ? { ...editing, ...form } : { ...form };
    onUpsertSubject({ ...(payload as Subject), sessionId: session.id });
    setEditing(null);
    setForm({
      subjectNumber: '',
      subjectTitle: '',
      shortLabel: '',
      longDescription: '',
      categoriesIds: [],
      keywords: [],
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
      location: undefined,
    });
  };

  const visibles = filterCat ? subjects.filter((s) => s.categoriesIds.includes(filterCat)) : subjects;
  const sessionMarkers: MapMarker[] = useMemo(
    () =>
      visibles
        .filter((subject) => Boolean(subject.location))
        .map((subject) => ({
          lat: subject.location!.lat,
          lng: subject.location!.lng,
          color: MAP_PIN_COLORS[session.committeeGroup],
          title: subject.subjectTitle,
          label: subject.subjectNumber,
          subjectId: subject.id,
        })),
    [session.committeeGroup, visibles],
  );

  const draftMarker = draftLocation
    ? [
        {
          lat: draftLocation.lat,
          lng: draftLocation.lng,
          color: MAP_PIN_COLORS[session.committeeGroup],
          title: locatingSubject?.subjectTitle || 'Localisation',
          label: locatingSubject?.subjectNumber,
        } satisfies MapMarker,
      ]
    : [];

  const openLocationPicker = (subject: Subject) => {
    setLocatingSubject(subject);
    setDraftLocation(subject.location ? { lat: subject.location.lat, lng: subject.location.lng } : null);
  };

  const saveLocation = () => {
    if (!locatingSubject || !draftLocation) return;
    const updated: Subject = {
      ...locatingSubject,
      location: { ...draftLocation, pinColor: MAP_PIN_COLORS[session.committeeGroup] },
    };
    onUpsertSubject(updated);
    setLocatingSubject(null);
    setDraftLocation(null);
  };

  const closePicker = () => {
    setLocatingSubject(null);
    setDraftLocation(null);
  };

  return (
    <div className="session-detail">
      <div className="session-detail-grid">
        <div className="card session-info">
          <div className="entete-seance">
            <div>
              <p className="surTitre">{session.sessionNumber}</p>
              <h2>
                {COMMITTEES[session.committeeId].label} – {session.title || 'Séance'}
              </h2>
              <p className="date">
                {formatDate(session.date, session.time)} {session.time && <span>• {session.time}</span>}
              </p>
            </div>
            <Badge committeeId={session.committeeId} />
          </div>
          <MapView
            title="Carte en vue satellite avec seulement les sujets de cette séance"
            accent={COMMITTEE_GROUP_COLORS[session.committeeGroup]}
            markers={sessionMarkers}
            onSelectSujet={onSelectSujet}
          />
          <div className="meta">
            {session.pvDocuments.length ? (
              session.pvDocuments.map((doc) => (
                <a key={doc.label} className="bouton-secondaire" href={doc.url} target="_blank" rel="noreferrer">
                  Ouvrir le PV · {doc.label}
                </a>
              ))
            ) : (
              <p className="vide">Aucun PV attaché.</p>
            )}
          </div>
        </div>

        <div className="card filters-card">
          <div className="entete-formulaire">
            <div>
              <p className="surTitre">Filtres</p>
              <h3>Sujets de la séance</h3>
            </div>
            <span className="pastille">Filtrage</span>
          </div>
          <label>
            Filtrer par catégorie
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">Toutes</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="session-columns">
        <div className="liste-sujets">
          {visibles.map((subject) => (
            <div
              key={subject.id}
              className={`card ${focusedSubjectId === subject.id ? 'subject-focused' : ''}`}
              id={`subject-${subject.id}`}
            >
              <SubjectDetail subject={subject} categories={categories} />
              <div className="actions">
                <button className="bouton-principal" onClick={() => openLocationPicker(subject)}>
                  {subject.location ? 'Mettre à jour la localisation' : 'Ajouter une localisation'}
                </button>
                <button className="bouton-secondaire" onClick={() => setEditing(subject)}>
                  Modifier
                </button>
                <button className="bouton-lien" onClick={() => onDeleteSubject(subject.id)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          {visibles.length === 0 && <p className="vide">Aucun sujet pour cette séance.</p>}
        </div>

        <div className="card sujet-form-panel">
          <SubjectForm
            value={form}
            onChange={(field, val) => setForm((prev) => ({ ...prev, [field]: val }))}
            onSubmit={save}
            onCancel={() => setEditing(null)}
            categories={categories}
            onCreateCategory={onCreateCategory}
          />
        </div>
      </div>

      {locatingSubject && (
        <div className="modal-overlay">
          <div className="card modal-panel">
            <div className="entete-formulaire">
              <div>
                <p className="surTitre">Localisation</p>
                <h3>
                  Sujet {locatingSubject.subjectNumber} · {locatingSubject.subjectTitle}
                </h3>
                <p className="map-hint">
                  Cliquez sur la carte pour positionner la demande. Un repère
                  {session.committeeGroup === 'CCU' ? ' vert (CCU)' : ' bleu (CCSRM/CCC)'} sera ajouté.
                </p>
              </div>
              <button className="bouton-lien" onClick={closePicker}>
                Fermer
              </button>
            </div>
            <MapView
              title="Cliquez pour ajouter un point"
              accent={COMMITTEE_GROUP_COLORS[session.committeeGroup]}
              markers={[...sessionMarkers, ...draftMarker]}
              onPickLocation={(coords) => setDraftLocation(coords)}
            />
            <div className="actions-formulaire">
              <div className="coordonnees">
                <span>Lat : {draftLocation?.lat?.toFixed(6) ?? '—'}</span>
                <span>Lng : {draftLocation?.lng?.toFixed(6) ?? '—'}</span>
              </div>
              <div className="modal-actions">
                <button className="bouton-secondaire" onClick={closePicker}>
                  Annuler
                </button>
                <button className="bouton-principal" disabled={!draftLocation} onClick={saveLocation}>
                  Enregistrer la localisation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [route, setRoute] = useState<Route>(() => (typeof window !== 'undefined' ? parseHash() : { page: 'home' }));
  const [focusedSubjectId, setFocusedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  useEffect(() => {
    if (route.page !== 'session') {
      setFocusedSubjectId(null);
    }
  }, [route]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const navigate = (next: Route) => {
    if (typeof window === 'undefined') return;
    window.location.hash = buildHash(next);
    setRoute(next);
  };

  const upsertSession = (payload: Session | Omit<Session, 'committeeGroup'> & { id?: string }) => {
    const group = COMMITTEES[payload.committeeId].group;
    const id = 'id' in payload && payload.id ? payload.id : `${payload.committeeId}-${payload.sessionNumber}-${payload.date}`;
    const session: Session = { ...payload, id, committeeGroup: group } as Session;
    setState((prev) => {
      const exists = prev.sessions.some((s) => s.id === id);
      const sessions = exists
        ? prev.sessions.map((s) => (s.id === id ? session : s))
        : [...prev.sessions, session];
      return { ...prev, sessions };
    });
  };

  const deleteSession = (id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      subjects: prev.subjects.filter((s) => s.sessionId !== id),
    }));
  };

  const upsertSubject = (payload: Subject | (Omit<Subject, 'id'> & { id?: string })) => {
    const id = 'id' in payload && payload.id ? payload.id : `subject-${Date.now()}`;
    const subject: Subject = { ...payload, id } as Subject;
    setState((prev) => {
      const exists = prev.subjects.some((s) => s.id === id);
      const subjects = exists
        ? prev.subjects.map((s) => (s.id === id ? subject : s))
        : [...prev.subjects, subject];
      return { ...prev, subjects };
    });
  };

  const deleteSubject = (id: string) => {
    setState((prev) => ({ ...prev, subjects: prev.subjects.filter((s) => s.id !== id) }));
  };

  const createCategory = (categorie: Category) => {
    setState((prev) => {
      if (prev.categories.some((c) => c.id === categorie.id)) return prev;
      return { ...prev, categories: [...prev.categories, categorie] };
    });
  };

  const onSelectSujet = (sujetId: string) => {
    const subject = state.subjects.find((s) => s.id === sujetId);
    if (!subject) return;
    const session = state.sessions.find((s) => s.id === subject.sessionId);
    if (session) {
      navigate({ page: 'session', sessionId: session.id });
      setFocusedSubjectId(sujetId);
    }
  };

  const currentSession = route.page === 'session' ? state.sessions.find((s) => s.id === route.sessionId) : undefined;

  const theme =
    route.page === 'ccu'
      ? 'ccu'
      : route.page === 'ccsrm'
        ? 'ccsrm'
        : route.page === 'session' && currentSession
          ? currentSession.committeeGroup === 'CCU'
            ? 'ccu'
            : 'ccsrm'
          : 'home';

  const headerTitle = (() => {
    if (route.page === 'ccu' || (route.page === 'session' && currentSession?.committeeGroup === 'CCU')) {
      return {
        title: 'CCU – Comité consultatif d’urbanisme',
        subtitle: '',
      };
    }
    if (route.page === 'ccsrm' || (route.page === 'session' && currentSession?.committeeGroup === 'CCSRM')) {
      return {
        title: 'CCSRM – Comité consultatif de la sécurité routière et de mobilité',
        subtitle: '(Anciennement CCC – Comité consultatif de circulation)',
      };
    }
    if (route.page === 'search') {
      return { title: 'Recherche', subtitle: 'Filtrer les sujets CCU et CCSRM/CCC' };
    }
    return {
      title: 'Ville de Val-d’Or',
      subtitle: 'Suivi des comités CCU et CCSRM/CCC',
    };
  })();

  return (
    <div className={`app-frame theme-${theme}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">Comités</div>
        <nav className="sidebar-nav">
          <button className={route.page === 'home' ? 'active' : ''} onClick={() => navigate({ page: 'home' })}>
            <span>🏠</span>
            Accueil
          </button>
          <button className={route.page === 'ccu' ? 'active' : ''} onClick={() => navigate({ page: 'ccu' })}>
            <span>🏗️</span>
            CCU
          </button>
          <button className={route.page === 'ccsrm' ? 'active' : ''} onClick={() => navigate({ page: 'ccsrm' })}>
            <span>🚦</span>
            CCSRM/CCC
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className={route.page === 'search' ? 'active' : ''} onClick={() => navigate({ page: 'search' })}>
            <span>🔎</span>
            Recherche
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="global-header">
          <div className="user-chip">
            <div className="avatar" aria-hidden />
            <div>
              <p className="surTitre">Utilisateur</p>
              <strong>Nom, Prénom</strong>
            </div>
          </div>
          <div className="header-titles">
            <p className="surTitre">Navigation</p>
            <h1>{headerTitle.title}</h1>
            {headerTitle.subtitle && <p className="header-subtitle">{headerTitle.subtitle}</p>}
          </div>
        </header>

        <main className="page-content">
          {route.page === 'home' && (
            <HomePage
              sessions={state.sessions}
              subjects={state.subjects}
              onUpsert={upsertSession}
              onDelete={deleteSession}
              navigate={navigate}
            />
          )}
          {route.page === 'ccu' && (
            <CommitteePage
              group="CCU"
              sessions={state.sessions}
              subjects={state.subjects}
              categories={state.categories}
              navigate={navigate}
              onSelectSujet={onSelectSujet}
            />
          )}
          {route.page === 'ccsrm' && (
            <CommitteePage
              group="CCSRM"
              sessions={state.sessions}
              subjects={state.subjects}
              categories={state.categories}
              navigate={navigate}
              onSelectSujet={onSelectSujet}
            />
          )}
          {route.page === 'search' && (
            <SearchPage
              sessions={state.sessions}
              subjects={state.subjects}
              categories={state.categories}
              navigate={navigate}
              onSelectSujet={onSelectSujet}
            />
          )}
          {route.page === 'session' && currentSession && (
            <SessionDetail
              session={currentSession}
              subjects={state.subjects.filter((s) => s.sessionId === currentSession.id)}
              categories={state.categories}
              onUpsertSubject={upsertSubject}
              onDeleteSubject={deleteSubject}
              onCreateCategory={createCategory}
              onSelectSujet={onSelectSujet}
              focusedSubjectId={focusedSubjectId}
            />
          )}
          {route.page === 'session' && !currentSession && <p className="vide">Séance introuvable.</p>}
        </main>
      </div>
    </div>
  );
}
