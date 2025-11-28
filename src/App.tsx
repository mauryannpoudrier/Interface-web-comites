import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Calendar from './components/Calendar';
import MapView, { type MapMarker } from './components/MapView';
import logoVille from './logo-vvd-couleur-nom-dessous.png';

export type CommitteeId = 'CCC' | 'CCSRM' | 'CCU';
export type CommitteeGroup = 'CCSRM' | 'CCU';

type TaskStatus = 'waiting' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  note: string;
}

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
  agendaDocuments: DocumentLink[];
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
  locations?: Location[];
}

interface Location {
  lat: number;
  lng: number;
  pinColor?: string;
}

interface AppState {
  sessions: Session[];
  subjects: Subject[];
  categories: Category[];
  tasks: Task[];
}

interface LinkedReference {
  label: string;
  targetId?: string;
}

type Route =
  | { page: 'home' }
  | { page: 'ccu' }
  | { page: 'ccsrm' }
  | { page: 'tasks' }
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
    { id: 'information', label: 'Information', color: '#06b6d4', committeeGroup: 'CCSRM' },
    { id: 'vhr', label: 'Véhicules hors route (VHR)', color: '#dc2626', committeeGroup: 'CCSRM' },
    { id: 'securite-routiere', label: 'Sécurité routière', color: '#ea580c', committeeGroup: 'CCSRM' },
    { id: 'amenagement-pietonnier', label: 'Aménagement piétonnier', color: '#84cc16', committeeGroup: 'CCSRM' },
    { id: 'signalisation', label: 'Signalisation', color: '#f97316', committeeGroup: 'CCSRM' },
    { id: 'intersection', label: 'Intersections', color: '#a855f7', committeeGroup: 'CCSRM' },
    { id: '3e-avenue', label: '3e Avenue', color: '#0ea5e9', committeeGroup: 'CCSRM' },
    { id: 'deneigement', label: 'Déneigement', color: '#38bdf8', committeeGroup: 'CCSRM' },
  ],
  sessions: [
    {
      id: 'CCC-1-2013-03-13',
      committeeId: 'CCC',
      committeeGroup: 'CCSRM',
      sessionNumber: 'CCC-1',
      date: '2013-03-13',
      time: '19:00',
      title: 'Séance CCC-1 du 13 mars 2013',
      pvDocuments: [],
      agendaDocuments: [],
    },
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
      agendaDocuments: [
        { label: 'Ordre du jour', url: 'https://exemple.org/odj/ccsrm-12.pdf' },
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
      agendaDocuments: [],
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
      agendaDocuments: [
        { label: 'Ordre du jour', url: 'https://exemple.org/odj/ccu-08.pdf' },
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
      locations: [{ lat: 48.095, lng: -77.782, pinColor: '#0ea5e9' }],
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
    {
      id: 'ccc1-com-1-a',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-A',
      mainResolutionNumbers: ['Com. 1-A'],
      subjectTitle: 'Constitution du comité consultatif de circulation.',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['information'],
      keywords: [],
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
    },
    {
      id: 'ccc1-com-1-b',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-B',
      mainResolutionNumbers: ['Com. 1-B'],
      subjectTitle: 'Véhicules hors route (VHR).',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['vhr', 'securite-routiere'],
      keywords: [],
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
    },
    {
      id: 'ccc1-com-1-c',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-C',
      mainResolutionNumbers: ['Com. 1-C'],
      subjectTitle: 'Traverses piétonnières.',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['amenagement-pietonnier'],
      keywords: [],
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
    },
    {
      id: 'ccc1-com-1-d',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-D',
      mainResolutionNumbers: ['Com. 1-D'],
      subjectTitle: 'Feux de circulation 3e Avenue / 6e Rue.',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['signalisation', 'intersection'],
      keywords: [],
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
    },
    {
      id: 'ccc1-com-1-e',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-E',
      mainResolutionNumbers: ['Com. 1-E'],
      subjectTitle: '3e Avenue / Germain.',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['signalisation', 'intersection', '3e-avenue'],
      keywords: [],
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
    },
    {
      id: 'ccc1-com-1-f',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-F',
      mainResolutionNumbers: ['Com. 1-F'],
      subjectTitle: 'Intersection Forest / Dorion.',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['signalisation', 'intersection', 'securite-routiere'],
      keywords: [],
      resolutionNumbers: ['Com. 2-H', 'Com. 5-G'],
      extraitDocuments: [],
      attachments: [],
    },
    {
      id: 'ccc1-com-1-g',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-G',
      mainResolutionNumbers: ['Com. 1-G'],
      subjectTitle: 'Intersection 7e Rue / 10e Avenue.',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['intersection', 'securite-routiere', 'signalisation'],
      keywords: [],
      resolutionNumbers: ['Rés. 3-11', 'Rés. 5-31'],
      extraitDocuments: [],
      attachments: [],
    },
    {
      id: 'ccc1-com-1-h',
      sessionId: 'CCC-1-2013-03-13',
      subjectNumber: 'Com. 1-H',
      mainResolutionNumbers: ['Com. 1-H'],
      subjectTitle: 'Déneigement des trottoirs.',
      shortLabel: '',
      longDescription: '',
      categoriesIds: ['deneigement'],
      keywords: [],
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
    },
  ],
  tasks: [
    {
      id: 'task-accueil',
      title: 'Préparer ordre du jour CCU',
      assignee: 'Service d’urbanisme',
      status: 'in_progress',
      note: 'Valider les points prioritaires avec le comité.',
    },
    {
      id: 'task-invitations',
      title: 'Envoyer invitation aux membres',
      assignee: 'Coordination',
      status: 'waiting',
      note: 'Ajouter les documents en pièce jointe.',
    },
    {
      id: 'task-suivi',
      title: 'Mettre à jour le suivi des résolutions',
      assignee: 'Équipe projets',
      status: 'done',
      note: 'Partager le tableau avant la prochaine séance.',
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
      agendaDocuments: session.agendaDocuments ?? [],
    }));
    const categories = parsed.categories.map((categorie) => ({
      ...categorie,
      committeeGroup: categorie.committeeGroup,
    }));
    const subjects = parsed.subjects.map((subject) => {
      const locations =
        (subject as Subject & { location?: Location }).locations?.length
          ? (subject as Subject).locations
          : (subject as Subject & { location?: Location }).location
            ? [(subject as Subject & { location?: Location }).location as Location]
            : [];

      return {
        ...subject,
        locations,
        mainResolutionNumbers: subject.mainResolutionNumbers?.length
          ? subject.mainResolutionNumbers
          : [subject.subjectNumber].filter(Boolean),
        subjectNumber: getPrimaryNumber(subject),
      } as Subject;
    });
    const tasks: Task[] = parsed.tasks?.length
      ? parsed.tasks.map((task) => ({
          ...task,
          status:
            task.status === 'done' || task.status === 'in_progress' || task.status === 'waiting'
              ? task.status
              : 'waiting',
        }))
      : defaultState.tasks;
    return { ...parsed, sessions, categories, subjects, tasks };
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
  if (parts[0] === 'tasks') return { page: 'tasks' };
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
    case 'tasks':
      return '#/tasks';
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

function normalizeIdentifier(raw: string) {
  const base = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/^(résolution|resolution|res\.?|rés\.?|commentaire|comment\.?|com\.?)/i, '')
    .replace(/^[\s:–—-]+/, '')
    .trim()
    .toLowerCase();
  return base || raw.trim().toLowerCase();
}

