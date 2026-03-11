import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { formations } from '../data/mockData';
import { useFormationsMeta } from '../context/FormationsMetaContext';

const TABS = [
  { key: 'infos',         label: '&#x2139;&#xFE0F; Informations' },
  { key: 'inscriptions',  label: '&#x1F465; Inscriptions' },
  { key: 'documents',     label: '&#x1F4C2; Documents' },
  { key: 'modele',        label: '&#x1F4B0; Mod&#xe8;le &#xe9;conomique' },
];

const STATUTS_F = [
  { value: 'planifie',      label: 'Planifi&#xe9;',            color: '#64748B' },
  { value: 'inscriptions',  label: 'Inscriptions ouvertes',    color: '#10B981' },
  { value: 'en_cours',      label: 'En cours',                 color: '#F59E0B' },
  { value: 'termine',       label: 'Termin&#xe9;',             color: '#8B5CF6' },
  { value: 'annule',        label: 'Annul&#xe9;',              color: '#EF4444' },
];

const STATUTS_I = [
  { value: 'confirme',    label: 'Confirm&#xe9;',  color: '#10B981' },
  { value: 'en_attente',  label: 'En attente',      color: '#F59E0B' },
  { value: 'annule',      label: 'Annul&#xe9;',     color: '#EF4444' },
];

const EMPTY_MODELE = { nbParticipants: '', nbJours: '', fraisPeda: '', fraisMateriel: '', transport: '', nbNuits: '', hebergement: '', restauration: '', coutSalarial: '', autresFrais: '' };
const EMPTY_INSC   = { nom: '', service: '', email: '', statut: 'confirme' };

function calcModele(m) {
  const nb    = Number(m.nbParticipants) || 0;
  const jours = Number(m.nbJours)        || 0;
  const nuits = Number(m.nbNuits)        || 0;
  const coutPeda      = (Number(m.fraisPeda) || 0) + (Number(m.fraisMateriel) || 0);
  const coutDeplac    = ((Number(m.transport) || 0) + (Number(m.hebergement) || 0) * nuits + (Number(m.restauration) || 0) * jours) * nb;
  const coutTemps     = (Number(m.coutSalarial) || 0) * jours * nb;
  const coutAutres    = Number(m.autresFrais) || 0;
  const total         = coutPeda + coutDeplac + coutTemps + coutAutres;
  return { coutPeda, coutDeplac, coutTemps, coutAutres, total, parParticipant: nb > 0 ? total / nb : 0 };
}

function euro(n) { return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + '\u00a0\u20ac'; }

function StatutBadgeF({ value }) {
  const s = STATUTS_F.find(x => x.value === value) || STATUTS_F[0];
  return (
    <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.color + '22', color: s.color }}
      dangerouslySetInnerHTML={{ __html: s.label }} />
  );
}

