import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formations } from '../../data/mockData';
import { useFormationsMeta } from '../../context/FormationsMetaContext';

const TABS = [
  { key: 'infos',         label: '&#x2139;&#xFE0F; Informations' },
  { key: 'inscriptions',  label: 'Inscriptions' },
  { key: 'documents',     label: 'Documents' },
  { key: 'modele',        label: 'Modèle économique' },
];

const STATUTS_F = [
  { value: 'planifie',      label: 'Planifié',            color: '#64748B' },
  { value: 'inscriptions',  label: 'Inscriptions ouvertes',    color: '#10B981' },
  { value: 'en_cours',      label: 'En cours',                 color: '#F59E0B' },
  { value: 'termine',       label: 'Terminé',             color: '#8B5CF6' },
  { value: 'annule',        label: 'Annulé',              color: '#EF4444' },
];

const STATUTS_I = [
  { value: 'confirme',    label: 'Confirmé',  color: '#10B981' },
  { value: 'en_attente',  label: 'En attente',      color: '#F59E0B' },
  { value: 'annule',      label: 'Annulé',     color: '#EF4444' },
];

const EMPTY_MODELE = {
  nbParticipants: '', nbJours: '',
  fraisPeda: '', fraisMateriel: '',
  honorairesFormateur: '', nbFormateurs: '', deplFormateur: '',
  fraisInscription: '', fraisCertification: '',
  transport: '', nbNuits: '', hebergement: '', restauration: '',
  coutSalarial: '',
  fraisAdmin: '', autresFrais: '',
};
const EMPTY_INSC   = { nom: '', service: '', email: '', statut: 'confirme' };

function calcModele(m) {
  const nb      = Number(m.nbParticipants)      || 0;
  const jours   = Number(m.nbJours)             || 0;
  const nuits   = Number(m.nbNuits)             || 0;
  const nbForm  = Number(m.nbFormateurs)        || 1;
  const pedaBase    = (Number(m.fraisPeda) || 0) + (Number(m.fraisMateriel) || 0);
  const pedaInscrit = ((Number(m.fraisInscription) || 0) + (Number(m.fraisCertification) || 0)) * nb;
  const coutPeda    = pedaBase + pedaInscrit;
  const coutFormateur = ((Number(m.honorairesFormateur) || 0) * jours + (Number(m.deplFormateur) || 0)) * nbForm;
  const coutDeplac  = ((Number(m.transport) || 0) + (Number(m.hebergement) || 0) * nuits + (Number(m.restauration) || 0) * jours) * nb;
  const coutTemps   = (Number(m.coutSalarial) || 0) * jours * nb;
  const coutAdmin   = Number(m.fraisAdmin)  || 0;
  const coutAutres  = Number(m.autresFrais) || 0;
  const total = coutPeda + coutFormateur + coutDeplac + coutTemps + coutAdmin + coutAutres;
  return { coutPeda, pedaBase, pedaInscrit, coutFormateur, coutDeplac, coutTemps, coutAdmin, coutAutres, total, parParticipant: nb > 0 ? total / nb : 0 };
}

function euro(n) { return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'; }

function StatutBadgeF({ value }) {
  const s = STATUTS_F.find(x => x.value === value) || STATUTS_F[0];
  return (
    <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.color + '22', color: s.color }}
      dangerouslySetInnerHTML={{ __html: s.label }} />
  );
}

function formatDateF(d) {
  if (!d) return '—';
  if (!d.includes('-')) return d;
  const [y, m, day] = d.split('-');
  return day + '/' + m + '/' + y;
}

