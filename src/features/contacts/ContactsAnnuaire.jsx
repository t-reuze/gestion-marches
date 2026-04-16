import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Layout from '../../components/Layout';
import { clccs, marches, etablissementsAffilies } from '../../data/mockData';
import { fournisseursContacts as FOURNISSEURS_DATA, CATEGORIES_FOURNISSEURS } from '../../data/fournisseursContacts';
import { clccContacts as CLCC_CONTACTS_DATA, FONCTIONS_IMPORT } from '../../data/clccContacts';
import { useMarcheMeta } from '../../context/MarcheMetaContext';
import { isConfigured, loginMicrosoft, getAccount, logoutMicrosoft, initMsal } from '../../utils/msalConfig';
import { syncAllToOutlook, syncClccToOutlook, exportContactsVCF } from '../../utils/outlookSync';

const NAVY = '#2D5F8A';

function buildMailtoUrl(emails, { subject = '', body = '' } = {}) {
  const bcc = emails.filter(Boolean).join(',');
  const params = [];
  if (bcc) params.push('bcc=' + encodeURIComponent(bcc));
  if (subject) params.push('subject=' + encodeURIComponent(subject));
  if (body) params.push('body=' + encodeURIComponent(body));
  return 'mailto:?' + params.join('&');
}

function defaultMailBody(fonctionLabel) {
  return 'Bonjour,\n\n\n\nCordialement,\n\nService Achats\nUNICANCER';
}

// ── Détection genre par prénom ───────────────────────────────
const PRENOMS_FEMININS = new Set([
  'alice','amelie','amélie','amandine','andrea','andréa','angelique','angélique','anne',
  'annie','audrey','aurelie','aurélie','beatrice','béatrice','bernadette','brigitte',
  'camille','carla','caroline','catherine','cecile','cécile','celine','céline',
  'chantal','charlene','charlène','charlotte','christelle','christine','claire',
  'clarisse','claudine','clementine','clémentine','colette','corinne','danielle',
  'delphine','denise','diane','dominique','dorothee','dorothée','edith','eliane',
  'éliane','elisabeth','élisabeth','elise','élise','eloise','éloïse','emilie','émilie',
  'emma','estelle','eve','ève','fabienne','fanny','florence','francoise','françoise',
  'frederique','frédérique','gabrielle','genevieve','geneviève','ghislaine','guilaine',
  'gwenaelle','gwenaëlle','guylene','guylène','helene','hélène','henriette','hermine',
  'hien','isabelle','jacqueline','jeanne','jessica','jocelyne','josiane','judith',
  'julie','juliette','justine','karine','laetitia','laure','laurence','lea','léa',
  'leone','léone','liliane','lison','louisa','louise','lucie','lydie','madeleine',
  'manon','margit','marguerite','maria','marianne','marie','marine','marion',
  'marlene','marlène','marthe','martine','mathilde','melanie','mélanie','michele',
  'michèle','mireille','monique','muriel','myriam','nadia','nadine','nathalie',
  'nicole','nina','noemie','noémie','odette','odile','olivia','pascale','patricia',
  'pauline','peggy','rachel','raphaelle','raphaëlle','rebecca','renata','rosalie',
  'roxane','sabine','sandrine','sarah','severine','séverine','simone','solange',
  'sophie','stephanie','stéphanie','suzanne','sylvie','therese','thérèse',
  'valerie','valérie','vanessa','veronique','véronique','virginie','viviane','yasmine',
]);

function isFeminin(prenom) {
  if (!prenom) return false;
  const p = prenom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/[\s-]/)[0];
  if (PRENOMS_FEMININS.has(p)) return true;
  // Heuristique : prénoms se terminant par -e, -a, -ine, -elle, -ette
  if (/^(mari|sophi|laur|clair|ann|juli|luci|alic|emili|carolin)/.test(p)) return true;
  return false;
}