function formatDateF(d) {
  if (!d) return '\u2014';
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
      const doc = { ...docBase, data: null, warning: 'Fichier > 1\u00a0Mo\u00a0: contenu non persist\u00e9' };
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
              {formation.responsablePedagogique && <span style={{ marginRight: 16 }}>&#x1F4DA; {formation.responsablePedagogique}</span>}
              {formation.contact && <span>&#x1F4DE; {formation.contact}</span>}
            </div>
            <div style={{ fontSize: 12, display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
              <span>&#x1F4C5; &#xc9;ch&#xe9;ance&#xa0;: {formatDateF(formation.dateEcheance)}</span>
              {formation.renouvellement && <span style={{ color: '#10B981', fontWeight: 600 }}>&#x2713; Renouvellement 2026&#x2013;2027</span>}
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
          <div className="card-header"><span className="card-title">&#x1F4CB; Statut &amp; Notes</span></div>
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
                placeholder="Informations compl&#xe9;mentaires, retours d&#x27;exp&#xe9;rience, prochaines &#xe9;tapes..."
                value={notes} onChange={e => setNotes(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={saveInfos}>&#x2713; Enregistrer</button>
              {savedInfo && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>&#x2713; Enregistr&#xe9;</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Inscriptions ── */}
      {tab === 'inscriptions' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="kpi-mini" style={{ background: '#D1FAE5', color: '#065F46' }}><span style={{ fontSize: 22, fontWeight: 800 }}>{nbConf}</span><span style={{ fontSize: 11 }}>Confirm&#xe9;(s)</span></div>
            <div className="kpi-mini" style={{ background: '#FEF3C7', color: '#92400E' }}><span style={{ fontSize: 22, fontWeight: 800 }}>{nbAttente}</span><span style={{ fontSize: 11 }}>En attente</span></div>
            <div className="kpi-mini" style={{ background: '#EFF6FF', color: '#1e40af' }}><span style={{ fontSize: 22, fontWeight: 800 }}>{inscriptions.length}</span><span style={{ fontSize: 11 }}>Total inscrits</span></div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">&#x1F465; Liste des participants</span>
              <button className="btn btn-primary btn-sm" onClick={() => setAddingInsc(v => !v)}>
                {addingInsc ? 'Annuler' : '+ Ajouter un participant'}
              </button>
            </div>
            <div className="card-body">
              {addingInsc && (
                <form onSubmit={handleAddInsc} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="info-field" style={{ flex: '1 1 180px' }}>
                    <label className="info-field-label">Nom Pr&#xe9;nom *</label>
                    <input type="text" className="info-field-input" required value={newInsc.nom} placeholder="Dr Dupont Marie" onChange={e => setNewInsc(f => ({ ...f, nom: e.target.value }))} />
                  </div>
                  <div className="info-field" style={{ flex: '1 1 160px' }}>
                    <label className="info-field-label">Service</label>
                    <input type="text" className="info-field-input" value={newInsc.service} placeholder="Radioth&#xe9;rapie" onChange={e => setNewInsc(f => ({ ...f, service: e.target.value }))} />
                  </div>
                  <div className="info-field" style={{ flex: '1 1 140px' }}>
                    <label className="info-field-label">Statut</label>
                    <select className="info-field-input" value={newInsc.statut} onChange={e => setNewInsc(f => ({ ...f, statut: e.target.value }))}>
                      {STATUTS_I.map(s => <option key={s.value} value={s.value}>{s.label.replace(/&#[^;]+;/g, c => { const m={'&#xe9;':'é','&#x9;':'\t'}; return m[c]||c; })}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Ajouter</button>
                </form>
              )}
              {inscriptions.length === 0
                ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon">&#x1F465;</div><div className="empty-sub">Aucun participant inscrit</div></div>
                : (
                  <table>
                    <thead><tr><th>Participant</th><th>Service</th><th>Date inscription</th><th>Statut</th><th></th></tr></thead>
                    <tbody>
                      {inscriptions.map(i => {
                        const s = STATUTS_I.find(x => x.value === i.statut) || STATUTS_I[0];
                        return (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>{i.nom}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.service || '\u2014'}</td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.dateInscription || '\u2014'}</td>
                            <td>
                              <select style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '1px solid ' + s.color, color: s.color, background: s.color + '22', cursor: 'pointer' }}
                                value={i.statut} onChange={e => updateInscription(id, i.id, { statut: e.target.value })}>
                                {STATUTS_I.map(x => <option key={x.value} value={x.value}>{x.label.replace(/&#[^;]+;/g,'')}</option>)}
                              </select>
                            </td>
                            <td><button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => removeInscription(id, i.id)}>&#x2715;</button></td>
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
          <div className="card-header"><span className="card-title">&#x1F4C2; Documents attach&#xe9;s</span></div>
          <div className="card-body">
            <div
              style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: 'var(--bg-alt)', transition: 'border-color .2s' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); [...e.dataTransfer.files].forEach(handleFileUpload); }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F4C4;</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>D&#xe9;poser un fichier ici ou cliquer pour s&#xe9;lectionner</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Fichiers &lt; 1&#xa0;Mo stock&#xe9;s dans le navigateur &bull; Formats accept&#xe9;s&#xa0;: PDF, Word, Excel, images</div>
            </div>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { [...e.target.files].forEach(handleFileUpload); e.target.value = ''; }} />

            {docs.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>Aucun document attach&#xe9;</div>
              : (
                <table>
                  <thead><tr><th>Nom du fichier</th><th>Type</th><th>Taille</th><th>Date</th><th>Disponibilit&#xe9;</th><th></th></tr></thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{d.nom}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.type || '\u2014'}</td>
                        <td style={{ fontSize: 11, fontFamily: 'DM Mono,monospace' }}>{d.taille > 1024*1024 ? (d.taille/1024/1024).toFixed(1)+' Mo' : Math.round(d.taille/1024)+' Ko'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.date}</td>
                        <td>
                          {d.data
                            ? <a href={d.data} download={d.nom} className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>&#x2B07; T&#xe9;l&#xe9;charger</a>
                            : <span style={{ fontSize: 11, color: '#F59E0B' }}>&#x26A0; Non persist&#xe9;</span>
                          }
                        </td>
                        <td><button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => handleRemoveDoc(d.id)}>&#x2715;</button></td>
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
              <div className="card-header"><span className="card-title">&#x2699;&#xFE0F; Param&#xe8;tres g&#xe9;n&#xe9;raux</span></div>
              <div className="card-body">
                <div className="info-grid">
                  {mfield('Nombre de participants', 'nbParticipants', modele, setModele, { min: 0, placeholder: '0' })}
                  {mfield('Dur&#xe9;e (jours)', 'nbJours', modele, setModele, { min: 0, step: 0.5, placeholder: '1' })}
                </div>
              </div>
            </div>

            {/* Coûts pédagogiques */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">&#x1F4DA; Co&#xfb;ts p&#xe9;dagogiques</span></div>
              <div className="card-body">
                <div className="info-grid">
                  {mfield('Frais p&#xe9;dagogiques (&#x20ac; total)', 'fraisPeda', modele, setModele, { min: 0, placeholder: '0' })}
                  {mfield('Mat&#xe9;riel / documentation (&#x20ac;)', 'fraisMateriel', modele, setModele, { min: 0, placeholder: '0' })}
                </div>
              </div>
            </div>

            {/* Frais de déplacement */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">&#x1F686; Frais de d&#xe9;placement (par participant)</span></div>
              <div className="card-body">
                <div className="info-grid">
                  {mfield('Transport (&#x20ac;/pers.)', 'transport', modele, setModele, { min: 0, placeholder: '0' })}
                  {mfield('Nb nuits h&#xe9;bergement', 'nbNuits', modele, setModele, { min: 0, placeholder: '0' })}
                  {mfield('H&#xe9;bergement (&#x20ac;/nuit/pers.)', 'hebergement', modele, setModele, { min: 0, placeholder: '0' })}
                  {mfield('Per diem restauration (&#x20ac;/jour/pers.)', 'restauration', modele, setModele, { min: 0, placeholder: '0' })}
                </div>
              </div>
            </div>

            {/* Coût du temps */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">&#x23F1;&#xFE0F; Co&#xfb;t du temps agent (co&#xfb;t opportunit&#xe9;)</span></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Co&#xfb;t salarial journalier moyen charg&#xe9; &#xd7; nb jours &#xd7; nb participants</div>
                <div className="info-grid">
                  {mfield('Co&#xfb;t salarial journalier (&#x20ac;/jour/pers.)', 'coutSalarial', modele, setModele, { min: 0, placeholder: 'ex: 350' })}
                  {mfield('Autres frais (&#x20ac; total)', 'autresFrais', modele, setModele, { min: 0, placeholder: '0' })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={saveModele}>&#x2713; Sauvegarder le mod&#xe8;le</button>
              {savedMod && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>&#x2713; Enregistr&#xe9;</span>}
            </div>
          </div>

          {/* Synthèse */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">&#x1F4CA; Synth&#xe8;se du co&#xfb;t</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table style={{ width: '100%' }}>
                  <tbody>
                    {[
                      { label: 'Co\u00fbts p\u00e9dagogiques',    value: calc.coutPeda,   color: '#3B82F6' },
                      { label: 'Frais de d\u00e9placement',        value: calc.coutDeplac, color: '#F59E0B' },
                      { label: 'Co\u00fbt du temps agents',        value: calc.coutTemps,  color: '#8B5CF6' },
                      { label: 'Autres frais',                      value: calc.coutAutres, color: '#64748B' },
                    ].map(r => (
                      <tr key={r.label} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: r.color, fontWeight: 500 }}>{r.label}</td>
                        <td style={{ padding: '10px 16px', fontSize: 13, fontFamily: 'DM Mono,monospace', textAlign: 'right', fontWeight: 600 }}>{euro(r.value)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--blue)', color: '#fff', borderRadius: '0 0 8px 8px' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: 14 }}>TOTAL</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'DM Mono,monospace', fontSize: 16, fontWeight: 800, textAlign: 'right' }}>{euro(calc.total)}</td>
                    </tr>
                    {(Number(modele.nbParticipants) > 0) && (
                      <tr style={{ background: '#EFF6FF' }}>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--blue)' }}>Co&#xfb;t par participant</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 700, textAlign: 'right', color: 'var(--blue)' }}>{euro(calc.parParticipant)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Répartition visuelle */}
            {calc.total > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><span className="card-title">R&#xe9;partition</span></div>
                <div className="card-body">
                  {[
                    { label: 'P&#xe9;dagogique', value: calc.coutPeda,   color: '#3B82F6' },
                    { label: 'D&#xe9;placement', value: calc.coutDeplac, color: '#F59E0B' },
                    { label: 'Temps agents',    value: calc.coutTemps,  color: '#8B5CF6' },
                    { label: 'Autres',          value: calc.coutAutres, color: '#64748B' },
                  ].filter(r => r.value > 0).map(r => (
                    <div key={r.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span dangerouslySetInnerHTML={{ __html: r.label }} />
                        <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>{Math.round(r.value / calc.total * 100)}&#xa0;%</span>
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
      <label className="info-field-label" dangerouslySetInnerHTML={{ __html: label }} />
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
