import { useEffect, useMemo, useState } from 'react';

type Committee = 'CCC' | 'CCSRM' | 'CCU';

type Sujet = {
  id: string;
  titre: string;
  description: string;
  comite: Committee;
  categories: string[];
  motsCles: string[];
  numeroResolution: string;
  numeroCommentaire: string;
  lienPV: string;
};

type Seance = {
  id: string;
  numero: string;
  date: string;
  comite: Committee;
  sujets: Sujet[];
};

type FiltreSujets = {
  comite?: Committee | 'Tous';
  categorie?: string;
  motCle?: string;
  resolutionCommentaire?: string;
};

const COMITES: { value: Committee; label: string }[] = [
  { value: 'CCC', label: 'CCC – Comité consultatif de circulation' },
  { value: 'CCSRM', label: 'CCSRM – Commission consultative de sécurité routière municipale' },
  { value: 'CCU', label: 'CCU – Comité consultatif d’urbanisme' },
];

const STORAGE_KEY = 'comites-valdor:v1';

const exemples: Seance[] = [
  {
    id: 'seance-ccc-2406',
    numero: '2024-06',
    date: '2024-06-11',
    comite: 'CCC',
    sujets: [
      {
        id: 's-001',
        titre: 'Réaménagement sécuritaire de la 3e Avenue',
        description: 'Analyse de circulation et propositions de corridors piétons.',
        comite: 'CCC',
        categories: ['Mobilité', 'Sécurité'],
        motsCles: ['3e Avenue', 'piétons', 'comptage'],
        numeroResolution: 'CCC-2024-061',
        numeroCommentaire: 'C-4582',
        lienPV: 'https://valdor.ca/pv/ccc/2024-06',
      },
      {
        id: 's-002',
        titre: 'Véloroute estivale',
        description: 'Boucle cyclable temporaire – évaluation des intersections clés.',
        comite: 'CCC',
        categories: ['Cyclisme', 'Aménagement'],
        motsCles: ['véloroute', 'sécurité', 'signalisation'],
        numeroResolution: 'CCC-2024-062',
        numeroCommentaire: 'C-4583',
        lienPV: 'https://valdor.ca/pv/ccc/2024-06#velo',
      },
    ],
  },
  {
    id: 'seance-ccsrm-2405',
    numero: '2024-05',
    date: '2024-05-16',
    comite: 'CCSRM',
    sujets: [
      {
        id: 's-003',
        titre: 'Feux rectangulaires rapides',
        description: 'Pilotage de signaux piétons près des écoles.',
        comite: 'CCSRM',
        categories: ['Sécurité', 'Écoles'],
        motsCles: ['FRR', 'traverses', 'enfants'],
        numeroResolution: 'CCSRM-2024-048',
        numeroCommentaire: 'R-2215',
        lienPV: 'https://valdor.ca/pv/ccsrm/2024-05#frr',
      },
      {
        id: 's-004',
        titre: 'Brigades vélo communautaires',
        description: 'Appui logistique pour les patrouilles saisonnières.',
        comite: 'CCSRM',
        categories: ['Mobilisation', 'Sécurité'],
        motsCles: ['brigade', 'partenaires', 'budget'],
        numeroResolution: 'CCSRM-2024-049',
        numeroCommentaire: 'R-2216',
        lienPV: 'https://valdor.ca/pv/ccsrm/2024-05#brigade',
      },
    ],
  },
  {
    id: 'seance-ccu-2404',
    numero: '2024-04',
    date: '2024-04-09',
    comite: 'CCU',
    sujets: [
      {
        id: 's-005',
        titre: 'Projet résidentiel Valmont',
        description: 'Analyse d’implantation et verdissement.',
        comite: 'CCU',
        categories: ['Habitation', 'Environnement'],
        motsCles: ['Valmont', 'zonage', 'arbres'],
        numeroResolution: 'CCU-2024-034',
        numeroCommentaire: 'U-781',
        lienPV: 'https://valdor.ca/pv/ccu/2024-04#valmont',
      },
      {
        id: 's-006',
        titre: 'Agrandissement d’un commerce local',
        description: 'Analyse de conformité architecturale.',
        comite: 'CCU',
        categories: ['Commercial', 'Architecture'],
        motsCles: ['règlements', 'façade', 'signalisation'],
        numeroResolution: 'CCU-2024-035',
        numeroCommentaire: 'U-782',
        lienPV: 'https://valdor.ca/pv/ccu/2024-04#commerce',
      },
    ],
  },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function initialiserSeances(): Seance[] {
  if (typeof window === 'undefined') return exemples;
  const sauvegarde = localStorage.getItem(STORAGE_KEY);
  if (!sauvegarde) return exemples;
  try {
    const parsed = JSON.parse(sauvegarde) as Seance[];
    return parsed.length ? parsed : exemples;
  } catch (error) {
    console.error('Impossible de charger les données locales', error);
    return exemples;
  }
}

type SeanceFormProps = {
  valeur: Omit<Seance, 'id' | 'sujets'>;
  onChange: (champ: keyof Omit<Seance, 'id' | 'sujets'>, valeur: string) => void;
  onSubmit: () => void;
  actionLabel: string;
};

function SeanceForm({ valeur, onChange, onSubmit, actionLabel }: SeanceFormProps) {
  return (
    <div className="carte formulaire">
      <div className="entete-formulaire">
        <div>
          <p className="surTitre">Gestion des séances</p>
          <h2>{actionLabel} une séance</h2>
        </div>
        <span className="pastille">Agenda</span>
      </div>
      <div className="ligne-formulaire">
        <label>
          Numéro
          <input
            value={valeur.numero}
            onChange={(e) => onChange('numero', e.target.value)}
            placeholder="2024-07"
          />
        </label>
        <label>
          Date
          <input type="date" value={valeur.date} onChange={(e) => onChange('date', e.target.value)} />
        </label>
        <label>
          Comité
          <select value={valeur.comite} onChange={(e) => onChange('comite', e.target.value)}>
            {COMITES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="bouton-principal" onClick={onSubmit} type="button">
        {actionLabel}
      </button>
    </div>
  );
}

type SujetFormProps = {
  valeur: Omit<Sujet, 'id'>;
  onChange: (champ: keyof Omit<Sujet, 'id'>, valeur: string | string[]) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  actionLabel: string;
};

function SujetForm({ valeur, onChange, onSubmit, onCancel, actionLabel }: SujetFormProps) {
  return (
    <div className="carte formulaire sujet-formulaire">
      <div className="entete-formulaire">
        <div>
          <p className="surTitre">Sujets</p>
          <h3>{actionLabel} un sujet</h3>
        </div>
        <span className="pastille secondaire">Dossier</span>
      </div>
      <div className="ligne-formulaire">
        <label>
          Titre
          <input value={valeur.titre} onChange={(e) => onChange('titre', e.target.value)} />
        </label>
        <label>
          Comité associé
          <select value={valeur.comite} onChange={(e) => onChange('comite', e.target.value)}>
            {COMITES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="bloc">
        Description courte
        <textarea
          value={valeur.description}
          rows={3}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Résumé en quelques lignes"
        />
      </label>
      <div className="ligne-formulaire">
        <label>
          Catégories
          <input
            value={valeur.categories.join(', ')}
            onChange={(e) => onChange('categories', e.target.value.split(',').map((c) => c.trim()).filter(Boolean))}
            placeholder="Mobilité, Sécurité"
          />
        </label>
        <label>
          Mots-clés
          <input
            value={valeur.motsCles.join(', ')}
            onChange={(e) => onChange('motsCles', e.target.value.split(',').map((c) => c.trim()).filter(Boolean))}
            placeholder="piétons, corridor"
          />
        </label>
      </div>
      <div className="ligne-formulaire">
        <label>
          No. de résolution
          <input
            value={valeur.numeroResolution}
            onChange={(e) => onChange('numeroResolution', e.target.value)}
            placeholder="CCU-2024-001"
          />
        </label>
        <label>
          No. de commentaire
          <input
            value={valeur.numeroCommentaire}
            onChange={(e) => onChange('numeroCommentaire', e.target.value)}
            placeholder="U-999"
          />
        </label>
        <label>
          Lien vers PV
          <input value={valeur.lienPV} onChange={(e) => onChange('lienPV', e.target.value)} placeholder="https://..." />
        </label>
      </div>
      <div className="actions-formulaire">
        <button className="bouton-principal" type="button" onClick={onSubmit}>
          {actionLabel}
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

function TagList({ valeurs }: { valeurs: string[] }) {
  if (!valeurs.length) return <span className="etiquette neutre">Non précisé</span>;
  return (
    <div className="liste-etiquettes">
      {valeurs.map((valeur) => (
        <span key={valeur} className="etiquette">
          {valeur}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [seances, setSeances] = useState<Seance[]>(initialiserSeances);
  const [filtre, setFiltre] = useState<FiltreSujets>({ comite: 'Tous' });
  const [seanceForm, setSeanceForm] = useState<Omit<Seance, 'id' | 'sujets'>>({
    numero: '',
    date: '',
    comite: 'CCC',
  });
  const [editeSeanceId, setEditeSeanceId] = useState<string | null>(null);

  const [sujetForm, setSujetForm] = useState<{
    seanceId: string | null;
    editionId: string | null;
    valeur: Omit<Sujet, 'id'>;
  }>(
    () => ({
      seanceId: null,
      editionId: null,
      valeur: {
        titre: '',
        description: '',
        comite: 'CCC',
        categories: [],
        motsCles: [],
        numeroResolution: '',
        numeroCommentaire: '',
        lienPV: '',
      },
    }),
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seances));
    }
  }, [seances]);

  const sujetsEnVue = useMemo(() => {
    return seances
      .flatMap((seance) => seance.sujets.map((sujet) => ({ sujet, seance })))
      .filter(({ sujet }) => {
        const filtreComite = filtre.comite && filtre.comite !== 'Tous' ? sujet.comite === filtre.comite : true;
        const filtreCategorie = filtre.categorie
          ? sujet.categories.some((cat) => cat.toLowerCase().includes(filtre.categorie!.toLowerCase()))
          : true;
        const filtreMotCle = filtre.motCle
          ? sujet.motsCles.some((mot) => mot.toLowerCase().includes(filtre.motCle!.toLowerCase()))
          : true;
        const filtreResolution = filtre.resolutionCommentaire
          ? [sujet.numeroResolution, sujet.numeroCommentaire]
              .filter(Boolean)
              .some((num) => num.toLowerCase().includes(filtre.resolutionCommentaire!.toLowerCase()))
          : true;
        return filtreComite && filtreCategorie && filtreMotCle && filtreResolution;
      });
  }, [filtre, seances]);

  const resetSeanceForm = () => {
    setSeanceForm({ numero: '', date: '', comite: 'CCC' });
    setEditeSeanceId(null);
  };

  const enregistrerSeance = () => {
    if (!seanceForm.numero || !seanceForm.date) return;
    if (editeSeanceId) {
      setSeances((courantes) =>
        courantes.map((seance) => (seance.id === editeSeanceId ? { ...seance, ...seanceForm } : seance)),
      );
    } else {
      setSeances((courantes) => [...courantes, { id: `seance-${Date.now()}`, ...seanceForm, sujets: [] }]);
    }
    resetSeanceForm();
  };

  const preparerEditionSeance = (id: string) => {
    const cible = seances.find((s) => s.id === id);
    if (!cible) return;
    setSeanceForm({ numero: cible.numero, date: cible.date, comite: cible.comite });
    setEditeSeanceId(id);
  };

  const supprimerSeance = (id: string) => {
    setSeances((courantes) => courantes.filter((seance) => seance.id !== id));
    if (sujetForm.seanceId === id) {
      setSujetForm((courant) => ({ ...courant, seanceId: null, editionId: null }));
    }
    if (editeSeanceId === id) resetSeanceForm();
  };

  const ouvrirSujetFormulaire = (seanceId: string, sujet?: Sujet) => {
    setSujetForm({
      seanceId,
      editionId: sujet?.id ?? null,
      valeur: sujet
        ? { ...sujet }
        : {
            titre: '',
            description: '',
            comite: seances.find((s) => s.id === seanceId)?.comite ?? 'CCC',
            categories: [],
            motsCles: [],
            numeroResolution: '',
            numeroCommentaire: '',
            lienPV: '',
          },
    });
  };

  const mettreAJourSujetForm = (champ: keyof Omit<Sujet, 'id'>, valeur: string | string[]) => {
    setSujetForm((courant) => ({ ...courant, valeur: { ...courant.valeur, [champ]: valeur } }));
  };

  const enregistrerSujet = () => {
    if (!sujetForm.seanceId || !sujetForm.valeur.titre || !sujetForm.valeur.description) return;
    setSeances((courantes) =>
      courantes.map((seance) => {
        if (seance.id !== sujetForm.seanceId) return seance;
        if (sujetForm.editionId) {
          return {
            ...seance,
            sujets: seance.sujets.map((sujet) => (sujet.id === sujetForm.editionId ? { ...sujet, ...sujetForm.valeur } : sujet)),
          };
        }
        const nouveau: Sujet = { ...sujetForm.valeur, id: `sujet-${Date.now()}` };
        return { ...seance, sujets: [...seance.sujets, nouveau] };
      }),
    );
    setSujetForm((courant) => ({ ...courant, editionId: null, seanceId: courant.seanceId }));
    setSujetForm({
      seanceId: sujetForm.seanceId,
      editionId: null,
      valeur: {
        titre: '',
        description: '',
        comite: seances.find((s) => s.id === sujetForm.seanceId)?.comite ?? 'CCC',
        categories: [],
        motsCles: [],
        numeroResolution: '',
        numeroCommentaire: '',
        lienPV: '',
      },
    });
  };

  const supprimerSujet = (seanceId: string, sujetId: string) => {
    setSeances((courantes) =>
      courantes.map((seance) =>
        seance.id === seanceId ? { ...seance, sujets: seance.sujets.filter((s) => s.id !== sujetId) } : seance,
      ),
    );
    if (sujetForm.editionId === sujetId) setSujetForm((courant) => ({ ...courant, editionId: null }));
  };

  return (
    <div className="app">
      <header className="barre-haut">
        <div>
          <p className="surTitre">Ville de Val-d’Or</p>
          <h1>Suivi des comités CCC, CCSRM et CCU</h1>
          <p className="intro">
            Interface de travail pour suivre les séances, sujets et résolutions. Les données sont conservées localement
            (localStorage) pour vos essais.
          </p>
        </div>
        <div className="badge">Prototype interne</div>
      </header>

      <main>
        <section className="grille">
          <SeanceForm
            valeur={seanceForm}
            onChange={(champ, valeur) => setSeanceForm((courant) => ({ ...courant, [champ]: valeur }))}
            onSubmit={enregistrerSeance}
            actionLabel={editeSeanceId ? 'Mettre à jour' : 'Ajouter'}
          />

          <div className="carte filtres">
            <div className="entete-formulaire">
              <div>
                <p className="surTitre">Filtres</p>
                <h2>Affiner les sujets</h2>
              </div>
              <span className="pastille">Recherche</span>
            </div>
            <div className="ligne-formulaire">
              <label>
                Comité
                <select
                  value={filtre.comite}
                  onChange={(e) => setFiltre((f) => ({ ...f, comite: e.target.value as Committee | 'Tous' }))}
                >
                  <option value="Tous">Tous</option>
                  {COMITES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Catégorie
                <input
                  placeholder="Mobilité, Sécurité…"
                  value={filtre.categorie ?? ''}
                  onChange={(e) => setFiltre((f) => ({ ...f, categorie: e.target.value }))}
                />
              </label>
            </div>
            <div className="ligne-formulaire">
              <label>
                Mot-clé
                <input
                  placeholder="piétons, façade…"
                  value={filtre.motCle ?? ''}
                  onChange={(e) => setFiltre((f) => ({ ...f, motCle: e.target.value }))}
                />
              </label>
              <label>
                No. résolution ou commentaire
                <input
                  placeholder="CCU-2024-034 ou U-781"
                  value={filtre.resolutionCommentaire ?? ''}
                  onChange={(e) => setFiltre((f) => ({ ...f, resolutionCommentaire: e.target.value }))}
                />
              </label>
            </div>
            <div className="stats">
              <div>
                <p className="surTitre">Sujets filtrés</p>
                <strong>{sujetsEnVue.length}</strong>
              </div>
              <div>
                <p className="surTitre">Séances</p>
                <strong>{seances.length}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="grille">
          <div className="colonne">
            <h2 className="section-titre">Séances et sujets</h2>
            <div className="liste-seances">
              {seances.map((seance) => (
                <article key={seance.id} className="carte seance">
                  <header className="entete-seance">
                    <div>
                      <p className="surTitre">{seance.numero}</p>
                      <h3>{COMITES.find((c) => c.value === seance.comite)?.label}</h3>
                      <p className="date">{formatDate(seance.date)}</p>
                    </div>
                    <div className="actions">
                      <button className="bouton-secondaire" onClick={() => preparerEditionSeance(seance.id)}>
                        Modifier
                      </button>
                      <button className="bouton-lien" onClick={() => supprimerSeance(seance.id)}>
                        Supprimer
                      </button>
                    </div>
                  </header>

                  <div className="sujets">
                    {seance.sujets.map((sujet) => (
                      <div key={sujet.id} className="ligne-sujet">
                        <div>
                          <div className="ligne-titre">
                            <h4>{sujet.titre}</h4>
                            <span className="etiquette secondaire">{sujet.comite}</span>
                          </div>
                          <p className="description">{sujet.description}</p>
                          <div className="meta">
                            <TagList valeurs={sujet.categories} />
                            <TagList valeurs={sujet.motsCles} />
                          </div>
                          <div className="liens">
                            <span className="etiquette clair">Résolution : {sujet.numeroResolution || 'À venir'}</span>
                            <span className="etiquette clair">Commentaire : {sujet.numeroCommentaire || '—'}</span>
                            {sujet.lienPV && (
                              <a href={sujet.lienPV} target="_blank" rel="noreferrer" className="lien">
                                PV
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="actions">
                          <button className="bouton-secondaire" onClick={() => ouvrirSujetFormulaire(seance.id, sujet)}>
                            Éditer
                          </button>
                          <button className="bouton-lien" onClick={() => supprimerSujet(seance.id, sujet.id)}>
                            Retirer
                          </button>
                        </div>
                      </div>
                    ))}
                    {seance.sujets.length === 0 && <p className="vide">Aucun sujet pour cette séance pour l’instant.</p>}
                  </div>

                  {sujetForm.seanceId === seance.id ? (
                    <SujetForm
                      valeur={sujetForm.valeur}
                      onChange={mettreAJourSujetForm}
                      onSubmit={enregistrerSujet}
                      onCancel={() => setSujetForm((courant) => ({ ...courant, seanceId: null, editionId: null }))}
                      actionLabel={sujetForm.editionId ? 'Mettre à jour' : 'Ajouter'}
                    />
                  ) : (
                    <button className="bouton-secondaire plein" onClick={() => ouvrirSujetFormulaire(seance.id)}>
                      Ajouter un sujet
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="colonne">
            <h2 className="section-titre">Sujets filtrés</h2>
            <div className="liste-sujets">
              {sujetsEnVue.map(({ sujet, seance }) => (
                <div key={`${seance.id}-${sujet.id}`} className="carte sujet-filtre">
                  <div className="ligne-titre">
                    <h4>{sujet.titre}</h4>
                    <span className="etiquette secondaire">{sujet.comite}</span>
                  </div>
                  <p className="description">{sujet.description}</p>
                  <div className="meta">
                    <TagList valeurs={sujet.categories} />
                    <TagList valeurs={sujet.motsCles} />
                  </div>
                  <p className="surTitre">Séance {seance.numero} · {formatDate(seance.date)}</p>
                  <div className="liens">
                    <span className="etiquette clair">Résolution : {sujet.numeroResolution || 'À venir'}</span>
                    <span className="etiquette clair">Commentaire : {sujet.numeroCommentaire || '—'}</span>
                    {sujet.lienPV && (
                      <a className="lien" href={sujet.lienPV} target="_blank" rel="noreferrer">
                        Voir le PV
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {sujetsEnVue.length === 0 && <p className="vide">Aucun résultat pour ces filtres.</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
