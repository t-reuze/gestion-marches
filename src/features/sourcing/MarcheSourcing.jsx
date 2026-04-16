import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import { marches, clccs, STATUT_CONFIG } from '../../data/mockData';
import { clccContacts as CLCC_CONTACTS_DATA } from '../../data/clccContacts';
import { useMarcheMeta } from '../../context/MarcheMetaContext';
import { useSourcingTemplates } from '../../context/SourcingTemplatesContext';
import SourcingTemplatePicker from './SourcingTemplatePicker';
import SourcingCriteresEditor from './SourcingCriteresEditor';
import SourcingFournisseurCR from './SourcingFournisseurCR';
import WorkflowStepToggle from '../../components/WorkflowStepToggle';

const STATUTS_SHORTLIST = [
  { key: 'a-contacter', label: 'À contacter',    color: '#64748B' },
  { key: 'contacte',    label: 'Contacté',       color: '#3B82F6' },
  { key: 'rdv',         label: 'RDV pris',       color: '#F59E0B' },
  { key: 'offre',       label: 'Offre reçue',    color: '#10B981' },
  { key: 'ecarte',      label: 'Écarté',         color: '#EF4444' },
];

function statutMeta(key) {
  return STATUTS_SHORTLIST.find(s => s.key === key) || STATUTS_SHORTLIST[0];
}

const EMPTY = { nom: '', contact: '', email: '', telephone: '', statut: 'a-contacter', prixIndicatif: '', tags: '', notes: '' };

