import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { clccs, FONCTIONS, marches } from '../../data/mockData';
import { useMarcheMeta } from '../../context/MarcheMetaContext';
import { isConfigured, loginMicrosoft, getAccount, logoutMicrosoft, initMsal } from '../../utils/msalConfig';
import { syncAllToOutlook, syncClccToOutlook, exportContactsVCF } from '../../utils/outlookSync';

const COLORS = ['#1A4FA8', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0891B2', '#DB2777', '#0D9488', '#DC2626', '#7C3AED'];

function initials(nom) {
  return nom.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function fonctionColor(fn) {
  const i = FONCTIONS.indexOf(fn);
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
  const { getAllMeta } = useMarcheMeta();
  const [section, setSection] = useState('unicancer'); // 'unicancer' | 'fournisseurs'
  const [search, setSearch] = useState('');
  const [selectedClcc, setSelectedClcc] = useState(null);
  const [filtreFonction, setFiltreFonction] = useState('tous');
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);

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

  // Build full contacts list enriched with CLCC info
  const enrichedClccs = useMemo(() => {
    return clccs.map(c => {
      // Contacts saisis manuellement sur ce CLCC (stockés dans meta du CLCC)
      const meta = allMeta['clcc-' + c.id] || {};
      const manualContacts = meta.contacts || [];

      // Also collect contacts from marchés where this CLCC is referenced
      // (via interlocuteurs per marché that mention this CLCC)
      return {
        ...c,
        contacts: manualContacts,
        totalContacts: manualContacts.length,
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

  // Filter contacts by fonction
  const clccContacts = clcc
    ? clcc.contacts.filter(ct => filtreFonction === 'tous' || ct.fonction === filtreFonction)
    : [];

  // Count contacts per fonction for the selected CLCC
  const fonctionCounts = clcc
    ? FONCTIONS.reduce((acc, fn) => {
        acc[fn] = clcc.contacts.filter(ct => ct.fonction === fn).length;
        return acc;
      }, {})
    : {};

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

        {/* Fonction filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          <div
            className={'tab' + (filtreFonction === 'tous' ? ' active' : '')}
            onClick={() => setFiltreFonction('tous')}
            style={{ cursor: 'pointer' }}
          >
            Tous ({clcc.contacts.length})
          </div>
          {FONCTIONS.map(fn => {
            const count = fonctionCounts[fn] || 0;
            if (count === 0) return null;
            return (
              <div
                key={fn}
                className={'tab' + (filtreFonction === fn ? ' active' : '')}
                onClick={() => setFiltreFonction(fn)}
                style={{ cursor: 'pointer' }}
              >
                {fn} ({count})
              </div>
            );
          })}
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
                      {ct.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>&#x2709;&#xFE0F; {ct.email}</div>}
                      {ct.telephone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>&#x1F4DE; {ct.telephone}</div>}
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
                                style={{
                                  fontSize: 10, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                                  background: 'var(--bg)', marginBottom: 2,
                                }}
                              >
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 700 }}>{m.reference || '—'}</span>{' '}
                                <span style={{ color: 'var(--text-muted)' }}>{m.nom}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
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
                  {ct.mail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>&#x2709;&#xFE0F; {ct.mail}</div>}
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
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
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
      {/* ── Toolbar : Export VCF + Sync Outlook ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            const ok = exportContactsVCF(clccs, allMeta, marches);
            if (!ok) alert('Aucun contact à exporter. Ajoutez des contacts dans les CLCCs.');
          }}
        >
          &#x1F4E5; Exporter VCF (Outlook / iPhone)
        </button>

        {outlookReady ? (
          msAccount ? (
            <>
              <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                &#x2713; {msAccount.username}
              </span>
              <button
                className="btn btn-primary btn-sm"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true); setSyncResult(null);
                  try {
                    const r = await syncAllToOutlook(enrichedClccs, allMeta, marches);
                    setSyncResult(r);
                  } catch (err) { setSyncResult({ errors: [{ error: err.message }] }); }
                  setSyncing(false);
                }}
              >
                {syncing ? 'Synchronisation...' : '&#x1F504; Sync Outlook 365'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={async () => { await logoutMicrosoft(); setMsAccount(null); }}>
                Déconnexion
              </button>
            </>
          ) : (
            <button
              className="btn btn-outline btn-sm"
              onClick={async () => {
                try {
                  await initMsal();
                  const res = await loginMicrosoft();
                  if (res) setMsAccount(res.account);
                } catch (err) { alert('Erreur connexion Microsoft : ' + err.message); }
              }}
            >
              &#x1F512; Se connecter à Outlook 365
            </button>
          )
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Outlook 365 : ajouter VITE_AZURE_CLIENT_ID dans .env pour activer la synchro
          </span>
        )}

        {syncResult && (
          <span style={{ fontSize: 11, color: syncResult.errors?.length > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
            {syncResult.created > 0 && syncResult.created + ' créé(s) '}
            {syncResult.updated > 0 && syncResult.updated + ' mis à jour '}
            {syncResult.errors?.length > 0 && syncResult.errors.length + ' erreur(s)'}
            {syncResult.created === 0 && syncResult.updated === 0 && !syncResult.errors?.length && 'Aucun contact à synchroniser'}
          </span>
        )}
      </div>

      <div className="info-box blue" style={{ marginBottom: 20 }}>
        <strong>Annuaire CLCC</strong> — Sélectionnez un centre pour voir et gérer ses interlocuteurs par fonction.
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
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: c.totalContacts > 0 ? color : 'var(--text-muted)' }}>
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
