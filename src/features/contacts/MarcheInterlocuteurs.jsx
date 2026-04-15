import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import { marches, clccs } from '../../data/mockData';
import { clccContacts as CLCC_CONTACTS_DATA } from '../../data/clccContacts';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

const ROLE_COLORS = {
  'Référent marché': '#1A4FA8',
  'Acheteur': '#10B981',
  'Expert technique': '#8B5CF6',
  'Directeur': '#F59E0B',
  'Juriste': '#EF4444',
  'Finance': '#0891B2',
  'Autre': '#64748B',
};

const EMPTY_FORM = { nom: '', role: 'Référent marché', service: '', email: '', telephone: '' };

function initials(nom) {
  return nom.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function ContactForm({ form, setForm }) {
  const roles = ['Référent marché', 'Acheteur', 'Expert technique', 'Directeur', 'Juriste', 'Finance', 'Autre'];
  return (
    <div className="info-grid">
      <div className="info-field">
        <label className="info-field-label">Nom Prénom *</label>
        <input className="info-field-input" type="text" value={form.nom} placeholder="Dr Dupont Marie" onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Rôle</label>
        <select className="info-field-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="info-field">
        <label className="info-field-label">Service</label>
        <input className="info-field-input" type="text" value={form.service} placeholder="Direction achats" onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Email</label>
        <input className="info-field-input" type="email" value={form.email} placeholder="contact@unicancer.fr" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Téléphone</label>
        <input className="info-field-input" type="tel" value={form.telephone} placeholder="+33 1 23 45 67 89" onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
      </div>
    </div>
  );
}

export default function MarcheInterlocuteurs() {
  const { id } = useParams();
  const { getMeta, setMeta, getAllMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSource, setPickerSource] = useState('tous'); // 'tous' | 'unicancer' | 'fournisseurs'

  const allMeta = getAllMeta ? getAllMeta() : {};

  // Aggregate all known contacts across the app
  const annuaireContacts = useMemo(() => {
    const out = [];
    // Unicancer (CLCC) — imported + manual
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
            service: '',
            email: ct.email || '',
            telephone: ct.telephone || '',
          });
        });
      });
      const meta = allMeta['clcc-' + c.id] || {};
      const hidden = new Set(meta.hiddenImports || []);
      const overrides = meta.overrides || {};
      // Apply overrides/hidden on imported entries
      for (let i = out.length - 1; i >= 0 && out[i].source === 'unicancer' && out[i].origine === c.nom; i--) {
        const k = out[i].key;
        if (hidden.has(k)) { out.splice(i, 1); continue; }
        if (overrides[k]) Object.assign(out[i], overrides[k]);
      }
      (meta.contacts || []).forEach(ct => {
        out.push({
          key: 'u-man-' + c.id + '-' + (ct.id || ct.nom),
          source: 'unicancer',
          origine: c.nom,
          nom: ct.nom || '',
          role: ct.fonction || 'Autre',
          service: ct.service || '',
          email: ct.email || '',
          telephone: ct.telephone || '',
        });
      });
    }
    // Fournisseurs — depuis annuaires des marchés
    const seenF = new Set();
    for (const m of marches) {
      const meta = allMeta[m.id] || {};
      (meta.fournisseurs || []).forEach(f => {
        (f.contacts || []).forEach(ct => {
          const k = (f.nom || '') + '|' + (ct.mail || '') + '|' + (ct.nom || '') + '|' + (ct.prenom || '');
          if (seenF.has(k)) return;
          seenF.add(k);
          out.push({
            key: 'f-' + k,
            source: 'fournisseurs',
            origine: f.nom || '—',
            nom: [ct.prenom, ct.nom].filter(Boolean).join(' ') || ct.nom || '',
            role: ct.fonction || 'Autre',
            service: '',
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
        || (c.service || '').toLowerCase().includes(q)
        || (c.origine || '').toLowerCase().includes(q);
    }).slice(0, 100);
  }, [annuaireContacts, pickerSearch, pickerSource]);

  if (!marche) return (
    <Layout title="Marché introuvable">
      <div className="empty-state"><div className="empty-title">Marché introuvable</div></div>
    </Layout>
  );

  const meta = getMeta(id);
  const interlocuteurs = meta.interlocuteurs || [];

  function startAdd() { setForm(EMPTY_FORM); setAdding(true); setEditingId(null); }

  function startEdit(il) {
    setForm({ nom: il.nom, role: il.role, service: il.service || '', email: il.email || '', telephone: il.telephone || '' });
    setEditingId(il.id);
    setAdding(false);
  }

  function saveAdd() {
    if (!form.nom.trim()) return;
    setMeta(id, { interlocuteurs: [...interlocuteurs, { ...form, id: Date.now().toString() }] });
    setAdding(false);
    setForm(EMPTY_FORM);
  }

  function saveEdit() {
    if (!form.nom.trim()) return;
    setMeta(id, { interlocuteurs: interlocuteurs.map(il => il.id === editingId ? { ...il, ...form } : il) });
    setEditingId(null);
  }

  function pickFromAnnuaire(c) {
    // Eviter doublons : même email ou même nom + role
    const exists = interlocuteurs.some(il =>
      (il.email && c.email && il.email.toLowerCase() === c.email.toLowerCase())
      || (il.nom === c.nom && il.role === c.role)
    );
    if (exists) {
      if (!window.confirm(c.nom + ' est déjà dans les interlocuteurs. L\'ajouter quand même ?')) return;
    }
    setMeta(id, {
      interlocuteurs: [...interlocuteurs, {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        nom: c.nom,
        role: c.role || 'Autre',
        service: c.service || c.origine || '',
        email: c.email || '',
        telephone: c.telephone || '',
      }],
    });
  }

  function remove(ilId) {
    if (!window.confirm('Supprimer cet interlocuteur ?')) return;
    setMeta(id, { interlocuteurs: interlocuteurs.filter(il => il.id !== ilId) });
  }

  const title = marche.reference + ' — ' + marche.nom;

  return (
    <Layout title={title} sub="— Interlocuteurs">
      <MarcheNavTabs />

      {marche.responsable && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--blue)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
            }}>
              {initials(marche.responsable)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{marche.responsable}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Référent principal · <em>Données statiques</em>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>Interlocuteurs supplémentaires</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setPickerOpen(true); setPickerSearch(''); setPickerSource('tous'); }}>
            🔍 Choisir dans l'annuaire
          </button>
          <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Ajouter</button>
        </div>
      </div>

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
                type="text"
                autoFocus
                className="filter-input"
                placeholder="Rechercher : nom, rôle, email, service, centre..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                style={{ flex: 1, minWidth: 220 }}
              />
              <select
                className="info-field-input"
                value={pickerSource}
                onChange={e => setPickerSource(e.target.value)}
                style={{ width: 'auto', height: 36, fontSize: 13 }}
              >
                <option value="tous">Toutes sources</option>
                <option value="unicancer">Contacts Unicancer</option>
                <option value="fournisseurs">Contacts Fournisseurs</option>
              </select>
            </div>
            <div style={{ padding: '6px 18px', fontSize: 11, color: 'var(--text-muted)' }}>
              {pickerResults.length} résultat{pickerResults.length > 1 ? 's' : ''}{annuaireContacts.length > pickerResults.length ? ' affichés' : ''} sur {annuaireContacts.length}
            </div>
            <div style={{ overflowY: 'auto', padding: '4px 12px 12px' }}>
              {pickerResults.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Aucun contact trouvé.
                </div>
              ) : pickerResults.map(c => {
                const color = ROLE_COLORS[c.role] || (c.source === 'fournisseurs' ? '#8B5CF6' : '#64748B');
                return (
                  <div
                    key={c.key}
                    onClick={() => { pickFromAnnuaire(c); setPickerOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                      borderRadius: 6, cursor: 'pointer', borderLeft: '3px solid ' + color,
                      marginBottom: 4, background: 'var(--surface-subtle, #f8fafc)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-subtle, #f8fafc)'; }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0,
                    }}>{initials(c.nom)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.nom || '—'}</div>
                      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{c.role || 'Autre'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {c.origine}{c.email ? ' · ' + c.email : ''}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                      background: c.source === 'fournisseurs' ? '#ede9fe' : '#dbeafe',
                      color: c.source === 'fournisseurs' ? '#6d28d9' : '#1e40af',
                    }}>{c.source === 'fournisseurs' ? 'Fournisseur' : 'Unicancer'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--blue)' }}>
          <div className="card-header"><span className="card-title">Nouvel interlocuteur</span></div>
          <div className="card-body">
            <ContactForm form={form} setForm={setForm} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={saveAdd}>✓ Ajouter</button>
              <button className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {interlocuteurs.length === 0 && !adding ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="empty-icon"></div>
          <div className="empty-sub">Aucun interlocuteur supplémentaire renseigné</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={startAdd}>+ Ajouter un interlocuteur</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {interlocuteurs.map(il => {
            const color = ROLE_COLORS[il.role] || '#64748B';
            const isEditing = editingId === il.id;
            return (
              <div key={il.id} className="card" style={{ borderTop: '3px solid ' + color }}>
                {isEditing ? (
                  <div className="card-body">
                    <ContactForm form={form} setForm={setForm} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓ Sauvegarder</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
                    }}>
                      {initials(il.nom)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{il.nom}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>{il.role}</div>
                      {il.service && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{il.service}</div>}
                      {il.email && <div style={{ fontSize: 11 }}><a href={'mailto:' + il.email} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{il.email}</a></div>}
                      {il.telephone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{il.telephone}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => startEdit(il)}></button>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => remove(il.id)}>✗</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