const FEMINISATION = {
  'Acheteur':             ['Acheteur', 'Acheteuse'],
  'Ingénieur Biomédical': ['Ingénieur Biomédical', 'Ingénieure Biomédicale'],
  'Physicien Médical':    ['Physicien Médical', 'Physicienne Médicale'],
  'Physicien Radiothérapie': ['Physicien Radiothérapie', 'Physicienne Radiothérapie'],
  'Physicien Médecine Nucléaire': ['Physicien Médecine Nucléaire', 'Physicienne Médecine Nucléaire'],
  'Physicien Radiologie Conventionnelle': ['Physicien Radiologie Conventionnelle', 'Physicienne Radiologie Conventionnelle'],
  'Médecin Nucléaire':    ['Médecin Nucléaire', 'Médecin Nucléaire'],
  'Radiologue':           ['Radiologue', 'Radiologue'],
  'Radiothérapeute':      ['Radiothérapeute', 'Radiothérapeute'],
  'Radiopharmacien':      ['Radiopharmacien', 'Radiopharmacienne'],
  'Directeur Technique':  ['Directeur Technique', 'Directrice Technique'],
  'Directeur des Soins':  ['Directeur des Soins', 'Directrice des Soins'],
  'Chef de service Radiothérapie': ['Chef de service Radiothérapie', 'Cheffe de service Radiothérapie'],
  'Chef de service Bloc opératoire': ['Chef de service Bloc opératoire', 'Cheffe de service Bloc opératoire'],
  'Chef de service Médecine Nucléaire': ['Chef de service Médecine Nucléaire', 'Cheffe de service Médecine Nucléaire'],
  'Chef de service Radiologie': ['Chef de service Radiologie', 'Cheffe de service Radiologie'],
  'Chef de service Anatomopathologie': ['Chef de service Anatomopathologie', 'Cheffe de service Anatomopathologie'],
  'Référent Qualité':     ['Référent Qualité', 'Référente Qualité'],
  'Référent Radioprotection (Travailleur)': ['Référent Radioprotection (Travailleur)', 'Référente Radioprotection (Travailleur)'],
  'Référent Radioprotection (Patient)': ['Référent Radioprotection (Patient)', 'Référente Radioprotection (Patient)'],
  'Référent Formation Interne': ['Référent Formation Interne', 'Référente Formation Interne'],
  'Référent Formation Externe': ['Référent Formation Externe', 'Référente Formation Externe'],
  'Responsable Physique Médicale': ['Responsable Physique Médicale', 'Responsable Physique Médicale'],
  'Responsable Recherche Clinique (BEC)': ['Responsable Recherche Clinique (BEC)', 'Responsable Recherche Clinique (BEC)'],
  'Cadre de santé Radiothérapie': ['Cadre de santé Radiothérapie', 'Cadre de santé Radiothérapie'],
  'Cadre de santé Radiologie': ['Cadre de santé Radiologie', 'Cadre de santé Radiologie'],
  'Cadre de santé Bloc opératoire': ['Cadre de santé Bloc opératoire', 'Cadre de santé Bloc opératoire'],
  'Cadre de santé Médecine Nucléaire': ['Cadre de santé Médecine Nucléaire', 'Cadre de santé Médecine Nucléaire'],
  'Consultant Radiothérapie': ['Consultant Radiothérapie', 'Consultante Radiothérapie'],
  'PU-PH Radiothérapie':  ['PU-PH Radiothérapie', 'PU-PH Radiothérapie'],
  'Assistant Spécialiste Radiothérapie': ['Assistant Spécialiste Radiothérapie', 'Assistante Spécialiste Radiothérapie'],
};

function feminiser(fonction, prenom) {
  if (!prenom) return fonction;
  const fem = isFeminin(prenom);
  // Handle multi-fonctions (comma separated)
  return fonction.split(', ').map(fn => {
    const entry = FEMINISATION[fn];
    if (entry) return fem ? entry[1] : entry[0];
    return fn;
  }).join(', ');
}

function initials(nom) {
  return nom.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function ClccLogo({ clccId, nom, size = 48 }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = '/logos/' + clccId + '.png';

  if (imgError) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', background: NAVY,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: size * 0.3, flexShrink: 0,
      }}>
        {initials(nom)}
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#fff', border: '1px solid rgba(15,23,42,.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', padding: size * 0.12,
    }}>
      <img
        src={logoUrl}
        alt={nom}
        onError={() => setImgError(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'contain',
        }}
    />
    </div>
  );
}

function fonctionColor() {
  return NAVY;
}