export default function FormationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMeta, setMeta, getInscriptions, addInscription, updateInscription, removeInscription, getDocs, addDoc, removeDoc } = useFormationsMeta();
  const formation = formations.find(f => f.id === id);

  const [tab,       setTab]       = useState('infos');
  const [savedInfo, setSavedInfo] = useState(false);
  const [savedMod,  setSavedMod]  = useState(false);

  const meta  = getMeta(id);
  const inscriptions = getInscriptions(id);
  const [docs, setDocs] = useState(() => getDocs(id));

  // ── infos state ──
  const [statut, setStatut] = useState(meta.statut || 'planifie');
  const [notes,  setNotes]  = useState(meta.notes  || '');

  // ── inscriptions state ──
  const [newInsc, setNewInsc] = useState(EMPTY_INSC);
  const [addingInsc, setAddingInsc] = useState(false);

  // ── modele state ──
  const [modele, setModele] = useState(() => ({ ...EMPTY_MODELE, ...(meta.modele || {}) }));

  // ── document upload ──
  const fileRef = useRef(null);

  if (!formation) {
    return (
      <Layout title="Formation introuvable">
        <div className="empty-state">
          <div className="empty-title">Formation introuvable</div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/formations')}>Retour aux formations</button>
        </div>
      </Layout>
    );
  }

  function saveInfos() {
    setMeta(id, { statut, notes });
    setSavedInfo(true);
    setTimeout(() => setSavedInfo(false), 2500);
  }

  function saveModele() {
    setMeta(id, { modele });
    setSavedMod(true);
    setTimeout(() => setSavedMod(false), 2500);
  }

  function handleAddInsc(e) {
    e.preventDefault();
    if (!newInsc.nom.trim()) return;
    addInscription(id, { ...newInsc, dateInscription: new Date().toISOString().slice(0, 10) });
    setNewInsc(EMPTY_INSC);
    setAddingInsc(false);
  }

  function handleFileUpload(file) {
    if (!file) return;
    const maxSize = 1024 * 1024; // 1 MB
    const docBase = { id: Date.now().toString(), nom: file.name, type: file.type, taille: file.size, date: new Date().toISOString().slice(0, 10) };
    if (file.size <= maxSize) {
      const reader = new FileReader();
      reader.onload = e => {
        const doc = { ...docBase, data: e.target.result };
        addDoc(id, doc);
        setDocs(getDocs(id));
      };
      reader.readAsDataURL(file);
    } else {
      const doc = { ...docBase, data: null, warning: 'Fichier > 1 Mo : contenu non persisté' };
      addDoc(id, doc);
      setDocs(getDocs(id));
    }
  }

  function handleRemoveDoc(docId) {
    removeDoc(id, docId);
    setDocs(getDocs(id));
  }

  const calc = calcModele(modele);
  const nbConf    = inscriptions.filter(i => i.statut === 'confirme').length;
  const nbAttente = inscriptions.filter(i => i.statut === 'en_attente').length;

  return (
    <Layout title={formation.nom} sub="— Détail de la formation">
      <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/formations')}>
        &#x2190; Retour aux formations
      </button>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{formation.nom}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {formation.responsablePedagogique && <span style={{ marginRight: 16 }}>{formation.responsablePedagogique}</span>}
              {formation.contact && <span>{formation.contact}</span>}
            </div>
            <div style={{ fontSize: 12, display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
              <span>Échéance : {formatDateF(formation.dateEcheance)}</span>
              {formation.renouvellement && <span style={{ color: '#10B981', fontWeight: 600 }}>✓ Renouvellement 2026&#x2013;2027</span>}
            </div>
            {formation.commentaires && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>{formation.commentaires}</div>}
          </div>
          <StatutBadgeF value={statut} />
        </div>
      </div>

      {/* Tabs */}
      <div className="marche-tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <div key={t.key} className={'marche-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)} dangerouslySetInnerHTML={{ __html: t.label }} />
        ))}
      </div>

      {/* ── TAB: Informations ── */}
      {tab === 'infos' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Statut &amp; Notes</span></div>
          <div className="card-body">
            <div style={{ marginBottom: 20 }}>
              <div className="info-field-label" style={{ marginBottom: 8 }}>Statut de la formation</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUTS_F.map(s => (
                  <button key={s.value}
                    className={'btn btn-sm ' + (statut === s.value ? 'btn-primary' : 'btn-outline')}
                    style={statut === s.value ? { background: s.color, borderColor: s.color } : {}}
                    onClick={() => setStatut(s.value)}
                    dangerouslySetInnerHTML={{ __html: s.label }}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="info-field-label" style={{ marginBottom: 6 }}>Notes libres</div>
              <textarea
                rows={5} style={{ width: '100%', resize: 'vertical', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-main)' }}
                placeholder="Informations complémentaires, retours d&#x27;expérience, prochaines étapes..."
                value={notes} onChange={e => setNotes(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={saveInfos}>✓ Enregistrer</button>
              {savedInfo && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Enregistré</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Inscriptions ── */}
      {tab === 'inscriptions' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="kpi-mini" style={{ background: '#D1FAE5', color: '#065F46' }}><span style={{ fontSize: 22, fontWeight: 800 }}>{nbConf}</span><span style={{ fontSize: 11 }}>Confirmé(s)</span></div>
            <div className="kpi-mini" style={{ background: '#FEF3C7', color: '#92400E' }}><span style={{ fontSize: 22, fontWeight: 800 }}>{nbAttente}</span><span style={{ fontSize: 11 }}>En attente</span></div>
            <div className="kpi-mini" style={{ background: '#EFF6FF', color: '#1e40af' }}><span style={{ fontSize: 22, fontWeight: 800 }}>{inscriptions.length}</span><span style={{ fontSize: 11 }}>Total inscrits</span></div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Liste des participants</span>
              <button className="btn btn-primary btn-sm" onClick={() => setAddingInsc(v => !v)}>
                {addingInsc ? 'Annuler' : '+ Ajouter un participant'}
              </button>
            </div>
            <div className="card-body">
              {addingInsc && (
                <form onSubmit={handleAddInsc} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="info-field" style={{ flex: '1 1 180px' }}>
                    <label className="info-field-label">Nom Prénom *</label>
                    <input type="text" className="info-field-input" required value={newInsc.nom} placeholder="Dr Dupont Marie" onChange={e => setNewInsc(f => ({ ...f, nom: e.target.value }))} />
                  </div>
                  <div className="info-field" style={{ flex: '1 1 160px' }}>
                    <label className="info-field-label">Service</label>
                    <input type="text" className="info-field-input" value={newInsc.service} placeholder="Radiothérapie" onChange={e => setNewInsc(f => ({ ...f, service: e.target.value }))} />
                  </div>
                  <div className="info-field" style={{ flex: '1 1 140px' }}>
                    <label className="info-field-label">Statut</label>
                    <select className="info-field-input" value={newInsc.statut} onChange={e => setNewInsc(f => ({ ...f, statut: e.target.value }))}>
                      {STATUTS_I.map(s => <option key={s.value} value={s.value}>{s.label.replace(/&#[^;]+;/g, c => { const m={'é':'é','&#x9;':'\t'}; return m[c]||c; })}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Ajouter</button>
                </form>
              )}
              {inscriptions.length === 0
                ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon"></div><div className="empty-sub">Aucun participant inscrit</div></div>
                : (
                  <table>
                    <thead><tr><th>Participant</th><th>Service</th><th>Date inscription</th><th>Statut</th><th></th></tr></thead>
                    <tbody>
                      {inscriptions.map(i => {
                        const s = STATUTS_I.find(x => x.value === i.statut) || STATUTS_I[0];
                        return (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>{i.nom}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.service || '—'}</td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.dateInscription || '—'}</td>
                            <td>
                              <select style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '1px solid ' + s.color, color: s.color, background: s.color + '22', cursor: 'pointer' }}
                                value={i.statut} onChange={e => updateInscription(id, i.id, { statut: e.target.value })}>
                                {STATUTS_I.map(x => <option key={x.value} value={x.value}>{x.label.replace(/&#[^;]+;/g,'')}</option>)}
                              </select>
                            </td>
                            <td><button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => removeInscription(id, i.id)}>✗</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Documents ── */}
      {tab === 'documents' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Documents attachés</span></div>
          <div className="card-body">
            <div
              style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: 'var(--bg-alt)', transition: 'border-color .2s' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); [...e.dataTransfer.files].forEach(handleFileUpload); }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Déposer un fichier ici ou cliquer pour sélectionner</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Fichiers &lt; 1 Mo stockés dans le navigateur &bull; Formats acceptés : PDF, Word, Excel, images</div>
            </div>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { [...e.target.files].forEach(handleFileUpload); e.target.value = ''; }} />

            {docs.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>Aucun document attaché</div>
              : (
                <table>
                  <thead><tr><th>Nom du fichier</th><th>Type</th><th>Taille</th><th>Date</th><th>Disponibilité</th><th></th></tr></thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{d.nom}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.type || '—'}</td>
                        <td style={{ fontSize: 11, fontWeight: 500 }}>{d.taille > 1024*1024 ? (d.taille/1024/1024).toFixed(1)+' Mo' : Math.round(d.taille/1024)+' Ko'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.date}</td>
                        <td>
                          {d.data
                            ? <a href={d.data} download={d.nom} className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>&#x2B07; Télécharger</a>
                            : <span style={{ fontSize: 11, color: '#F59E0B' }}>&#x26A0; Non persisté</span>
                          }
                        </td>
                        <td><button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => handleRemoveDoc(d.id)}>✗</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}
       {/* ── TAB: Modèle économique ── */}
      {tab === 'modele' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          <div>
            {/* Paramètres */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">&#x2699;&#xFE0F; Paramètres généraux</span></div>
              <div className="card-body">
                <div className="info-grid">
                  {mfield('Nombre de participants', 'nbParticipants', modele, setModele, { min: 0, placeholder: '0', help: 'Nombre total de personnels inscrits à la formation' })}
                  {mfield('Durée (jours)', 'nbJours', modele, setModele, { min: 0, step: 0.5, placeholder: '1', help: 'Durée totale en jours (0,5 = demi-journée)' })}
                </div>
              </div>
            </div>

            {/* Coûts pédagogiques */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Coûts pédagogiques</span></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg-alt)', borderRadius: 6, borderLeft: '3px solid #3B82F6' }}>
                  Coûts liés au contenu pédagogique : frais de formation, supports, droits d&apos;accès aux ressources, frais d&apos;inscription et de certification individuelle.
                </div>
                <div className="info-grid">
                  {mfield('Frais pédagogiques (&#x20ac; total)', 'fraisPeda', modele, setModele, { min: 0, placeholder: '0', help: 'Coût global de la prestation pédagogique (forfait organisme de formation)' })}
                  {mfield('Matériel / documentation (&#x20ac;)', 'fraisMateriel', modele, setModele, { min: 0, placeholder: '0', help: 'Impressions, supports de cours, livres, outils pédagogiques' })}
                  {mfield('Frais d&#x27;inscription (&#x20ac;/pers.)', 'fraisInscription', modele, setModele, { min: 0, placeholder: '0', help: "Droits d'inscription individuelle à la session ou à la plateforme" })}
                  {mfield('Frais de certification (&#x20ac;/pers.)', 'fraisCertification', modele, setModele, { min: 0, placeholder: '0', help: "Coût de passage d'examen, de certification ou d'habilitation" })}
                </div>
                {(Number(modele.fraisInscription) > 0 || Number(modele.fraisCertification) > 0) && Number(modele.nbParticipants) > 0 && (
                  <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 8, fontWeight: 500 }}>
                    &#x2139;&#xFE0F; Frais individuels × {modele.nbParticipants} participants = {euro(calc.pedaInscrit)}
                  </div>
                )}
              </div>
            </div>

            {/* Intervenants externes */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Intervenant(s) externe(s)</span></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg-alt)', borderRadius: 6, borderLeft: '3px solid #10B981' }}>
                  Coûts liés aux formateurs ou experts extérieurs. Calcul : (honoraires × nb jours + frais déplacement) × nb formateurs.
                </div>
                <div className="info-grid">
                  {mfield('Nombre de formateurs', 'nbFormateurs', modele, setModele, { min: 0, placeholder: '1', help: "Nombre d'intervenants/formateurs rémunérés" })}
                  {mfield('Honoraires (&#x20ac;/jour/formateur)', 'honorairesFormateur', modele, setModele, { min: 0, placeholder: '0', help: "Tarif journalier moyen d'un intervenant externe (HT)" })}
                  {mfield('Déplacement formateur (&#x20ac; total)', 'deplFormateur', modele, setModele, { min: 0, placeholder: '0', help: 'Transport + hébergement + repas du formateur (forfait total)' })}
                </div>
                {calc.coutFormateur > 0 && (
                  <div style={{ fontSize: 11, color: '#10B981', marginTop: 8, fontWeight: 500 }}>
                    &#x2139;&#xFE0F; Sous-total intervenants = {euro(calc.coutFormateur)}
                  </div>
                )}
              </div>
            </div>

            {/* Frais de déplacement participants */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Frais de déplacement (par participant)</span></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg-alt)', borderRadius: 6, borderLeft: '3px solid #F59E0B' }}>
                  Ces coûts sont multipliés par le nombre de participants. L&apos;hébergement est multiplié par le nombre de nuits, la restauration par le nombre de jours.
                </div>
                <div className="info-grid">
                  {mfield('Transport (&#x20ac;/pers.)', 'transport', modele, setModele, { min: 0, placeholder: '0', help: 'Train, avion, voiture… coût moyen aller-retour par personne' })}
                  {mfield('Nb nuits hébergement', 'nbNuits', modele, setModele, { min: 0, placeholder: '0', help: 'Nombre de nuits par participant' })}
                  {mfield('Hébergement (&#x20ac;/nuit/pers.)', 'hebergement', modele, setModele, { min: 0, placeholder: '0', help: 'Tarif hôtel moyen par nuit et par personne' })}
                  {mfield('Per diem restauration (&#x20ac;/jour/pers.)', 'restauration', modele, setModele, { min: 0, placeholder: '0', help: 'Remboursement repas journalier par participant (selon barème)' })}
                </div>
                {calc.coutDeplac > 0 && (
                  <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 8, fontWeight: 500 }}>
                    &#x2139;&#xFE0F; Sous-total déplacements participants = {euro(calc.coutDeplac)}
                  </div>
                )}
              </div>
            </div>

            {/* Coût du temps agents */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">&#x23F1;&#xFE0F; Coût du temps agent (coût opportunité)</span></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg-alt)', borderRadius: 6, borderLeft: '3px solid #8B5CF6' }}>
                  Valorisation du temps de travail mobilisé. Formule : coût salarial journalier chargé × nb jours × nb participants.
                </div>
                <div className="info-grid">
                  {mfield('Coût salarial journalier (&#x20ac;/jour/pers.)', 'coutSalarial', modele, setModele, { min: 0, placeholder: 'ex: 350', help: 'Salaire chargé moyen journalier (charges patronales incluses). Ex : 350 € pour un cadre hospitalier' })}
                </div>
                {calc.coutTemps > 0 && (
                  <div style={{ fontSize: 11, color: '#8B5CF6', marginTop: 8, fontWeight: 500 }}>
                    &#x2139;&#xFE0F; {modele.coutSalarial} €/j × {modele.nbJours} j × {modele.nbParticipants} pers. = {euro(calc.coutTemps)}
                  </div>
                )}
              </div>
            </div>

            {/* Frais administratifs & autres */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Frais administratifs &amp; autres</span></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg-alt)', borderRadius: 6, borderLeft: '3px solid #64748B' }}>
                  Frais de gestion interne, logistique ou toute dépense non catégorisée ci-dessus.
                </div>
                <div className="info-grid">
                  {mfield('Frais administratifs (&#x20ac; total)', 'fraisAdmin', modele, setModele, { min: 0, placeholder: '0', help: 'Coûts de secrétariat, gestion des dossiers, outils de suivi' })}
                  {mfield('Autres frais (&#x20ac; total)', 'autresFrais', modele, setModele, { min: 0, placeholder: '0', help: 'Toute autre dépense non couverte par les catégories précédentes' })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={saveModele}>✓ Sauvegarder le modèle</button>
              {savedMod && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Enregistré</span>}
            </div>
          </div>

          {/* Synthèse */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Synthèse du coût</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table style={{ width: '100%' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 16px', fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>Coûts pédagogiques</td>
                      <td style={{ padding: '8px 16px', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{euro(calc.coutPeda)}</td>
                    </tr>
                    {calc.pedaBase > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                        <td style={{ padding: '3px 16px 3px 28px', fontSize: 11, color: 'var(--text-muted)' }}>↳ Formation &amp; matériel</td>
                        <td style={{ padding: '3px 16px', fontSize: 11, textAlign: 'right', color: 'var(--text-muted)' }}>{euro(calc.pedaBase)}</td>
                      </tr>
                    )}
                    {calc.pedaInscrit > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                        <td style={{ padding: '3px 16px 3px 28px', fontSize: 11, color: 'var(--text-muted)' }}>↳ Inscription &amp; certification</td>
                        <td style={{ padding: '3px 16px', fontSize: 11, textAlign: 'right', color: 'var(--text-muted)' }}>{euro(calc.pedaInscrit)}</td>
                      </tr>
                    )}
                    {calc.coutFormateur > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 16px', fontSize: 12, color: '#10B981', fontWeight: 600 }}>Intervenants externes</td>
                        <td style={{ padding: '8px 16px', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{euro(calc.coutFormateur)}</td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 16px', fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Déplacements participants</td>
                      <td style={{ padding: '8px 16px', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{euro(calc.coutDeplac)}</td>
                    </tr>
                    {Number(modele.transport) > 0 && Number(modele.nbParticipants) > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                        <td style={{ padding: '3px 16px 3px 28px', fontSize: 11, color: 'var(--text-muted)' }}>↳ Transport</td>
                        <td style={{ padding: '3px 16px', fontSize: 11, textAlign: 'right', color: 'var(--text-muted)' }}>{euro(Number(modele.transport) * (Number(modele.nbParticipants) || 0))}</td>
                      </tr>
                    )}
                    {Number(modele.hebergement) > 0 && Number(modele.nbNuits) > 0 && Number(modele.nbParticipants) > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                        <td style={{ padding: '3px 16px 3px 28px', fontSize: 11, color: 'var(--text-muted)' }}>↳ Hébergement ({modele.nbNuits} nuit{Number(modele.nbNuits) > 1 ? 's' : ''})</td>
                        <td style={{ padding: '3px 16px', fontSize: 11, textAlign: 'right', color: 'var(--text-muted)' }}>{euro(Number(modele.hebergement) * (Number(modele.nbNuits) || 0) * (Number(modele.nbParticipants) || 0))}</td>
                      </tr>
                    )}
                    {Number(modele.restauration) > 0 && Number(modele.nbJours) > 0 && Number(modele.nbParticipants) > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                        <td style={{ padding: '3px 16px 3px 28px', fontSize: 11, color: 'var(--text-muted)' }}>↳ Restauration</td>
                        <td style={{ padding: '3px 16px', fontSize: 11, textAlign: 'right', color: 'var(--text-muted)' }}>{euro(Number(modele.restauration) * (Number(modele.nbJours) || 0) * (Number(modele.nbParticipants) || 0))}</td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 16px', fontSize: 12, color: '#8B5CF6', fontWeight: 600 }}>&#x23F1; Temps agents</td>
                      <td style={{ padding: '8px 16px', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{euro(calc.coutTemps)}</td>
                    </tr>
                    {(calc.coutAdmin > 0 || calc.coutAutres > 0) && (
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 16px', fontSize: 12, color: '#64748B', fontWeight: 600 }}>Admin &amp; autres</td>
                        <td style={{ padding: '8px 16px', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{euro(calc.coutAdmin + calc.coutAutres)}</td>
                      </tr>
                    )}
                    <tr style={{ background: 'var(--blue)', color: '#fff' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: 14 }}>TOTAL</td>
                      <td style={{ padding: '14px 16px', fontSize: 16, fontWeight: 800, textAlign: 'right' }}>{euro(calc.total)}</td>
                    </tr>
                    {Number(modele.nbParticipants) > 0 && (
                      <tr style={{ background: '#EFF6FF' }}>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--blue)' }}>Coût par participant</td>
                        <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'right', color: 'var(--blue)' }}>{euro(calc.parParticipant)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Répartition visuelle */}
            {calc.total > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><span className="card-title">Répartition</span></div>
                <div className="card-body">
                  {[
                    { label: 'Pédagogique',    value: calc.coutPeda,                    color: '#3B82F6' },
                    { label: 'Intervenants',         value: calc.coutFormateur,               color: '#10B981' },
                    { label: 'Déplacements',    value: calc.coutDeplac,                  color: '#F59E0B' },
                    { label: 'Temps agents',          value: calc.coutTemps,                   color: '#8B5CF6' },
                    { label: 'Admin &amp; autres',   value: calc.coutAdmin + calc.coutAutres, color: '#64748B' },
                  ].filter(r => r.value > 0).map(r => (
                    <div key={r.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span dangerouslySetInnerHTML={{ __html: r.label }} />
                        <span style={{ fontWeight: 600 }}>{Math.round(r.value / calc.total * 100)} %</span>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style={{ width: (r.value / calc.total * 100) + '%', background: r.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function mfield(label, key, state, setState, opts = {}) {
  return (
    <div className="info-field">
      <label className="info-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span dangerouslySetInnerHTML={{ __html: label }} />
        {opts.help && (
          <span title={opts.help} style={{ cursor: 'help', fontSize: 11, color: 'var(--text-muted)', userSelect: 'none' }}>&#x2139;&#xFE0F;</span>
        )}
      </label>
      <input
        type="number"
        className="info-field-input"
        value={state[key]}
        min={opts.min}
        step={opts.step || 1}
        placeholder={opts.placeholder || ''}
        onChange={e => setState(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );
}