function getNormalizedIdentifiers(subject: Subject) {
  const identifiers = subject.mainResolutionNumbers?.length
    ? subject.mainResolutionNumbers
    : [subject.subjectNumber];
  return identifiers.map((id) => normalizeIdentifier(id));
}

function findSubjectByReference(reference: string, subjects: Subject[], currentId?: string) {
  const normalized = normalizeIdentifier(reference);
  return subjects.find((candidate) => {
    if (candidate.id === currentId) return false;
    return getNormalizedIdentifiers(candidate).some((id) => id === normalized);
  });
}

function addReferenceIfMissing(subject: Subject, reference: string) {
  const trimmed = reference.trim();
  if (!trimmed) return subject;
  const normalized = normalizeIdentifier(trimmed);
  if (!normalized) return subject;
  const exists = subject.resolutionNumbers.some(
    (ref) => normalizeIdentifier(ref) === normalized,
  );
  if (exists) return subject;
  return { ...subject, resolutionNumbers: [...subject.resolutionNumbers, trimmed] };
}

function buildLinkedReferences(subject: Subject, subjects: Subject[]): LinkedReference[] {
  const identifiers = getNormalizedIdentifiers(subject);
  const references: LinkedReference[] = [];
  const seen = new Set<string>();

  const addReference = (label: string, targetId: string | undefined, normalizedKey: string) => {
    const key = `${normalizedKey}-${targetId ?? 'none'}`;
    if (seen.has(key)) return;
    seen.add(key);
    references.push({ label: label.trim(), targetId });
  };

  subject.resolutionNumbers
    .filter((ref) => ref.trim())
    .forEach((reference) => {
      const normalized = normalizeIdentifier(reference);
      const target = findSubjectByReference(reference, subjects, subject.id);
      addReference(reference, target?.id, normalized);
    });

  subjects.forEach((candidate) => {
    if (candidate.id === subject.id) return;
    const hasBacklink = (candidate.resolutionNumbers ?? []).some((ref) =>
      identifiers.includes(normalizeIdentifier(ref)),
    );
    if (!hasBacklink) return;
    const primaryNumber = getPrimaryNumber(candidate);
    addReference(primaryNumber, candidate.id, normalizeIdentifier(primaryNumber));
  });

  return references;
}