function initials(nom) {
  return (nom || '').split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function MarcheSourcing() {
  const { id } = useParams();
  const { getMeta, setMeta, getAllMeta } = useMarcheMeta();
  const { getTemplate } = useSourcingTemplates();
  const marche = marches.find(m => m.id === id);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterStatut, setFilterStatut] = useState('tous');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSource, setPickerSource] = useState('tous');

  const [criteresOpen, setCriteresOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState(null);

  if (!marche) return (
    <Layout title="Marché introuvable">
      <div className="empty-state"><div className="empty-title">Marché introuvable</div></div>
    </Layout>
  );

  const meta = getMeta(id);
  const shortlist = meta.sourcingShortlist || [];
  const allMeta = getAllMeta ? getAllMeta() : {};

  // Template actuel : soit critères locaux personnalisés, soit chargés depuis un template
  const localSections = meta.sourcingCriteres || null;
  const sourcingTemplateId = meta.sourcingTemplateId || null;
  const needsTemplate = !localSections && !sourcingTemplateId;
  const currentTemplate = sourcingTemplateId ? getTemplate(sourcingTemplateId) : null;
  const currentSections = localSections || (currentTemplate && currentTemplate.sections) || [];

  function chooseTemplate(tpl) {
    setMeta(id, {
      sourcingTemplateId: tpl.id,
      sourcingTemplateNom: tpl.nom,
      sourcingCriteres: tpl.sections,
    });
    setTemplatePickerOpen(false);
  }

  function updateSections(nextSections) {
    setMeta(id, { sourcingCriteres: nextSections });
  }

  const sourcingCRs = meta.sourcingCRs || {};
  function saveCR(fournisseurId, cr) {
    setMeta(id, { sourcingCRs: { ...sourcingCRs, [fournisseurId]: cr } });
  }
  function crStats(fournisseurId) {
    const cr = sourcingCRs[fournisseurId];
    if (!cr) return { has: false, filled: 0, total: 0 };
    const all = (currentSections || []).flatMap(s => s.criteres || []);
    const filled = all.filter(c => (cr.valeurs?.[c.id] || '').trim()).length;
    return { has: true, filled, total: all.length, updatedAt: cr.updatedAt };
  }

  // Annuaire agrégé (mêmes sources que le picker d'interlocuteurs)
  const annuaireContacts = useMemo(() => {
    const out = [];
    for (const c of clccs) {
      const imported = CLCC_CONTACTS_DATA[c.id] || {};
      Object.entries(imported).forEach(([fonction, list]) => {
        list.forEach(ct => {
          out.push({
            key: 'u-imp-' + c.id + '-' + fonction + '-' + (ct.nom || '') + (ct.prenom || ''),
            source: 'unicancer',
            origine: c.nom,
            nom: [ct.prenom, ct.nom].filter(Boolean).join(' ') || ct.nom || '',
            role: fonction,
            email: ct.email || '',
            telephone: ct.telephone || '',
          });
        });
      });
      const m2 = allMeta['clcc-' + c.id] || {};
      (m2.contacts || []).forEach(ct => {
        out.push({
          key: 'u-man-' + c.id + '-' + (ct.id || ct.nom),
          source: 'unicancer',
          origine: c.nom,
          nom: ct.nom || '',
          role: ct.fonction || '',
          email: ct.email || '',
          telephone: ct.telephone || '',
        });
      });
    }
    const seenF = new Set();
    for (const m2 of marches) {
      const mt = allMeta[m2.id] || {};
      (mt.fournisseurs || []).forEach(f => {
        (f.contacts || []).forEach(ct => {
          const k = (f.nom || '') + '|' + (ct.mail || '') + '|' + (ct.nom || '') + '|' + (ct.prenom || '');
          if (seenF.has(k)) return;
          seenF.add(k);
          out.push({
            key: 'f-' + k,
            source: 'fournisseurs',
            origine: f.nom || '—',
            nom: [ct.prenom, ct.nom].filter(Boolean).join(' ') || ct.nom || '',
            role: ct.fonction || '',
            email: ct.mail || '',
            telephone: ct.tel || '',
          });
        });
      });
    }
    return out;
  }, [allMeta]);

  const pickerResults = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return annuaireContacts.filter(c => {
      if (pickerSource !== 'tous' && c.source !== pickerSource) return false;
      if (!q) return true;
      return (c.nom || '').toLowerCase().includes(q)
        || (c.role || '').toLowerCase().includes(q)
        || (c.email || '').toLowerCase().includes(q)
        || (c.origine || '').toLowerCase().includes(q);
    }).slice(0, 100);
  }, [annuaireContacts, pickerSearch, pickerSource]);

  const filtered = filterStatut === 'tous' ? shortlist : shortlist.filter(s => s.statut === filterStatut);
  const counts = STATUTS_SHORTLIST.reduce((acc, s) => {
    acc[s.key] = shortlist.filter(x => x.statut === s.key).length;
    return acc;
  }, {});

  function save(list) { setMeta(id, { sourcingShortlist: list }); }

  function startAdd() { setForm(EMPTY); setAdding(true); setEditingId(null); }
  function startEdit(item) {
    setForm({
      nom: item.nom || '', contact: item.contact || '', email: item.email || '',
      telephone: item.telephone || '', statut: item.statut || 'a-contacter',
      prixIndicatif: item.prixIndicatif || '', tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setAdding(false);
  }

  function commit(base) {
    if (!form.nom.trim()) return;
    const entry = {
      ...base,
      nom: form.nom.trim(),
      contact: form.contact,
      email: form.email,
      telephone: form.telephone,
      statut: form.statut,
      prixIndicatif: form.prixIndicatif,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      notes: form.notes,
      updatedAt: new Date().toISOString(),
    };
    if (editingId) {
      save(shortlist.map(s => s.id === editingId ? entry : s));
      setEditingId(null);
    } else {
      save([...shortlist, entry]);
      setAdding(false);
    }
    setForm(EMPTY);
  }

  function remove(itemId) {
    if (!window.confirm('Retirer ce fournisseur de la shortlist ?')) return;
    save(shortlist.filter(s => s.id !== itemId));
  }

  function setStatut(itemId, newStatut) {
    save(shortlist.map(s => s.id === itemId ? { ...s, statut: newStatut, updatedAt: new Date().toISOString() } : s));
  }

  function addFromAnnuaire(c) {
    const exists = shortlist.some(s =>
      (s.email && c.email && s.email.toLowerCase() === c.email.toLowerCase())
      || s.nom.toLowerCase() === (c.origine || '').toLowerCase()
    );
    if (exists && !window.confirm(c.origine + ' est déjà dans la shortlist. L\'ajouter quand même ?')) return;
    save([...shortlist, {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      nom: c.origine || c.nom,
      contact: c.nom,
      email: c.email,
      telephone: c.telephone,
      statut: 'a-contacter',
      prixIndicatif: '',
      tags: [],
      notes: 'Ajouté depuis l\'annuaire (' + (c.source === 'fournisseurs' ? 'Fournisseur' : 'Unicancer') + ')',
      updatedAt: new Date().toISOString(),
    }]);
    setPickerOpen(false);
  }

  const title = marche.reference + ' — ' + marche.nom;
  const statutBadge = STATUT_CONFIG[marche.statut] || {};

  // Vue détail : CR fournisseur
  const selectedFournisseur = selectedFournisseurId ? shortlist.find(s => s.id === selectedFournisseurId) : null;
  if (selectedFournisseur) {
    return (
      <Layout title={title} sub={'— Sourcing · CR ' + selectedFournisseur.nom}>
        <MarcheNavTabs />
        <SourcingFournisseurCR
          fournisseur={selectedFournisseur}
          sections={currentSections}
          cr={sourcingCRs[selectedFournisseur.id]}
          onSave={cr => saveCR(selectedFournisseur.id, cr)}
          onBack={() => setSelectedFournisseurId(null)}
        />
      </Layout>
    );
  }

  return (
    <Layout title={title} sub="— Sourcing">
      <MarcheNavTabs />

      <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #0EA5E9' }}>
        <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: 28 }}>🔎</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Phase de sourcing</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Identifier les fournisseurs potentiels, collecter les infos amont (RDV, prix indicatifs, CR de réunion) avant publication du DCE.
            </div>
          </div>
          {statutBadge.label && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
              color: statutBadge.color, background: statutBadge.bg,
            }}>{statutBadge.label}</span>
          )}
          <WorkflowStepToggle marcheId={id} stepKey="sourcing" />
        </div>
      </div>

      {needsTemplate ? (
        <div className="card" style={{ marginBottom: 20, border: '1.5px dashed #0EA5E9', background: '#F0F9FF' }}>
          <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 24 }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Choisir un template de critères</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Le template définit les sections et critères utilisés dans les CR de réunion et le tableau comparatif. Tu pourras le personnaliser ensuite.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setTemplatePickerOpen(true)}>
              Choisir un template
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '8px 12px', background: '#F0F9FF', borderRadius: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Template actif :</span>
          <strong>{meta.sourcingTemplateNom || currentTemplate?.nom || 'Personnalisé'}</strong>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--text-muted)' }}>
            {currentSections.length} section{currentSections.length > 1 ? 's' : ''}, {currentSections.reduce((s, sec) => s + (sec.criteres || []).length, 0)} critères
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => setCriteresOpen(true)}>
              ⚙️ Critères
            </button>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => setTemplatePickerOpen(true)}>
              Changer de template
            </button>
          </div>
        </div>
      )}

      {templatePickerOpen && (
        <SourcingTemplatePicker
          onPick={chooseTemplate}
          onClose={() => setTemplatePickerOpen(false)}
        />
      )}

      {criteresOpen && (
        <SourcingCriteresEditor
          sections={currentSections}
          templateNom={meta.sourcingTemplateNom || currentTemplate?.nom || 'Personnalisé'}
          onSave={nextSections => { updateSections(nextSections); setCriteresOpen(false); }}
          onClose={() => setCriteresOpen(false)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>
          Shortlist fournisseurs
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
            ({shortlist.length})
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setPickerOpen(true); setPickerSearch(''); setPickerSource('tous'); }}>
            🔍 Depuis l'annuaire
          </button>
          <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Ajouter</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={'btn btn-sm ' + (filterStatut === 'tous' ? 'btn-primary' : 'btn-outline')}
          style={{ fontSize: 11 }}
          onClick={() => setFilterStatut('tous')}
        >Tous ({shortlist.length})</button>
        {STATUTS_SHORTLIST.map(s => (
          <button
            key={s.key}
            className={'btn btn-sm ' + (filterStatut === s.key ? 'btn-primary' : 'btn-outline')}
            style={{ fontSize: 11, borderColor: filterStatut === s.key ? s.color : undefined, background: filterStatut === s.key ? s.color : undefined }}
            onClick={() => setFilterStatut(s.key)}
          >{s.label} ({counts[s.key] || 0})</button>
        ))}
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 16, border: '1.5px solid #0EA5E9' }}>
          <div className="card-header"><span className="card-title">Nouveau fournisseur pressenti</span></div>
          <div className="card-body">
            <SourcingForm form={form} setForm={setForm} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => commit({ id: Date.now().toString() + Math.random().toString(36).slice(2, 6), tags: [] })}>✓ Ajouter</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setAdding(false); setForm(EMPTY); }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {shortlist.length === 0 && !adding ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="empty-icon">🔎</div>
          <div className="empty-title">Aucun fournisseur dans la shortlist</div>
          <div className="empty-sub">Commence par identifier les fournisseurs potentiels pour ce marché.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setPickerOpen(true); setPickerSearch(''); setPickerSource('tous'); }}>🔍 Depuis l'annuaire</button>
            <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Ajouter manuellement</button>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Contact</th>
                <th>Statut</th>
                <th>Prix indicatif</th>
                <th>Tags</th>
                <th>Dernière MAJ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isEditing = editingId === item.id;
                const sm = statutMeta(item.statut);
                return (
                  <>
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', background: sm.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0,
                          }}>{initials(item.nom)}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12 }}>{item.nom}</div>
                            {item.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {item.contact && <div style={{ fontWeight: 600 }}>{item.contact}</div>}
                        {item.email && <div><a href={'mailto:' + item.email} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{item.email}</a></div>}
                        {item.telephone && <div style={{ color: 'var(--text-muted)' }}>{item.telephone}</div>}
                        {!item.contact && !item.email && !item.telephone && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <select
                          value={item.statut}
                          onChange={e => setStatut(item.id, e.target.value)}
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                            border: '1px solid ' + sm.color, color: sm.color, background: '#fff',
                          }}
                        >
                          {STATUTS_SHORTLIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{item.prixIndicatif || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td>
                        {Array.isArray(item.tags) && item.tags.length > 0 ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {item.tags.map((t, i) => (
                              <span key={i} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-muted)' }}>{t}</span>
                            ))}
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(() => {
                            const cs = crStats(item.id);
                            return (
                              <button
                                className={'btn btn-sm ' + (cs.has ? 'btn-primary' : 'btn-outline')}
                                style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                                title={cs.has ? cs.filled + '/' + cs.total + ' critères renseignés' : 'Créer le CR de réunion'}
                                onClick={() => setSelectedFournisseurId(item.id)}
                              >📋 CR{cs.has ? ' ' + cs.filled + '/' + cs.total : ''}</button>
                            );
                          })()}
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => startEdit(item)}>✏️</button>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => remove(item.id)}>✗</button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr key={item.id + '-edit'}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ padding: 16, background: 'var(--surface-subtle, #f8fafc)', borderTop: '1px solid var(--border)' }}>
                            <SourcingForm form={form} setForm={setForm} />
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                              <button className="btn btn-primary btn-sm" onClick={() => commit(item)}>✓ Sauvegarder</button>
                              <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Annuler</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pickerOpen && (
        <div
          onClick={() => setPickerOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 8, width: 'min(720px, 92vw)',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Ajouter depuis l'annuaire</div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 14 }} onClick={() => setPickerOpen(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text" autoFocus className="filter-input"
                placeholder="Rechercher : fournisseur, contact, email..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                style={{ flex: 1, minWidth: 220 }}
              />
              <select
                className="info-field-input" value={pickerSource}
                onChange={e => setPickerSource(e.target.value)}
                style={{ width: 'auto', height: 36, fontSize: 13 }}
              >
                <option value="tous">Toutes sources</option>
                <option value="unicancer">Contacts Unicancer</option>
                <option value="fournisseurs">Contacts Fournisseurs</option>
              </select>
            </div>
            <div style={{ padding: '6px 18px', fontSize: 11, color: 'var(--text-muted)' }}>
              {pickerResults.length} résultat{pickerResults.length > 1 ? 's' : ''} sur {annuaireContacts.length}
            </div>
            <div style={{ overflowY: 'auto', padding: '4px 12px 12px' }}>
              {pickerResults.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Aucun contact trouvé.
                </div>
              ) : pickerResults.map(c => (
                <div
                  key={c.key}
                  onClick={() => addFromAnnuaire(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                    borderRadius: 6, cursor: 'pointer', borderLeft: '3px solid ' + (c.source === 'fournisseurs' ? '#8B5CF6' : '#1A4FA8'),
                    marginBottom: 4, background: 'var(--surface-subtle, #f8fafc)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-subtle, #f8fafc)'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.origine}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.nom}{c.role ? ' · ' + c.role : ''}{c.email ? ' · ' + c.email : ''}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                    background: c.source === 'fournisseurs' ? '#ede9fe' : '#dbeafe',
                    color: c.source === 'fournisseurs' ? '#6d28d9' : '#1e40af',
                  }}>{c.source === 'fournisseurs' ? 'Fournisseur' : 'Unicancer'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function SourcingForm({ form, setForm }) {
  return (
    <div className="info-grid">
      <div className="info-field">
        <label className="info-field-label">Fournisseur *</label>
        <input className="info-field-input" type="text" value={form.nom} placeholder="Ex: Siemens Healthineers" onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Statut</label>
        <select className="info-field-input" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
          {STATUTS_SHORTLIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div className="info-field">
        <label className="info-field-label">Contact (nom prénom)</label>
        <input className="info-field-input" type="text" value={form.contact} placeholder="M. Dupont" onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Email</label>
        <input className="info-field-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Téléphone</label>
        <input className="info-field-input" type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Prix indicatif</label>
        <input className="info-field-input" type="text" value={form.prixIndicatif} placeholder="Ex: 850 000 €" onChange={e => setForm(f => ({ ...f, prixIndicatif: e.target.value }))} />
      </div>
      <div className="info-field" style={{ gridColumn: '1 / -1' }}>
        <label className="info-field-label">Tags (séparés par des virgules)</label>
        <input className="info-field-input" type="text" value={form.tags} placeholder="Ex: IRM, 1.5T, installé base Nantes" onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
      </div>
      <div className="info-field" style={{ gridColumn: '1 / -1' }}>
        <label className="info-field-label">Notes / commentaires</label>
        <textarea className="info-field-input" rows={3} value={form.notes} placeholder="Premières impressions, points à creuser, objections..." onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </div>
  );
}
