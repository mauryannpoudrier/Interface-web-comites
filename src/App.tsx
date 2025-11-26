import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
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
  committeeGroup?: CommitteeGroup;
}

interface Subject {
  id: string;
  sessionId: string;
  subjectNumber: string;
  mainResolutionNumbers?: string[];
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
    { id: 'mobilite', label: 'Mobilité active', color: '#0ea5e9', committeeGroup: 'CCSRM' },
    { id: 'securite', label: 'Sécurité routière', color: '#f59e0b', committeeGroup: 'CCSRM' },
    { id: 'urbanisme', label: 'Urbanisme', color: '#22c55e', committeeGroup: 'CCU' },
    { id: 'amenagement', label: 'Aménagement', color: '#8b5cf6', committeeGroup: 'CCU' },
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
      mainResolutionNumbers: ['1'],
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
      mainResolutionNumbers: ['A-3'],
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
      mainResolutionNumbers: ['CCU-2025-14'],
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
    const sessions = parsed.sessions.map((session) => ({
      ...session,
      committeeGroup: session.committeeGroup ?? COMMITTEES[session.committeeId].group,
    }));
    const categories = parsed.categories.map((categorie) => ({
      ...categorie,
      committeeGroup: categorie.committeeGroup,
    }));
    const subjects = parsed.subjects.map((subject) => ({
      ...subject,
      mainResolutionNumbers: subject.mainResolutionNumbers?.length
        ? subject.mainResolutionNumbers
        : [subject.subjectNumber].filter(Boolean),
      subjectNumber: getPrimaryNumber(subject),
    }));
    return { ...parsed, sessions, categories, subjects };
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

function getPrimaryNumber(subject: Pick<Subject, 'subjectNumber' | 'mainResolutionNumbers'>) {
  return subject.mainResolutionNumbers?.find((num) => num.trim()) ?? subject.subjectNumber;
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
  addLabel = '+ Ajouter un document',
}: {
  label: string;
  items: DocumentLink[];
  onChange: (docs: DocumentLink[]) => void;
  addLabel?: string;
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
          {addLabel}
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
    </div>
  );
}