function formatSubjectBadge(primaryNumber: string) {
  const normalized = primaryNumber.trim();
  const commentRegex = /^(commentaire|com\.?)\s*/i;
  const resolutionRegex = /^(résolution|resolution|rés\.|res\.)\s*/i;

  if (commentRegex.test(normalized)) {
    return { typeLabel: 'Commentaire', numberLabel: normalized.replace(commentRegex, '').trim() };
  }

  if (resolutionRegex.test(normalized)) {
    return { typeLabel: 'Résolution', numberLabel: normalized.replace(resolutionRegex, '').trim() };
  }

  return { typeLabel: 'Sujet', numberLabel: normalized };
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
  heading = 'Ajouter une séance',
  submitLabel = 'Enregistrer la séance',
}: {
  value: Omit<Session, 'id' | 'committeeGroup' | 'title'>;
  onChange: (field: keyof Omit<Session, 'id' | 'committeeGroup' | 'title'>, val: string | DocumentLink[]) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  heading?: string;
  submitLabel?: string;
}) {
  return (
    <div className="session-form">
      <div className="form-row">
        <div className="form-field">
          <p className="surTitre">Séances</p>
          <h2>{heading}</h2>
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
      <DocumentListEditor
        label="Ordre du jour"
        items={value.agendaDocuments}
        onChange={(docs) => onChange('agendaDocuments', docs)}
        addLabel="+ Ajouter un ODJ"
      />
      <div className="actions-formulaire">
        <button className="bouton-principal" type="button" onClick={onSubmit}>
          {submitLabel}
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
  const sortedCategories = useMemo(
    () =>
      [...filteredCategories].sort((a, b) =>
        a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }),
      ),
    [filteredCategories],
  );
  const [newCategory, setNewCategory] = useState('');
  const [categoryEditMode, setCategoryEditMode] = useState(false);

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

  const toggleCategoryEdition = () => {
    setCategoryEditMode((prev) => !prev);
  };

  const toggleCategorySelection = (id: string) => {
    onChange(
      'categoriesIds',
      value.categoriesIds.includes(id)
        ? value.categoriesIds.filter((catId) => catId !== id)
        : [...value.categoriesIds, id],
    );
  };

  const handleCategoryKeyDown = (event: KeyboardEvent<HTMLSpanElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCategorySelection(id);
    }
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

        <div className="form-block category-manager">
          <div className="category-manager-header">
            <label className="resolution-label">Gérer les catégories ({committeeGroup})</label>
            <button type="button" className="bouton-secondaire" onClick={toggleCategoryEdition}>
              {categoryEditMode ? 'Terminer la modification' : 'Modifier les catégories'}
            </button>
          </div>
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
          <p className="form-hint">
            Cliquer sur une pastille pour sélectionner ou désélectionner une catégorie.
          </p>
          <div className="tag-pill-list">
            {sortedCategories.map((cat) => (
              <span
                key={cat.id}
                role="button"
                tabIndex={0}
                className={`etiquette gestion-categorie${
                  value.categoriesIds.includes(cat.id) ? ' gestion-categorie-selected' : ''
                }`}
                onClick={() => toggleCategorySelection(cat.id)}
                onKeyDown={(event) => handleCategoryKeyDown(event, cat.id)}
              >
                {cat.label}
                {categoryEditMode && (
                  <button
                    type="button"
                    aria-label={`Supprimer ${cat.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeCategory(cat.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {sortedCategories.length === 0 && <p className="vide">Aucune catégorie pour ce comité.</p>}
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
        <button
          className="bouton-principal"
          type="button"
          onClick={() => {
            setCategoryEditMode(false);
            onSubmit();
          }}
        >
          Enregistrer le sujet
        </button>
        {onCancel && (
          <button
            className="bouton-secondaire"
            type="button"
            onClick={() => {
              setCategoryEditMode(false);
              onCancel();
            }}
          >
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

function SubjectDetail({
  subject,
  categories,
  allSubjects,
  onNavigateToSubject,
}: {
  subject: Subject;
  categories: Category[];
  allSubjects: Subject[];
  onNavigateToSubject?: (subjectId: string) => void;
}) {
  const categoryLabels = subject.categoriesIds
    .map((id) => categories.find((c) => c.id === id)?.label)
    .filter((label): label is string => Boolean(label))
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  const mainNumbers = (subject.mainResolutionNumbers ?? [subject.subjectNumber]).filter(Boolean);
  const primaryNumber = mainNumbers[0] ?? '—';
  const secondaryNumbers = mainNumbers.slice(1).filter((num) => num.trim());
  const linkedResolutions = useMemo(
    () => buildLinkedReferences(subject, allSubjects),
    [allSubjects, subject],
  );
  const keywords = subject.keywords.filter((kw) => kw.trim());
  const [previewTarget, setPreviewTarget] = useState<
    | {
        subject: Subject;
        label: string;
        triggerRect: DOMRect;
        triggerElement: HTMLElement;
      }
    | null
  >(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const openLinkedPreview = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, targetId: string, label: string) => {
      const target = allSubjects.find((item) => item.id === targetId);
      if (!target) {
        onNavigateToSubject?.(targetId);
        return;
      }

      const triggerRect = event.currentTarget.getBoundingClientRect();
      const hasDimensions = Number.isFinite(triggerRect.width) && Number.isFinite(triggerRect.height);

      if (!hasDimensions) {
        onNavigateToSubject?.(targetId);
        return;
      }

      setPreviewTarget({
        subject: target,
        label,
        triggerRect,
        triggerElement: event.currentTarget,
      });
    },
    [allSubjects, onNavigateToSubject],
  );

  useEffect(() => {
    if (!previewTarget) return undefined;

    const fallbackTimer = window.setTimeout(() => {
      if (!popoverRef.current) {
        onNavigateToSubject?.(previewTarget.subject.id);
      }
    }, 100);

    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(targetNode) &&
        !previewTarget.triggerElement.contains(targetNode)
      ) {
        setPreviewTarget(null);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewTarget(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keyup', handleEscape);

    return () => {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keyup', handleEscape);
    };
  }, [onNavigateToSubject, previewTarget]);

  const popoverStyle = useMemo(() => {
    if (!previewTarget) return undefined;

    const centerX = previewTarget.triggerRect.left + previewTarget.triggerRect.width / 2;
    const constrainedLeft = Math.min(
      window.innerWidth - 16,
      Math.max(16, centerX + window.scrollX),
    );

    return {
      top: previewTarget.triggerRect.top + window.scrollY,
      left: constrainedLeft,
    } satisfies CSSProperties;
  }, [previewTarget]);

  const closePreview = useCallback(() => setPreviewTarget(null), []);

  const consultPreview = useCallback(() => {
    if (!previewTarget) return;
    setPreviewTarget(null);
    onNavigateToSubject?.(previewTarget.subject.id);
  }, [onNavigateToSubject, previewTarget]);

  return (
    <>
      <div className="card sujet-detail">
        <div className="subject-header">
          <p className="subject-number">{primaryNumber}</p>
          {secondaryNumbers.length > 0 && (
            <p className="subject-number secondary">{secondaryNumbers.join(', ')}</p>
          )}
          <p className="subject-title">{subject.subjectTitle}</p>
        </div>

        <div className="subject-body">
          <p className="subject-section">Catégories</p>
          <div className="subject-badges">
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

          <p className="subject-section">Extrait du procès-verbal</p>
          {subject.extraitDocuments.length ? (
            <ul className="subject-links">
              {subject.extraitDocuments.map((doc) => (
                <li key={doc.label}>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="subject-empty">Aucun extrait disponible.</p>
          )}

          <p className="subject-section">Pièces jointes</p>
          {subject.attachments.length ? (
            <ul className="subject-links">
              {subject.attachments.map((doc) => (
                <li key={doc.label}>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="subject-empty">Aucune pièce jointe.</p>
          )}

          <p className="subject-meta-line">
            <span className="subject-section-inline">Mots-clés :</span>
            <span className="subject-chip-row">
              {keywords.length ? (
                keywords.map((keyword) => (
                  <span key={keyword} className="etiquette clair">
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="subject-empty-inline">Aucun mot-clé</span>
              )}
            </span>
          </p>

          <p className="subject-section">Résolution(s)/commentaire(s) en lien avec le sujet</p>
          {linkedResolutions.length ? (
            <div className="subject-chip-row">
              {linkedResolutions.map((resolution) => {
                if (resolution.targetId) {
                  return (
                  <button
                    type="button"
                    key={`${resolution.label}-${resolution.targetId}`}
                    className="etiquette clair chip-link"
                    onClick={(event) => openLinkedPreview(event, resolution.targetId, resolution.label)}
                  >
                    {resolution.label}
                  </button>
                  );
                }
                return (
                  <span key={resolution.label} className="etiquette clair">
                    {resolution.label}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="subject-empty">Aucun lien enregistré.</p>
          )}
        </div>
      </div>

      {previewTarget && (
        <div
          className="linked-subject-popover"
          role="dialog"
          aria-modal="false"
          style={popoverStyle}
          ref={popoverRef}
        >
          <div className="map-infowindow linked-popover-card">
            <button
              className="linked-popover-close"
              type="button"
              onClick={closePreview}
              aria-label="Fermer la fenêtre"
            >
              ×
            </button>
            <p className="map-pin-label">Sujet {previewTarget.label}</p>
            <h4 className="linked-popover-title">{previewTarget.subject.subjectTitle}</h4>
            <button className="map-infowindow-btn" type="button" onClick={consultPreview}>
              Voir la demande
            </button>
          </div>
        </div>
      )}
    </>
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
  const emptySessionForm: Omit<Session, 'id' | 'committeeGroup' | 'title'> = {
    committeeId: 'CCU',
    sessionNumber: '',
    date: '',
    time: '',
    pvDocuments: [],
    agendaDocuments: [],
  };
  const createEmptySessionForm = () => ({ ...emptySessionForm, pvDocuments: [], agendaDocuments: [] });
  const [form, setForm] = useState<Omit<Session, 'id' | 'committeeGroup' | 'title'>>(() =>
    createEmptySessionForm(),
  );
  const [editForm, setEditForm] = useState<Omit<Session, 'id' | 'committeeGroup' | 'title'>>(() =>
    createEmptySessionForm(),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      const { id, committeeGroup, title: _title, ...rest } = editing;
      setEditForm({ ...rest, agendaDocuments: rest.agendaDocuments ?? [] });
    }
  }, [editing]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) =>
        new Date(`${a.date}T${a.time ?? '00:00'}`).getTime() -
        new Date(`${b.date}T${b.time ?? '00:00'}`).getTime(),
      ),
    [sessions],
  );

  const futureSessions = useMemo(
    () =>
      sortedSessions.filter((session) => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate >= today;
      }),
    [sortedSessions, today],
  );

  const visibleSessions = useMemo(
    () => (selectedDate ? sortedSessions.filter((session) => session.date === selectedDate) : futureSessions),
    [selectedDate, sortedSessions, futureSessions],
  );

  const submit = () => {
    if (!form.sessionNumber || !form.date) return;
    const payload = { ...form } as Session;
    onUpsert(payload);
    setForm(createEmptySessionForm());
  };

  const submitEdit = () => {
    if (!editing || !editForm.sessionNumber || !editForm.date) return;
    const payload = { ...editing, ...editForm } as Session;
    onUpsert(payload);
    setEditing(null);
    setEditForm(createEmptySessionForm());
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
            onCancel={() => setForm(createEmptySessionForm())}
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
      {editing && (
        <div className="session-popup-wrapper home-edit-popup">
          <div className="card session-popup">
            <SessionForm
              value={editForm}
              onChange={(field, val) => setEditForm((prev) => ({ ...prev, [field]: val }))}
              onSubmit={submitEdit}
              onCancel={() => {
                setEditing(null);
                setEditForm(createEmptySessionForm());
              }}
              heading={`Modifier ${editing.sessionNumber}`}
              submitLabel="Enregistrer les modifications"
            />
          </div>
        </div>
      )}
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
  onUpsert,
}: {
  group: CommitteeGroup;
  sessions: Session[];
  subjects: Subject[];
  categories: Category[];
  navigate: (route: Route) => void;
  onSelectSujet: (sujetId: string) => void;
  onUpsert: (session: Session | Omit<Session, 'committeeGroup'> & { id?: string }) => void;
}) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showSessionPopup, setShowSessionPopup] = useState(false);
  const [sessionForm, setSessionForm] = useState<Omit<Session, 'id' | 'committeeGroup' | 'title'>>({
    committeeId: group === 'CCU' ? 'CCU' : 'CCSRM',
    sessionNumber: '',
    date: '',
    time: '',
    pvDocuments: [],
    agendaDocuments: [],
  });
  const filteredSessions = useMemo(() => {
    const sessionsForGroup = sessions.filter((s) => s.committeeGroup === group);
    return [...sessionsForGroup].sort((a, b) => {
      const aValue = new Date(a.time ? `${a.date}T${a.time}` : a.date).getTime();
      const bValue = new Date(b.time ? `${b.date}T${b.time}` : b.date).getTime();
      return bValue - aValue;
    });
  }, [group, sessions]);
  const groupCategories = categories.filter((cat) => !cat.committeeGroup || cat.committeeGroup === group);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((cat) => cat !== id) : [...prev, id]));
  };

  const resetSessionForm = useCallback(() => {
    setSessionForm({
      committeeId: group === 'CCU' ? 'CCU' : 'CCSRM',
      sessionNumber: '',
      date: '',
      time: '',
      pvDocuments: [],
      agendaDocuments: [],
    });
  }, [group]);

  const closePopup = useCallback(() => {
    setShowSessionPopup(false);
    resetSessionForm();
  }, [resetSessionForm]);

  const submitSession = useCallback(() => {
    if (!sessionForm.sessionNumber || !sessionForm.date) return;
    onUpsert(sessionForm as Session);
    closePopup();
  }, [closePopup, onUpsert, sessionForm]);

  useEffect(() => {
    setSelectedCategories((prev) => prev.filter((id) => groupCategories.some((cat) => cat.id === id)));
  }, [groupCategories]);

  useEffect(() => {
    if (!showSessionPopup) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePopup, showSessionPopup]);

  useEffect(() => {
    resetSessionForm();
    setShowSessionPopup(false);
  }, [group, resetSessionForm]);

  const renderDocumentBlock = (
    label: string,
    documents: DocumentLink[],
    emptyText: string,
  ) => (
    <div className="session-doc-block">
      <p className="session-doc-label">{label}</p>
      {documents.length ? (
        <div className="session-doc-links">
          {documents.map((doc) => (
            <a key={doc.url} className="bouton-lien" href={doc.url} target="_blank" rel="noreferrer">
              {doc.label}
            </a>
          ))}
        </div>
      ) : (
        <p className="session-doc-empty">{emptyText}</p>
      )}
    </div>
  );
  const mapMarkers: MapMarker[] = useMemo(() => {
    const sessionIds = filteredSessions.map((s) => s.id);
    return subjects
      .filter((subject) => sessionIds.includes(subject.sessionId))
      .filter((subject) =>
        selectedCategories.length
          ? subject.categoriesIds.some((cat) => selectedCategories.includes(cat))
          : true,
      )
      .flatMap((subject) =>
        subject.locations?.length
          ? subject.locations.map((location) => ({
              lat: location.lat,
              lng: location.lng,
              color: location.pinColor ?? MAP_PIN_COLORS[group],
              title: subject.subjectTitle,
              label: getPrimaryNumber(subject),
              subjectId: subject.id,
            }))
          : [],
      );
  }, [filteredSessions, group, selectedCategories, subjects]);

  return (
    <div className="committee-page">
      <div className="committee-grid">
        <div className="card map-card">
          <div className="entete-formulaire">
            <div>
              <p className="surTitre">Carte globale</p>
              <h2>Sujets {group === 'CCU' ? 'CCU' : 'CCSRM/CCC'}</h2>
            </div>
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
          </div>
          <div className="actions-formulaire">
            <button className="bouton-principal" type="button" onClick={() => setShowSessionPopup(true)}>
              Ajouter une séance
            </button>
          </div>
          <p className="filter-hint">Sélectionnez une ou plusieurs catégories.</p>
          <div className="tag-grid">
            {groupCategories.map((cat) => (
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
            <button className="bouton-lien" type="button" onClick={() => setSelectedCategories([])}>
              Tout afficher
            </button>
          </div>
        </div>
      </div>
      {showSessionPopup && (
        <div className="session-popup-wrapper">
          <div className="card session-popup">
            <SessionForm
              value={sessionForm}
              onChange={(field, val) => setSessionForm((prev) => ({ ...prev, [field]: val }))}
              onSubmit={submitSession}
              onCancel={closePopup}
            />
          </div>
        </div>
      )}
      <div className="session-list">
        {filteredSessions.map((session) => {
          const sessionSubjects = subjects.filter((s) => s.sessionId === session.id);
          const visibles = selectedCategories.length
            ? sessionSubjects.filter((s) => s.categoriesIds.some((cat) => selectedCategories.includes(cat)))
            : sessionSubjects;
          if (group === 'CCU') {
            return (
              <div key={session.id} className="session-card session-summary-card">
                <p className="session-summary-number">{session.sessionNumber}</p>
                <p className="session-summary-date">{formatDate(session.date, session.time)}</p>
                <div className="session-actions">
                  <button
                    className="bouton-secondaire"
                    onClick={() => navigate({ page: 'session', sessionId: session.id })}
                  >
                    Ouvrir la séance
                  </button>
                </div>
                {renderDocumentBlock('Procès-verbal', session.pvDocuments, 'Aucun PV disponible')}
                {renderDocumentBlock(
                  'Ordre du jour',
                  session.agendaDocuments,
                  'Aucun ordre du jour disponible',
                )}
              </div>
            );
          }

          return (
            <div key={session.id} className="session-card session-summary-card">
              <p className="session-summary-number">{session.sessionNumber}</p>
              <p className="session-summary-date">{formatDate(session.date, session.time)}</p>
              <div className="session-actions">
                <button
                  className="bouton-secondaire"
                  onClick={() => navigate({ page: 'session', sessionId: session.id })}
                >
                  Ouvrir la séance
                </button>
              </div>
              {renderDocumentBlock('Procès-verbal', session.pvDocuments, 'Aucun procès-verbal disponible')}
              {renderDocumentBlock(
                'Ordre du jour',
                session.agendaDocuments,
                'Aucun ordre du jour disponible',
              )}
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
      results.flatMap(({ subject, session }) =>
        subject.locations?.length
          ? subject.locations.map((location) => ({
              lat: location.lat,
              lng: location.lng,
              color: location.pinColor ?? MAP_PIN_COLORS[session?.committeeGroup ?? 'CCSRM'],
              title: subject.subjectTitle,
              label: getPrimaryNumber(subject),
              subjectId: subject.id,
            }))
          : [],
      ),
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
          {results.map(({ subject, session }) => {
            const categoryLabels = subject.categoriesIds
              .map((id) => categories.find((c) => c.id === id)?.label)
              .filter((label): label is string => Boolean(label));
            const primaryNumber = getPrimaryNumber(subject);
            const { typeLabel, numberLabel } = formatSubjectBadge(primaryNumber);
            const badgeText = session
              ? `${session.sessionNumber} ${typeLabel} ${numberLabel}`
              : `${typeLabel} ${numberLabel}`;
            const committeeClass = session?.committeeGroup === 'CCU' ? 'ccu' : 'ccsrm';

            return (
              <button
                key={subject.id}
                className={`result-card ${committeeClass}`}
                onClick={() => session && navigate({ page: 'session', sessionId: session.id })}
              >
                <span className={`session-committee-badge result-committee-badge ${committeeClass}`}>
                  {badgeText}
                </span>
                <h3 className="result-title">{subject.subjectTitle}</h3>
                <p className="result-infos">{session ? formatDate(session.date, session.time) : ''}</p>
                <div className="result-categories">
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
              </button>
            );
          })}
          {results.length === 0 && <p className="vide">Aucun sujet trouvé.</p>}
        </div>
      </div>
    </div>
  );
}

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; icon: string; color: string }[] = [
  { value: 'waiting', label: 'En attente', icon: '⏸️', color: '#2563eb' },
  { value: 'in_progress', label: 'En progression', icon: '⏳', color: '#ea580c' },
  { value: 'done', label: 'Terminé', icon: '✅', color: '#16a34a' },
];

function TasksPage({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: {
  tasks: Task[];
  onAddTask: () => void;
  onUpdateTask: (id: string, field: keyof Task, value: string | TaskStatus) => void;
  onDeleteTask: (id: string) => void;
}) {
  return (
    <div className="tasks-page">
      <div className="card tasks-card">
        <div className="entete-formulaire">
          <div>
            <p className="surTitre">Organisation</p>
            <h2>Attribution des tâches</h2>
            <p className="description">
              Suivez les actions liées aux comités, assignez des responsables et mettez à jour l’avancement.
            </p>
          </div>
          <button className="bouton-principal" onClick={onAddTask}>
            Ajouter une tâche
          </button>
        </div>

        <div className="task-table" role="table" aria-label="Tableau des tâches">
          <div className="task-row task-header" role="row">
            <div role="columnheader">Tâche</div>
            <div role="columnheader">Assignée à</div>
            <div role="columnheader">Statut</div>
            <div role="columnheader">Note supplémentaire</div>
            <div role="columnheader" className="task-actions-col" aria-label="Actions" />
          </div>

          {tasks.length === 0 && (
            <div className="task-row empty-task" role="row">
              <div className="empty-message" role="cell">
                Aucune tâche pour le moment. Ajoutez une première action pour démarrer le suivi.
              </div>
            </div>
          )}

          {tasks.map((task) => {
            const statusDefinition = TASK_STATUS_OPTIONS.find((opt) => opt.value === task.status);
            return (
              <div key={task.id} className="task-row" role="row">
                <div role="cell">
                  <input
                    className="task-input"
                    value={task.title}
                    onChange={(e) => onUpdateTask(task.id, 'title', e.target.value)}
                    placeholder="Décrire la tâche"
                  />
                </div>
                <div role="cell">
                  <input
                    className="task-input"
                    value={task.assignee}
                    onChange={(e) => onUpdateTask(task.id, 'assignee', e.target.value)}
                    placeholder="Ajouter un responsable"
                  />
                </div>
                <div role="cell" className="task-status-cell">
                  <span className="status-chip" style={{ color: statusDefinition?.color }}>
                    {statusDefinition?.icon} {statusDefinition?.label}
                  </span>
                  <select
                    className="task-select"
                    value={task.status}
                    onChange={(e) => onUpdateTask(task.id, 'status', e.target.value as TaskStatus)}
                    aria-label={`Statut pour ${task.title || 'cette tâche'}`}
                  >
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {`${option.icon} ${option.label}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div role="cell">
                  <input
                    className="task-input"
                    value={task.note}
                    onChange={(e) => onUpdateTask(task.id, 'note', e.target.value)}
                    placeholder="Ajouter un rappel ou une précision"
                  />
                </div>
                <div role="cell" className="task-actions-col">
                  <button className="bouton-lien" onClick={() => onDeleteTask(task.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SessionDetail({
  session,
  subjects,
  allSubjects,
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
  allSubjects: Subject[];
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
  const [draftLocations, setDraftLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<Omit<Subject, 'id' | 'sessionId'>>({
    subjectNumber: '',
    mainResolutionNumbers: [],
    subjectTitle: '',
    shortLabel: '',
    longDescription: '',
    categoriesIds: [],
    keywords: [],
    resolutionNumbers: [],
    extraitDocuments: [],
    attachments: [],
    locations: [],
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
        locations: rest.locations ?? [],
      });
    }
  }, [editing]);

  useEffect(() => {
    if (locatingSubject?.locations?.length) {
      setDraftLocations(locatingSubject.locations);
    } else {
      setDraftLocations([]);
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
      resolutionNumbers: [],
      extraitDocuments: [],
      attachments: [],
      locations: [],
    });
  };

  const visibles = subjects;
  const sessionMarkers: MapMarker[] = useMemo(
    () =>
      visibles.flatMap((subject) =>
        subject.locations?.length
          ? subject.locations.map((location) => ({
              lat: location.lat,
              lng: location.lng,
              color: location.pinColor ?? MAP_PIN_COLORS[session.committeeGroup],
              title: subject.subjectTitle,
              label: getPrimaryNumber(subject),
              subjectId: subject.id,
            }))
          : [],
      ),
    [session.committeeGroup, visibles],
  );

  const draftMarkers: MapMarker[] = useMemo(
    () =>
      draftLocations.map((location) => ({
        lat: location.lat,
        lng: location.lng,
        color: MAP_PIN_COLORS[session.committeeGroup],
        title: locatingSubject?.subjectTitle || 'Localisation',
        label: locatingSubject ? getPrimaryNumber(locatingSubject) : undefined,
      })),
    [draftLocations, locatingSubject, session.committeeGroup],
  );

  const sessionMarkersWithoutCurrent = useMemo(
    () =>
      locatingSubject
        ? sessionMarkers.filter((marker) => marker.subjectId !== locatingSubject.id)
        : sessionMarkers,
    [locatingSubject, sessionMarkers],
  );

  const openLocationPicker = (subject: Subject) => {
    setLocatingSubject(subject);
    setDraftLocations(subject.locations ?? []);
  };

  const removeDraftLocation = (index: number) => {
    setDraftLocations((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveLocation = () => {
    if (!locatingSubject || !draftLocations.length) return;
    const updated: Subject = {
      ...locatingSubject,
      locations: draftLocations.map((location) => ({
        ...location,
        pinColor: MAP_PIN_COLORS[session.committeeGroup],
      })),
    };
    onUpsertSubject(updated);
    setLocatingSubject(null);
    setDraftLocations([]);
  };

  const closePicker = () => {
    setLocatingSubject(null);
    setDraftLocations([]);
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
            <SubjectDetail
              subject={subject}
              categories={categories}
              allSubjects={allSubjects}
              onNavigateToSubject={onSelectSujet}
            />
            <div className="actions">
              <button className="bouton-principal" onClick={() => openLocationPicker(subject)}>
                {subject.locations?.length ? 'Mettre à jour les localisations' : 'Ajouter une localisation'}
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
                  Cliquez sur la carte pour ajouter un point (ou plusieurs) pour cette demande.
                  Un repère
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
              markers={[...sessionMarkersWithoutCurrent, ...draftMarkers]}
              onPickLocation={(coords) => setDraftLocations((prev) => [...prev, coords])}
            />
            <div className="actions-formulaire">
              <div className="points-list">
                <div className="points-list-header">
                  <p className="surTitre">Points liés à ce sujet</p>
                  <p className="map-hint">
                    {draftLocations.length}
                    {draftLocations.length <= 1 ? ' point sélectionné' : ' points sélectionnés'}
                  </p>
                </div>
                {draftLocations.length === 0 && (
                  <p className="map-hint">Aucun point pour le moment. Cliquez sur la carte pour en ajouter.</p>
                )}
                <div className="pin-list">
                  {draftLocations.map((coord, index) => (
                    <div key={`${coord.lat}-${coord.lng}-${index}`} className="pin-item">
                      <div>
                        <p className="pin-label">Point {index + 1}</p>
                        <div className="coordonnees">
                          <span>Lat : {coord.lat.toFixed(6)}</span>
                          <span>Lng : {coord.lng.toFixed(6)}</span>
                        </div>
                      </div>
                      <button className="bouton-lien" onClick={() => removeDraftLocation(index)}>
                        Supprimer ce point
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="bouton-secondaire" onClick={closePicker}>
                  Annuler
                </button>
                <button
                  className="bouton-principal"
                  disabled={!draftLocations.length}
                  onClick={saveLocation}
                >
                  Enregistrer les localisations
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
    const session: Session = {
      ...payload,
      id,
      committeeGroup: group,
      agendaDocuments: payload.agendaDocuments ?? [],
    } as Session;
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
    const subject: Subject = { ...payload, id, resolutionNumbers: payload.resolutionNumbers ?? [] } as Subject;
    setState((prev) => {
      const previousVersion = prev.subjects.find((s) => s.id === id);
      const previousReferences = new Set(
        (previousVersion?.resolutionNumbers ?? [])
          .map((ref) => normalizeIdentifier(ref))
          .filter(Boolean),
      );

      const subjectsById = new Map<string, Subject>(prev.subjects.map((s) => [s.id, s]));
      subjectsById.set(id, subject);

      const basePrimaryNumber = getPrimaryNumber(subject);
      const normalizedPrimary = normalizeIdentifier(basePrimaryNumber);
      const referenceEntries = subject.resolutionNumbers
        .map((ref) => ({ ref, normalized: normalizeIdentifier(ref) }))
        .filter((entry) => Boolean(entry.normalized));
      const newReferences = referenceEntries.filter(
        (entry, index, arr) =>
          arr.findIndex((candidate) => candidate.normalized === entry.normalized) === index &&
          !previousReferences.has(entry.normalized as string),
      );

      newReferences.forEach(({ ref }) => {
        const target = findSubjectByReference(ref, Array.from(subjectsById.values()), id);
        if (!target) return;

        const targetCurrent = subjectsById.get(target.id) ?? target;
        subjectsById.set(target.id, addReferenceIfMissing(targetCurrent, basePrimaryNumber));

        const targetLinks = (targetCurrent.resolutionNumbers ?? [])
          .map((link) => ({ link, normalized: normalizeIdentifier(link) }))
          .filter(
            (entry, index, arr) =>
              entry.normalized &&
              entry.normalized !== normalizedPrimary &&
              arr.findIndex((candidate) => candidate.normalized === entry.normalized) === index,
          );

        targetLinks.forEach(({ link }) => {
          const linkedSubject = findSubjectByReference(link, Array.from(subjectsById.values()), id);
          const baseSubject = subjectsById.get(id)!;
          const labelForBase = linkedSubject ? getPrimaryNumber(linkedSubject) : link;
          subjectsById.set(id, addReferenceIfMissing(baseSubject, labelForBase));

          if (linkedSubject) {
            const currentLinked = subjectsById.get(linkedSubject.id) ?? linkedSubject;
            subjectsById.set(linkedSubject.id, addReferenceIfMissing(currentLinked, basePrimaryNumber));
          }
        });
      });

      const subjects = prev.subjects.map((s) => subjectsById.get(s.id) ?? s);
      if (!previousVersion) {
        subjects.push(subjectsById.get(id)!);
      }

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

  const addTask = () => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: '',
      assignee: '',
      status: 'waiting',
      note: '',
    };
    setState((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  const updateTask = (id: string, field: keyof Task, value: string | TaskStatus) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task)),
    }));
  };

  const deleteTask = (id: string) => {
    setState((prev) => ({ ...prev, tasks: prev.tasks.filter((task) => task.id !== id) }));
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
    if (route.page === 'tasks') {
      return { title: 'Attribution des tâches', subtitle: 'Suivi des actions et responsables' };
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
          <button className={route.page === 'tasks' ? 'active' : ''} onClick={() => navigate({ page: 'tasks' })}>
            <span>📋</span>
            Attribution des tâches
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
          <div className="header-brand">
            {route.page === 'home' && (
              <img
                src={logoVille}
                alt="Ville de Val-d’Or"
                className="header-logo"
              />
            )}
            <div className="header-titles">
              <h1>{headerTitle.title}</h1>
              {headerTitle.subtitle && (
                <p className="header-subtitle">{headerTitle.subtitle}</p>
              )}
            </div>
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
              onUpsert={upsertSession}
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
              onUpsert={upsertSession}
            />
          )}
          {route.page === 'tasks' && (
            <TasksPage
              tasks={state.tasks}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
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
              allSubjects={state.subjects}
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