function SectionTabs({ section, setSection }) {
  const tabs = [
    { id: 'unicancer', label: 'CLCC Unicancer' },
    { id: 'affilies', label: '\u00c9tablissements Affili\u00e9s' },
    { id: 'fournisseurs', label: 'Fournisseurs' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #e5e7eb' }}>
      {tabs.map(t => (
        <div key={t.id}
          onClick={() => setSection(t.id)}
          style={{
            padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            borderBottom: section === t.id ? '2px solid #2D5F8A' : '2px solid transparent',
            color: section === t.id ? '#2D5F8A' : '#6b7280',
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
      // Dédupliqués : même personne (nom+prenom) → une seule fiche avec fonctions groupées
      const imported = CLCC_CONTACTS_DATA[c.id] || {};
      const dedup = new Map();
      Object.entries(imported).forEach(([fonction, list]) => {
        list.forEach(ct => {
          const key = ((ct.prenom || '') + ' ' + (ct.nom || '')).trim().toLowerCase();
          if (!key) return;
          if (dedup.has(key)) {
            const existing = dedup.get(key);
            if (!existing.fonction.includes(fonction)) {
              existing.fonction = existing.fonction + ', ' + fonction;
            }
            if (!existing.email && ct.email) existing.email = ct.email;
            if (!existing.telephone && ct.telephone) existing.telephone = ct.telephone;
          } else {
            dedup.set(key, {
              id: 'import-' + c.id + '-' + key,
              nom: [ct.prenom, ct.nom].filter(Boolean).join(' ') || ct.nom,
              prenom: ct.prenom || '',
              fonction,
              service: '',
              email: ct.email || '',
              telephone: ct.telephone || '',
              source: 'import',
              ...(ct.commentaire ? { commentaire: ct.commentaire } : {}),
            });
          }
        });
      });
      const staticContacts = [...dedup.values()];

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
      'Fonction': feminiser(ct.fonction, ct.prenom),
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
          'Fonction': feminiser(ct.fonction, ct.prenom),
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
            <ClccLogo clccId={clcc.id} nom={clcc.nom} size={68} />
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
              const fn = filtreFonction !== 'tous' ? filtreFonction : '';
              return (
                <a
                  href={buildMailtoUrl(emails, {
                    subject: fn ? fn + ' \u2014 UNICANCER' : 'UNICANCER',
                    body: defaultMailBody(fn),
                  })}
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none', color: '#fff' }}
                >
                  Envoyer un mail en CCI ({emails.length})
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
                      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>{feminiser(ct.fonction, ct.prenom)}</div>
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
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Nom" value={editForm.nom || ''} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} />
                        <select className="info-field-input" style={{ height: 32, fontSize: 12 }} value={editForm.fonction || ''} onChange={e => setEditForm(f => ({ ...f, fonction: e.target.value }))}>
                          {FONCTIONS_IMPORT.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                        </select>
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Téléphone" value={editForm.telephone || ''} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} />
                        <input className="info-field-input" style={{ height: 32, fontSize: 12, gridColumn: '1 / -1' }} placeholder="Service" value={editForm.service || ''} onChange={e => setEditForm(f => ({ ...f, service: e.target.value }))} />
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

    function saveFournisseurContact(ct, patch) {
      const meta = getMeta(ct.marcheId);
      const fournisseurs = (meta.fournisseurs || []).map(fr => {
        if (fr.nom !== f.nom) return fr;
        return {
          ...fr,
          contacts: (fr.contacts || []).map(c => {
            const match =
              (c.mail || '') === (ct.mail || '') &&
              (c.nom || '').toLowerCase() === (ct.nom || '').toLowerCase() &&
              (c.prenom || '').toLowerCase() === (ct.prenom || '').toLowerCase();
            return match ? { ...c, ...patch } : c;
          }),
        };
      });
      setMeta(ct.marcheId, { fournisseurs });
    }

    function deleteFournisseurContact(ct) {
      if (!window.confirm('Supprimer ce contact ?')) return;
      const meta = getMeta(ct.marcheId);
      const fournisseurs = (meta.fournisseurs || []).map(fr => {
        if (fr.nom !== f.nom) return fr;
        return {
          ...fr,
          contacts: (fr.contacts || []).filter(c => !(
            (c.mail || '') === (ct.mail || '') &&
            (c.nom || '').toLowerCase() === (ct.nom || '').toLowerCase() &&
            (c.prenom || '').toLowerCase() === (ct.prenom || '').toLowerCase()
          )),
        };
      });
      setMeta(ct.marcheId, { fournisseurs });
    }

    return (
      <Layout title={f.nom} sub={`— ${f.contacts.length} contact${f.contacts.length > 1 ? 's' : ''}`}>
        <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}
          onClick={() => setSelectedFournisseur(null)}>
          &larr; Retour aux fournisseurs
        </button>
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #2D5F8A' }}>
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
            {f.contacts.map((ct, i) => {
              const ctKey = 'f-' + i + '-' + (ct.mail || ct.nom || '');
              const isEditing = editingContact === ctKey;
              return (
                <div key={ctKey} className="card" style={{ borderTop: '3px solid #2D5F8A' }}>
                  <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {[ct.prenom, ct.nom].filter(Boolean).join(' ') || '—'}
                      </div>
                      {ct.fonction && <div style={{ fontSize: 11, fontWeight: 600, color: '#2D5F8A', marginTop: 2 }}>{feminiser(ct.fonction, ct.prenom)}</div>}
                      {ct.mail && <div style={{ fontSize: 11, marginTop: 4 }}>&#x2709;&#xFE0F; <a href={'mailto:' + ct.mail} style={{ color: 'var(--blue)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{ct.mail}</a></div>}
                      {ct.tel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>&#x1F4DE; {ct.tel}</div>}
                      <div style={{ fontSize: 10, color: 'var(--blue)', marginTop: 6, cursor: 'pointer' }}
                        onClick={() => navigate('/marche/' + ct.marcheId)}>
                        &#x1F4C2; {ct.marcheNom}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '2px 6px', height: 22 }}
                        title="Modifier"
                        onClick={() => {
                          setEditingContact(ctKey);
                          setEditForm({ prenom: ct.prenom || '', nom: ct.nom || '', fonction: ct.fonction || '', mail: ct.mail || '', tel: ct.tel || '' });
                        }}
                      >&#x270F;&#xFE0F;</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '2px 6px', height: 22, color: '#EF4444' }}
                        title="Supprimer"
                        onClick={() => deleteFournisseurContact(ct)}
                      >&#x2715;</button>
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Prénom" value={editForm.prenom || ''} onChange={e => setEditForm(fm => ({ ...fm, prenom: e.target.value }))} />
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Nom" value={editForm.nom || ''} onChange={e => setEditForm(fm => ({ ...fm, nom: e.target.value }))} />
                        <input className="info-field-input" style={{ height: 32, fontSize: 12, gridColumn: '1 / -1' }} placeholder="Fonction" value={editForm.fonction || ''} onChange={e => setEditForm(fm => ({ ...fm, fonction: e.target.value }))} />
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Email" value={editForm.mail || ''} onChange={e => setEditForm(fm => ({ ...fm, mail: e.target.value }))} />
                        <input className="info-field-input" style={{ height: 32, fontSize: 12 }} placeholder="Téléphone" value={editForm.tel || ''} onChange={e => setEditForm(fm => ({ ...fm, tel: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => { saveFournisseurContact(ct, editForm); setEditingContact(null); }}>Sauvegarder</button>
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

  // ── Vue Établissements Affiliés ──────────────────────
  if (section === 'affilies') {
    const q = search.toLowerCase();
    const filteredEtab = etablissementsAffilies.filter(e =>
      !q || e.nom.toLowerCase().includes(q) || e.ville.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    );
    return (
      <Layout title="Contacts" sub={'\u2014 \u00c9tablissements Affili\u00e9s'}>
        <SectionTabs section={section} setSection={setSection} />

        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="text" className="filter-input"
            placeholder="Rechercher un établissement..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 360 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filteredEtab.length + ' \u00e9tablissement' + (filteredEtab.length > 1 ? 's' : '')}
          </span>
        </div>

        {filteredEtab.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">{'Aucun \u00e9tablissement trouv\u00e9'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filteredEtab.map(e => {
              const metaKey = 'etab-' + e.id;
              const meta = allMeta[metaKey] || {};
              const contacts = meta.contacts || [];
              return (
                <div key={e.id} className="card"
                  style={{ borderLeft: '4px solid #D97706', cursor: 'pointer', transition: 'box-shadow 200ms, transform 200ms' }}
                  onClick={() => navigate('/contacts')}
                  onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-2px)'; ev.currentTarget.style.boxShadow = 'var(--e-3)'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.transform = ''; ev.currentTarget.style.boxShadow = ''; }}
                >
                  <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: '#D97706',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
                    }}>
                      {e.type}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{e.nom}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {e.ville + ' \u00b7 ' + e.region}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: contacts.length > 0 ? '#D97706' : 'var(--text-muted)' }}>
                        {contacts.length}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {'contact' + (contacts.length > 1 ? 's' : '')}
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

  // ── Vue liste fournisseurs (import\u00e9s) ─────────────────
  if (section === 'fournisseurs') {
    const q = search.toLowerCase();
    const allFournisseurs = Object.entries(FOURNISSEURS_DATA)
      .map(([nom, data]) => ({ nom, ...data }))
      .filter(f => {
        if (!q) return true;
        return f.nom.toLowerCase().includes(q) ||
          f.contacts.some(c => (c.nom || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.fonction || '').toLowerCase().includes(q)) ||
          f.categories.some(c => c.toLowerCase().includes(q));
      });

    const totalContacts = allFournisseurs.reduce((s, f) => s + f.contacts.length, 0);

    return (
      <Layout title="Contacts">
        <div className="hero-banner">
          <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
            <div className="hero-eyebrow">{'Unicancer \u00b7 Fournisseurs'}</div>
            <div className="hero-title">{'R\u00e9pertoire fournisseurs'}</div>
            <div className="hero-subtitle">
              {allFournisseurs.length + ' entreprises \u2014 ' + totalContacts + ' contacts \u2014 ' + (CATEGORIES_FOURNISSEURS || []).length + ' cat\u00e9gories'}
            </div>
          </div>
        </div>
        <SectionTabs section={section} setSection={setSection} />

        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="text" className="filter-input" placeholder="Rechercher une entreprise, un contact..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 360 }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {allFournisseurs.length + ' entreprise' + (allFournisseurs.length > 1 ? 's' : '')}
          </span>
        </div>

        <div className="table-container" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>{'Cat\u00e9gories'}</th>
                <th>Contacts</th>
                <th>Email</th>
                <th>{'T\u00e9l\u00e9phone'}</th>
              </tr>
            </thead>
            <tbody>
              {allFournisseurs.map(f => {
                if (f.contacts.length === 0) {
                  return (
                    <tr key={f.nom}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{f.nom}</td>
                      <td>{f.categories.map(c => (
                        <span key={c} className="tag" style={{ fontSize: 10, marginRight: 4 }}>{c}</span>
                      ))}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{'\u2014'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{'\u2014'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{'\u2014'}</td>
                    </tr>
                  );
                }
                return f.contacts.map((ct, ci) => (
                  <tr key={f.nom + '-' + ci}>
                    {ci === 0 && (
                      <td rowSpan={f.contacts.length} style={{ fontWeight: 600, fontSize: 13, verticalAlign: 'top' }}>
                        {f.nom}
                        <div style={{ marginTop: 4 }}>
                          {f.categories.map(c => (
                            <span key={c} className="tag" style={{ fontSize: 9, marginRight: 3 }}>{c}</span>
                          ))}
                        </div>
                      </td>
                    )}
                    <td style={{ fontSize: 12 }}>
                      {[ct.prenom, ct.nom].filter(Boolean).join(' ') || '\u2014'}
                      {ct.fonction && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ct.fonction}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {ct.email
                        ? <a href={'mailto:' + ct.email} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{ct.email}</a>
                        : <span style={{ color: 'var(--text-muted)' }}>{'\u2014'}</span>
                      }
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {ct.telephone
                        ? <a href={'tel:' + ct.telephone} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{ct.telephone}</a>
                        : <span style={{ color: 'var(--text-muted)' }}>{'\u2014'}</span>
                      }
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </Layout>
    );
  }

  // ── CLCC list view (main) ─────────────────────────────
  return (
    <Layout title="Contacts">
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div className="hero-eyebrow">{'Unicancer \u00b7 Contacts'}</div>
          <div className="hero-title">Annuaire</div>
          <div className="hero-subtitle">
            {'G\u00e9rez les interlocuteurs des 19 CLCC, \u00e9tablissements affili\u00e9s et fournisseurs.'}
          </div>
          <div className="hero-stats">
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#2D5F8A' }} />
              {enrichedClccs.reduce((s, c) => s + c.totalContacts, 0) + ' contacts'}
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#16A34A' }} />
              {'19 CLCC'}
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#D97706' }} />
              {'33 fonctions'}
            </span>
          </div>
        </div>
      </div>
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
            if (emails.length === 0) { alert('Aucun email trouv\u00e9 pour cette fonction.'); return; }
            window.location.href = buildMailtoUrl(emails, {
              subject: fn + ' \u2014 UNICANCER',
              body: defaultMailBody(fn),
            });
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
            const color = NAVY;
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
                  <ClccLogo clccId={c.id} nom={c.nom} size={60} />
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