function EditableTagList({
  label,
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel: string;
}) {
  const [draft, setDraft] = useState('');

  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, idx) => (idx === index ? value : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft('');
  };

  return (
    <div className="form-block">
      <label className="resolution-label">{label}</label>
      <div className="tag-list">
        {items.map((item, idx) => (
          <div className="tag-row" key={`${item}-${idx}`}>
            <input value={item} onChange={(e) => updateItem(idx, e.target.value)} placeholder={placeholder} />
            <button type="button" className="bouton-lien" onClick={() => removeItem(idx)}>
              Supprimer
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="vide">Aucun élément pour l’instant.</p>}
      </div>
      <div className="tag-add-row">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <button type="button" className="bouton-secondaire" onClick={addItem}>
          {addLabel}
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
  value: Omit<Session, 'id' | 'committeeGroup' | 'title'>;
  onChange: (field: keyof Omit<Session, 'id' | 'committeeGroup' | 'title'>, val: string | DocumentLink[]) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="session-form">
      <div className="form-row">
        <div className="form-field">
          <p className="surTitre">Séances</p>
          <h2>Ajouter une séance</h2>
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
  committeeGroup,
  onCreateCategory,
  onDeleteCategory,
  categories,
}: {
  value: Omit<Subject, 'id' | 'sessionId'>;
  onChange: (field: keyof Omit<Subject, 'id' | 'sessionId'>, val: unknown) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  committeeGroup: CommitteeGroup;
  onCreateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  categories: Category[];
}) {
  const filteredCategories = categories.filter(
    (cat) => !cat.committeeGroup || cat.committeeGroup === committeeGroup,
  );
  const [newCategory, setNewCategory] = useState('');

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions).map((opt) => opt.value);
    onChange('categoriesIds', selectedOptions);
  };

  const syncPrimaryNumber = (numbers: string[]) => {
    const primary = numbers.find((num) => num.trim()) ?? '';
    onChange('mainResolutionNumbers', numbers);
    onChange('subjectNumber', primary);
  };

  const addCategory = () => {
    const label = newCategory.trim();
    if (!label) return;
    const baseId = label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-?$)/g, '')
      .slice(0, 36) || `categorie-${Date.now()}`;

    const color = committeeGroup === 'CCU' ? '#22c55e' : '#3b82f6';
    onCreateCategory({ id: baseId, label, committeeGroup, color });
    setNewCategory('');
  };

  const removeCategory = (id: string) => {
    onDeleteCategory(id);
    onChange(
      'categoriesIds',
      value.categoriesIds.filter((catId) => catId !== id),
    );
  };

  return (
    <div className="card sujet-form">
      <div className="entete-formulaire">
        <div>
          <p className="surTitre">Sujet</p>
          <h3>Ajouter / modifier un sujet</h3>
        </div>
      </div>
      <div className="bloc-vertical">
        <EditableTagList
          label="Numéro de la résolution/commentaire"
          items={value.mainResolutionNumbers ?? (value.subjectNumber ? [value.subjectNumber] : [])}
          onChange={syncPrimaryNumber}
          placeholder="CCU-269"
          addLabel="+ Ajouter un numéro"
        />

        <label className="form-block">
          Titre
          <input
            className="input-large"
            value={value.subjectTitle}
            onChange={(e) => onChange('subjectTitle', e.target.value)}
            placeholder="Titre complet du sujet"
          />
        </label>

        <label className="form-block">
          Catégories
          <select multiple value={value.categoriesIds} onChange={handleCategoryChange}>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <span className="form-hint">Maintenir Ctrl/Cmd pour sélectionner plusieurs catégories.</span>
        </label>

        <div className="form-block category-manager">
          <label className="resolution-label">Gérer les catégories ({committeeGroup})</label>
          <div className="tag-add-row">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nouvelle catégorie"
            />
            <button type="button" className="bouton-secondaire" onClick={addCategory}>
              + Ajouter une catégorie
            </button>
          </div>
          <div className="tag-pill-list">
            {filteredCategories.map((cat) => (
              <span key={cat.id} className="etiquette gestion-categorie">
                {cat.label}
                <button type="button" aria-label={`Supprimer ${cat.label}`} onClick={() => removeCategory(cat.id)}>
                  ✕
                </button>
              </span>
            ))}
            {filteredCategories.length === 0 && <p className="vide">Aucune catégorie pour ce comité.</p>}
          </div>
        </div>

        <EditableTagList
          label="Mots-clés"
          items={value.keywords}
          onChange={(items) => onChange('keywords', items)}
          placeholder="piétons, vitesse, corridor"
          addLabel="+ Ajouter un mot-clé"
        />

        <EditableTagList
          label="Résolution(s) en lien avec le sujet"
          items={value.resolutionNumbers}
          onChange={(items) => onChange('resolutionNumbers', items)}
          placeholder="2025-04"
          addLabel="+ Ajouter une résolution/commentaire"
        />

        <DocumentListEditor
          label="Extrait de PV"
          addLabel="+ Ajouter un PDF"
          items={value.extraitDocuments}
          onChange={(docs) => onChange('extraitDocuments', docs)}
        />
        <DocumentListEditor
          label="Pièces jointes"
          addLabel="+ Ajouter un PDF"
          items={value.attachments}
          onChange={(docs) => onChange('attachments', docs)}
        />
      </div>
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
  const committeeClass = `session-committee-badge ${session.committeeGroup === 'CCU' ? 'ccu' : 'ccsrm'}`;
  return (
    <article className="session-card">
      <div className="session-card-content">
        <span className={committeeClass}>{meta.label}</span>
        <p className="session-number">{session.sessionNumber}</p>
        <p className="session-date">
          {formatDate(session.date, session.time)} {session.time && <span>• {session.time}</span>}
        </p>
        <p className="session-subject-count">{subjects.length} sujet(s) lié(s)</p>
      </div>
      <div className="session-card-actions">
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
  const mainNumbers = (subject.mainResolutionNumbers ?? [subject.subjectNumber]).filter(Boolean);
  const titleNumber = mainNumbers.join(' · ');

  return (
    <div className="card sujet-detail">
      <div className="ligne-titre">
        <h4>
          {titleNumber || '—'} – {subject.subjectTitle}
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
        <span className="etiquette clair">
          Résolutions principales : {mainNumbers.join(', ') || '—'}
        </span>
        <span className="etiquette clair">Résolutions liées : {subject.resolutionNumbers.join(', ') || '—'}</span>
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
  const [form, setForm] = useState<Omit<Session, 'id' | 'committeeGroup' | 'title'>>({
    committeeId: 'CCU',
    sessionNumber: '',
    date: '',
    time: '',
    pvDocuments: [],
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      const { id, committeeGroup, title: _title, ...rest } = editing;
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
    setForm({ committeeId: 'CCU', sessionNumber: '', date: '', time: '', pvDocuments: [] });
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
  const groupCategories = categories.filter((cat) => !cat.committeeGroup || cat.committeeGroup === group);

  useEffect(() => {
    if (filterCat && !groupCategories.some((cat) => cat.id === filterCat)) {
      setFilterCat('');
    }
  }, [filterCat, groupCategories]);
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
                label: getPrimaryNumber(subject),
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
            {groupCategories.map((cat) => (
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
          const hasResolution =
            entry.subject.resolutionNumbers.some((num) =>
              num.toLowerCase().includes(resolution.toLowerCase()),
            ) ||
            (entry.subject.mainResolutionNumbers ?? [entry.subject.subjectNumber]).some((num) =>
              num.toLowerCase().includes(resolution.toLowerCase()),
            );
          if (!hasResolution) return false;
        }
        return true;
      })
      .sort((a, b) => (b.session ? new Date(`${b.session.date}`).getTime() : 0) - (a.session ? new Date(`${a.session.date}`).getTime() : 0));
  }, [committee, keywords, resolution, selectedCategories, sessions, subjects]);

  const filteredCategories =
    committee === 'all'
      ? categories
      : categories.filter((cat) => !cat.committeeGroup || cat.committeeGroup === committee);
  const resultMarkers: MapMarker[] = useMemo(
    () =>
      results
        .filter(({ subject }) => Boolean(subject.location))
        .map(({ subject, session }) => ({
          lat: subject.location!.lat,
          lng: subject.location!.lng,
          color: MAP_PIN_COLORS[session?.committeeGroup ?? 'CCSRM'],
          title: subject.subjectTitle,
          label: getPrimaryNumber(subject),
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
  onDeleteCategory,
  onSelectSujet,
  focusedSubjectId,
}: {
  session: Session;
  subjects: Subject[];
  categories: Category[];
  onUpsertSubject: (subject: Subject | (Omit<Subject, 'id'> & { id?: string })) => void;
  onDeleteSubject: (id: string) => void;
  onCreateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onSelectSujet: (sujetId: string) => void;
  focusedSubjectId?: string | null;
}) {
  const [editing, setEditing] = useState<Subject | null>(null);
  const [locatingSubject, setLocatingSubject] = useState<Subject | null>(null);
  const [draftLocation, setDraftLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState<Omit<Subject, 'id' | 'sessionId'>>({
    subjectNumber: '',
    mainResolutionNumbers: [],
    subjectTitle: '',
    shortLabel: '',
    longDescription: '',
    categoriesIds: [],
    keywords: [],
    resolutionNumbers: [''],
    extraitDocuments: [],
    attachments: [],
    location: undefined,
  });

  useEffect(() => {
    if (editing) {
      const { sessionId, id, ...rest } = editing;
      setForm({
        ...rest,
        mainResolutionNumbers: rest.mainResolutionNumbers?.length
          ? rest.mainResolutionNumbers
          : [rest.subjectNumber],
        subjectNumber: getPrimaryNumber(rest),
      });
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
    const primaryNumber =
      form.mainResolutionNumbers?.find((num) => num.trim()) ?? form.subjectNumber.trim();
    if (!primaryNumber || !form.subjectTitle) return;
    const payload = editing ? { ...editing, ...form } : { ...form };
    const normalized = {
      ...(payload as Subject),
      sessionId: session.id,
      subjectNumber: primaryNumber,
      mainResolutionNumbers: form.mainResolutionNumbers?.length
        ? form.mainResolutionNumbers
        : [primaryNumber],
    } satisfies Subject;
    onUpsertSubject(normalized);
    setEditing(null);
    setForm({
      subjectNumber: '',
      mainResolutionNumbers: [],
      subjectTitle: '',
      shortLabel: '',
      longDescription: '',
      categoriesIds: [],
      keywords: [],
      resolutionNumbers: [''],
      extraitDocuments: [],
      attachments: [],
      location: undefined,
    });
  };

  const visibles = subjects;
  const sessionMarkers: MapMarker[] = useMemo(
    () =>
      visibles
        .filter((subject) => Boolean(subject.location))
        .map((subject) => ({
          lat: subject.location!.lat,
          lng: subject.location!.lng,
          color: MAP_PIN_COLORS[session.committeeGroup],
          title: subject.subjectTitle,
          label: getPrimaryNumber(subject),
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
          label: locatingSubject ? getPrimaryNumber(locatingSubject) : undefined,
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
      <div className="session-top">
        <div className="card session-info">
          <div className="entete-seance">
            <div>
              <p className="session-number-hero">{session.sessionNumber}</p>
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
        </div>

        <div className="card sujet-form-panel">
          <SubjectForm
            value={form}
            onChange={(field, val) => setForm((prev) => ({ ...prev, [field]: val }))}
            onSubmit={save}
            onCancel={() => setEditing(null)}
            committeeGroup={session.committeeGroup}
            onCreateCategory={onCreateCategory}
            onDeleteCategory={onDeleteCategory}
            categories={categories}
          />
        </div>
      </div>

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

  const addCategory = (categorie: Category) => {
    setState((prev) => {
      const hasSameLabel = prev.categories.some(
        (c) =>
          c.label.toLowerCase() === categorie.label.toLowerCase() &&
          (c.committeeGroup ?? 'all') === (categorie.committeeGroup ?? 'all'),
      );
      if (hasSameLabel) return prev;

      let id = categorie.id;
      let suffix = 1;
      while (prev.categories.some((c) => c.id === id)) {
        id = `${categorie.id}-${suffix++}`;
      }

      const normalized = { ...categorie, id } as Category;
      return { ...prev, categories: [...prev.categories, normalized] };
    });
  };

  const deleteCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      subjects: prev.subjects.map((subject) => ({
        ...subject,
        categoriesIds: subject.categoriesIds.filter((catId) => catId !== id),
      })),
    }));
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
        {route.page === 'home' && (
          <div className="user-chip sidebar-user">
            <div className="avatar" aria-hidden />
            <div>
              <p className="surTitre">Utilisateur</p>
              <strong>Nom, Prénom</strong>
            </div>
          </div>
        )}
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
          <div className="header-titles">
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
              onCreateCategory={addCategory}
              onDeleteCategory={deleteCategory}
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
