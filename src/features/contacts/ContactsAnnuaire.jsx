import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Layout from '../../components/Layout';
import { clccs, marches } from '../../data/mockData';
import { clccContacts as CLCC_CONTACTS_DATA, FONCTIONS_IMPORT } from '../../data/clccContacts';
import { useMarcheMeta } from '../../context/MarcheMetaContext';
import { isConfigured, loginMicrosoft, getAccount, logoutMicrosoft, initMsal } from '../../utils/msalConfig';
import { syncAllToOutlook, syncClccToOutlook, exportContactsVCF } from '../../utils/outlookSync';

const COLORS = ['#1A4FA8', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0891B2', '#DB2777', '#0D9488', '#DC2626', '#7C3AED'];

function initials(nom) {
  return nom.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function fonctionColor(fn) {
  const i = FONCTIONS_IMPORT.indexOf(fn);
  return COLORS[i >= 0 ? i % COLORS.length : COLORS.length - 1];
}

function SectionTabs({ section, setSection }) {
  const tabs = [
    { id: 'unicancer', label: 'Contacts Unicancer' },
    { id: 'fournisseurs', label: 'Contacts Fournisseurs' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #e5e7eb' }}>
      {tabs.map(t => (
        <div key={t.id}
          onClick={() => setSection(t.id)}
          style={{
            padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            borderBottom: section === t.id ? '2px solid #1A4FA8' : '2px solid transparent',
            color: section === t.id ? '#1A4FA8' : '#6b7280',
            marginBottom: -1,
          }}>
          {t.label}
        </div>
      ))}
    </div>
  );
}

export default function ContactsAnnuaire() {
  const navigate = useNavigate();
  const { getAllMeta, getMeta, setMeta } = useMarcheMeta();
  const [section, setSection] = useState('unicancer'); // 'unicancer' | 'fournisseurs'
  const [search, setSearch] = useState('');
  const [selectedClcc, setSelectedClcc] = useState(null);
  const [filtreFonction, setFiltreFonction] = useState('tous');
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [searchClcc, setSearchClcc] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Outlook sync state
  const [msAccount, setMsAccount] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const outlookReady = isConfigured();



  // Collect all contacts saved via MarcheInterlocuteurs (per-marché)
  // + static responsables from mockData
  const allMeta = getAllMeta ? getAllMeta() : {};

  // ── Agrégation fournisseurs depuis les annuaires de marchés ──
  const fournisseursAgg = useMemo(() => {
    const byName = new Map();
    for (const m of marches) {
      const meta = allMeta[m.id] || {};
      const list = meta.fournisseurs || [];
      for (const f of list) {
        const key = (f.nom || '').trim();
        if (!key) continue;
        if (!byName.has(key)) {
          byName.set(key, { nom: key, marches: [], contacts: [], _seen: new Set() });
        }
        const entry = byName.get(key);
        entry.marches.push({ id: m.id, nom: m.nom, reference: m.reference });
        for (const c of f.contacts || []) {
          const ck = (c.mail || '') + '|' + (c.nom || '').toLowerCase() + '|' + (c.prenom || '').toLowerCase();
          if (entry._seen.has(ck)) continue;
          entry._seen.add(ck);
          entry.contacts.push({ ...c, marcheId: m.id, marcheNom: m.nom });
        }
      }
    }
    return Array.from(byName.values())
      .map(({ _seen, ...rest }) => rest)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }, [allMeta]);

  // Build full contacts list: imported (Excel) + manual (localStorage)
  const enrichedClccs = useMemo(() => {
    return clccs.map(c => {
      // 1. Contacts importés depuis le fichier Excel (statiques)
      const imported = CLCC_CONTACTS_DATA[c.id] || {};
      const staticContacts = Object.entries(imported).flatMap(([fonction, list]) =>
        list.map(ct => ({
          id: 'import-' + c.id + '-' + fonction + '-' + (ct.nom || '') + (ct.prenom || ''),
          nom: [ct.prenom, ct.nom].filter(Boolean).join(' ') || ct.nom,
          fonction,
          service: '',
          email: ct.email || '',
          telephone: ct.telephone || '',
          source: 'import',
          ...(ct.commentaire ? { commentaire: ct.commentaire } : {}),
        }))
      );

      // 2. Contacts ajoutés manuellement (localStorage)
      const meta = allMeta['clcc-' + c.id] || {};
      const manualContacts = (meta.contacts || []).map(ct => ({ ...ct, source: 'manual' }));

      // Apply overrides and hidden from localStorage
      const overrides = meta.overrides || {};
      const hidden = new Set(meta.hiddenImports || []);
      const mergedStatic = staticContacts
        .filter(ct => !hidden.has(ct.id))
        .map(ct => overrides[ct.id] ? { ...ct, ...overrides[ct.id] } : ct);

      const allContacts = [...mergedStatic, ...manualContacts];

      return {
        ...c,
        contacts: allContacts,
        totalContacts: allContacts.length,
      };
    });
  }, [allMeta]);

  // Filter CLCCs
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enrichedClccs.filter(c =>
      !q ||
      c.nom.toLowerCase().includes(q) ||
      c.ville.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.contacts.some(ct => ct.nom.toLowerCase().includes(q))
    );
  }, [enrichedClccs, search]);

  // Selected CLCC detail view
  const clcc = selectedClcc ? enrichedClccs.find(c => c.id === selectedClcc) : null;

  // Filter contacts by fonction + search within CLCC
  const clccContacts = clcc
    ? clcc.contacts.filter(ct => {
        const matchFn = filtreFonction === 'tous' || ct.fonction === filtreFonction;
        if (!matchFn) return false;
        if (!searchClcc) return true;
        const q = searchClcc.toLowerCase();
        return (ct.nom || '').toLowerCase().includes(q) ||
               (ct.email || '').toLowerCase().includes(q) ||
               (ct.fonction || '').toLowerCase().includes(q) ||
               (ct.service || '').toLowerCase().includes(q);
      })
    : [];

  // Count contacts per fonction for the selected CLCC
  const fonctionCounts = clcc
    ? FONCTIONS_IMPORT.reduce((acc, fn) => {
        acc[fn] = clcc.contacts.filter(ct => ct.fonction === fn).length;
        return acc;
      }, {})
    : {};

  // ── Helpers: edit, delete, export ───────────────────────

  function saveEdit(clccId, originalCt) {
    const metaKey = 'clcc-' + clccId;
    const meta = getMeta(metaKey);
    // If it's an imported contact, save override in manual list
    if (originalCt.source === 'import') {
      const overrides = meta.overrides || {};
      overrides[originalCt.id] = { ...editForm };
      setMeta(metaKey, { overrides });
    } else {
      const contacts = (meta.contacts || []).map(c =>
        c.id === originalCt.id ? { ...c, ...editForm } : c
      );
      setMeta(metaKey, { contacts });
    }
  }

  function deleteContact(clccId, ct) {
    const metaKey = 'clcc-' + clccId;
    const meta = getMeta(metaKey);
    if (ct.source === 'import') {
      const hidden = meta.hiddenImports || [];
      setMeta(metaKey, { hiddenImports: [...hidden, ct.id] });
    } else {
      const contacts = (meta.contacts || []).filter(c => c.id !== ct.id);
      setMeta(metaKey, { contacts });
    }
  }

  function exportClccExcel(clccData, contacts) {
    const rows = contacts.map(ct => ({
      'Nom': ct.nom,
      'Fonction': ct.fonction,
      'Email': ct.email || '',
      'Téléphone': ct.telephone || '',
      'Service': ct.service || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, clccData.nom.slice(0, 31));
    XLSX.writeFile(wb, 'contacts_' + clccData.id + '.xlsx');
  }

  function exportAllExcel() {
    const rows = [];
    enrichedClccs.forEach(c => {
      c.contacts.forEach(ct => {
        rows.push({
          'Centre': c.nom,
          'Ville': c.ville,
          'Nom': ct.nom,
          'Fonction': ct.fonction,
          'Email': ct.email || '',
          'Téléphone': ct.telephone || '',
          'Service': ct.service || '',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts CLCC');
    XLSX.writeFile(wb, 'annuaire_clcc_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  // ── CLCC detail view ──────────────────────────────────
  if (clcc) {
    return (
      <Layout title={clcc.nom} sub={'— ' + clcc.ville}>
        {/* Back button */}
        <button
          className="btn btn-outline btn-sm"
          style={{ marginBottom: 16 }}
          onClick={() => { setSelectedClcc(null); setFiltreFonction('tous'); }}
        >
          &larr; Retour aux CLCC
        </button>

        {/* CLCC header card */}
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0,
            }}>
              {initials(clcc.nom)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{clcc.nom}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {clcc.ville} &middot; {clcc.region}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {clcc.contacts.length} contact{clcc.contacts.length > 1 ? 's' : ''} enregistré{clcc.contacts.length > 1 ? 's' : ''}
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/contacts/' + clcc.id + '/add')}>
              + Ajouter un contact
            </button>
          </div>
        </div>

        {/* Filters + search + export */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <select
            className="info-field-input"
            value={filtreFonction}
            onChange={e => setFiltreFonction(e.target.value)}
            style={{ width: 'auto', minWidth: 280, height: 36, fontSize: 13 }}
          >
            <option value="tous">Toutes les fonctions ({clcc.contacts.length})</option>
            {FONCTIONS_IMPORT.map(fn => {
              const count = fonctionCounts[fn] || 0;
              if (count === 0) return null;
              return <option key={fn} value={fn}>{fn} ({count})</option>;
            })}
          </select>
          <input
            type="text"
            className="filter-input"
            placeholder="Rechercher un contact..."
            value={searchClcc}
            onChange={e => setSearchClcc(e.target.value)}
            style={{ width: 200 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {clccContacts.length} contact{clccContacts.length > 1 ? 's' : ''}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(() => {
              const emails = clccContacts.map(ct => ct.email).filter(Boolean);
              if (emails.length === 0) return null;
              return (
                <a
                  href={'mailto:' + emails.join(',')}
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none', color: '#fff' }}
                >
                  Envoyer un mail ({emails.length})
                </a>
              );
            })()}
            <button className="btn btn-outline btn-sm" onClick={() => exportClccExcel(clcc, clccContacts)}>
              Exporter Excel
            </button>
          </div>
        </div>

        {/* Contacts list */}
        {clccContacts.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-icon">&#x1F464;</div>
            <div className="empty-title">Aucun contact enregistré</div>
            <div className="empty-sub">
              Ajoutez des interlocuteurs pour ce centre.
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/contacts/' + clcc.id + '/add')}>
              + Ajouter un contact
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {clccContacts.map((ct, i) => {
              const color = fonctionColor(ct.fonction);
              return (
                <div key={ct.id || i} className="card" style={{ borderTop: '3px solid ' + color }}>
                  <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
                    }}>
                      {initials(ct.nom)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{ct.nom}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>{ct.fonction}</div>
                      {ct.service && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>&#x1F3E2; {ct.service}</div>}
                      {ct.email && <div style={{ fontSize: 11 }}>&#x2709;&#xFE0F; <a href={'mailto:' + ct.email} style={{ color: 'var(--blue)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{ct.email}</a></div>}
                      {ct.telephone && <div style={{ fontSize: 11 }}>&#x1F4DE; <a href={'tel:' + ct.telephone} style={{ color: 'var(--blue)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{ct.telephone}</a></div>}
                      {ct.commentaire && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{ct.commentaire}</div>}
                      {ct.marchesLies && ct.marchesLies.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Marchés liés
                          </div>
                          {ct.marchesLies.map(mid => {
                            const m = marches.find(x => x.id === mid);
                            return m ? (
                              <div
                                key={mid}
                                onClick={e => { e.stopPropagation(); navigate('/marche/' + mid); }}
                                style={{ fontSize: 10, cursor: 'pointer', padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', marginBottom: 2 }}
                              >
                                <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.reference || '—'}</span>{' '}
                                <span style={{ color: 'var(--text-muted)' }}>{m.nom}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    {/* Edit / Delete */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '2px 6px', height: 22 }}
                        title="Modifier"
                        onClick={() => {
                          setEditingContact(ct.id);
                          setEditForm({ nom: ct.nom, fonction: ct.fonction, email: ct.email || '', telephone: ct.telephone || '', service: ct.service || '' });
                        }}
                      >&#x270F;&#xFE0F;</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '2px 6px', height: 22, color: '#EF4444' }}
                        title="Supprimer"
                        onClick={() => {
                          if (!window.confirm('Supprimer ' + ct.nom + ' ?')) return;
                          deleteContact(clcc.id, ct);
                        }}
                      >&#x2715;</button>
                    </div>
                  </div>
                  {/* Inline edit form */}
                  {editingContact === ct.id && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Nom" value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} />
                        <select className="info-field-input" style={{ height: 32, fontSize: 12 }} value={editForm.fonction} onChange={e => setEditForm(f => ({ ...f, fonction: e.target.value }))}>
                          {FONCTIONS_IMPORT.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                        </select>
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Téléphone" value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => { saveEdit(clcc.id, ct); setEditingContact(null); }}>Sauvegarder</button>
                        <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => setEditingContact(null)}>Annuler</button>
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

  // ── Vue détail fournisseur ───────────────────────────
  if (selectedFournisseur) {
    const f = fournisseursAgg.find(x => x.nom === selectedFournisseur);
    if (!f) { setSelectedFournisseur(null); return null; }
    return (
      <Layout title={f.nom} sub={`— ${f.contacts.length} contact${f.contacts.length > 1 ? 's' : ''}`}>
        <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}
          onClick={() => setSelectedFournisseur(null)}>
          &larr; Retour aux fournisseurs
        </button>
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #8B5CF6' }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: 16 }}>{f.nom}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Présent sur {f.marches.length} marché{f.marches.length > 1 ? 's' : ''} :
              {' '}{f.marches.map(m => m.reference || m.nom).join(', ')}
            </div>
          </div>
        </div>
        {f.contacts.length === 0 ? (
          <div className="empty-state"><div className="empty-title">Aucun contact</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {f.contacts.map((ct, i) => (
              <div key={i} className="card" style={{ borderTop: '3px solid #8B5CF6' }}>
                <div className="card-body">
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {[ct.prenom, ct.nom].filter(Boolean).join(' ') || '—'}
                  </div>
                  {ct.fonction && <div style={{ fontSize: 11, fontWeight: 600, color: '#8B5CF6', marginTop: 2 }}>{ct.fonction}</div>}
                  {ct.mail && <div style={{ fontSize: 11, marginTop: 4 }}>&#x2709;&#xFE0F; <a href={'mailto:' + ct.mail} style={{ color: 'var(--blue)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{ct.mail}</a></div>}
                  {ct.tel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>&#x1F4DE; {ct.tel}</div>}
                  <div style={{ fontSize: 10, color: 'var(--blue)', marginTop: 6, cursor: 'pointer' }}
                    onClick={() => navigate('/marche/' + ct.marcheId)}>
                    &#x1F4C2; {ct.marcheNom}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Layout>
    );
  }

  // ── Vue liste fournisseurs ───────────────────────────
  if (section === 'fournisseurs') {
    const q = search.toLowerCase();
    const filteredFour = fournisseursAgg.filter(f =>
      !q || f.nom.toLowerCase().includes(q) ||
      f.contacts.some(c => (c.nom || '').toLowerCase().includes(q) || (c.mail || '').toLowerCase().includes(q))
    );
    return (
      <Layout title="Contacts" sub="— Annuaire">
        <SectionTabs section={section} setSection={setSection} />
        <div className="info-box" style={{ marginBottom: 18 }}>
          <strong>Contacts fournisseurs</strong> — Aggrégés depuis les annuaires des marchés analysés.
          Lance un scan dans <em>Analyse des offres</em> d'un marché pour alimenter cette liste.
        </div>
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="text" className="filter-input" placeholder="Rechercher un fournisseur, contact..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 360 }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filteredFour.length} fournisseur{filteredFour.length > 1 ? 's' : ''}
          </span>
        </div>
        {filteredFour.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#x1F4E6;</div>
            <div className="empty-title">Aucun fournisseur</div>
            <div className="empty-sub">Lance un scan d'annuaire dans la page Analyse d'un marché.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filteredFour.map(f => (
              <div key={f.nom} className="card"
                style={{ cursor: 'pointer', borderLeft: '4px solid #8B5CF6' }}
                onClick={() => setSelectedFournisseur(f.nom)}>
                <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: '#8B5CF6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0,
                  }}>{initials(f.nom)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {f.marches.length} marché{f.marches.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700,
                      color: f.contacts.length > 0 ? '#8B5CF6' : 'var(--text-muted)' }}>
                      {f.contacts.length}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      contact{f.contacts.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Layout>
    );
  }

  // ── CLCC list view (main) ─────────────────────────────
  return (
    <Layout title="Contacts" sub="— Annuaire">
      <SectionTabs section={section} setSection={setSection} />
      {/* Toolbar : mailing par fonction + export */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          className="info-field-input"
          id="mail-fonction-select"
          defaultValue=""
          style={{ width: 'auto', minWidth: 280, height: 36, fontSize: 13 }}
          onChange={e => {
            const fn = e.target.value;
            if (!fn) return;
            const emails = enrichedClccs
              .flatMap(c => c.contacts)
              .filter(ct => ct.fonction === fn && ct.email)
              .map(ct => ct.email);
            if (emails.length === 0) { alert('Aucun email trouvé pour cette fonction.'); return; }
            window.location.href = 'mailto:' + emails.join(',');
            e.target.value = '';
          }}
        >
          <option value="">Envoyer un mail par fonction...</option>
          {FONCTIONS_IMPORT.map(fn => {
            const emails = enrichedClccs.flatMap(c => c.contacts).filter(ct => ct.fonction === fn && ct.email);
            if (emails.length === 0) return null;
            return <option key={fn} value={fn}>{fn} ({emails.length} emails)</option>;
          })}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-outline btn-sm" onClick={exportAllExcel}>
            Exporter tout (.xlsx)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          className="filter-input"
          placeholder="Rechercher un CLCC, une ville..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 360 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} centre{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#x1F3E5;</div>
          <div className="empty-title">Aucun centre trouvé</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map((c, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <div
                key={c.id}
                className="card"
                style={{ cursor: 'pointer', borderLeft: '4px solid ' + color, transition: 'box-shadow 200ms, transform 200ms' }}
                onClick={() => setSelectedClcc(c.id)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--e-3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0,
                  }}>
                    {initials(c.nom)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{c.nom}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.ville} &middot; {c.region}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c.totalContacts > 0 ? color : 'var(--text-muted)' }}>
                      {c.totalContacts}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      contact{c.totalContacts > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
