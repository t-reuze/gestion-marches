import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import MarcheNavTabs from '../components/MarcheNavTabs';
import { marches } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

function initials(s) {
  return s.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function MarcheContactsFournisseurs() {
  const { id } = useParams();
  const { getMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);
  const meta = getMeta(id);
  const nom = meta.nom || marche?.nom || id;
  const fournisseurs = meta.fournisseurs || [];

  const [search, setSearch] = useState('');
  const [expandedSup, setExpandedSup] = useState(null);

  // Extraire les contacts depuis l'annuaire
  const suppliers = useMemo(() => {
    return fournisseurs.map(row => {
      const contacts = row._contacts || [];
      const mainContact = {
        prenom: row.PRENOM || '', nom: row.NOM || '',
        fonction: row.FONCTION || '', tel: row.TEL || '', mail: row.MAIL || '',
      };
      const allContacts = contacts.length ? contacts : (mainContact.mail || mainContact.tel ? [mainContact] : []);
      return {
        name: row['Nom fournisseur'] || '',
        contacts: allContacts,
        hasContact: allContacts.length > 0,
        lotPositionnes: row['Lots positionnés'] || '',
      };
    }).filter(s => s.name);
  }, [fournisseurs]);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.contacts.some(c => (c.nom || '').toLowerCase().includes(q) || (c.mail || '').toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const totalContacts = suppliers.reduce((s, sup) => s + sup.contacts.length, 0);
  const withEmail = suppliers.filter(s => s.contacts.some(c => c.mail)).length;

  return (
    <Layout title={nom} sub="— Contacts fournisseurs">
      <MarcheNavTabs />

      {fournisseurs.length === 0 ? (
        <div className="empty-state" style={{ padding: 60 }}>
          <div className="empty-title">Aucun fournisseur</div>
          <div className="empty-sub" style={{ marginTop: 8, color: '#6b7280' }}>
            Lancez d'abord une analyse dans l'onglet Analyse pour detecter les fournisseurs et leurs contacts.
          </div>
        </div>
      ) : (
        <div className="fade-in">
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '12px 20px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', flex: 1, minWidth: 130 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8' }}>{suppliers.length}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Fournisseurs</div>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', flex: 1, minWidth: 130 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{totalContacts}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Contacts</div>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: 10, background: '#faf5ff', border: '1px solid #e9d5ff', flex: 1, minWidth: 130 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{withEmail}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Avec email</div>
            </div>
          </div>

          {/* Search */}
          <input
            type="text" placeholder="Rechercher un fournisseur ou contact..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', maxWidth: 400, padding: '8px 14px', fontSize: 13, marginBottom: 16,
              border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none',
            }}
          />

          {/* Supplier cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {filtered.map(sup => (
              <div key={sup.name} style={{
                borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div
                  style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    background: '#f9fafb', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                  }}
                  onClick={() => setExpandedSup(expandedSup === sup.name ? null : sup.name)}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#001E45',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(sup.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{sup.name}</div>
                    {sup.lotPositionnes && sup.lotPositionnes !== '—' && (
                      <div style={{ fontSize: 11, color: '#6b7280' }}>Lots : {sup.lotPositionnes}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: sup.hasContact ? '#ecfdf5' : '#fef2f2',
                    color: sup.hasContact ? '#047857' : '#dc2626',
                    fontWeight: 600,
                  }}>
                    {sup.contacts.length} contact{sup.contacts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Contacts */}
                {sup.contacts.length > 0 && (
                  <div style={{ padding: '0' }}>
                    {sup.contacts.slice(0, expandedSup === sup.name ? undefined : 2).map((c, i) => (
                      <div key={i} style={{
                        padding: '8px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>
                            {[c.prenom, c.nom].filter(Boolean).join(' ') || 'Contact'}
                          </div>
                          {c.fonction && <div style={{ color: '#6b7280', fontSize: 11 }}>{c.fonction}</div>}
                        </div>
                        {c.mail && (
                          <a href={'mailto:' + c.mail} style={{ color: '#2563eb', fontSize: 11, textDecoration: 'none' }}
                            title={c.mail}>
                            {c.mail}
                          </a>
                        )}
                        {c.tel && (
                          <a href={'tel:' + c.tel} style={{ color: '#6b7280', fontSize: 11, textDecoration: 'none' }}>
                            {c.tel}
                          </a>
                        )}
                      </div>
                    ))}
                    {sup.contacts.length > 2 && expandedSup !== sup.name && (
                      <div style={{ padding: '4px 16px 8px', fontSize: 11, color: '#3b82f6', cursor: 'pointer' }}
                        onClick={() => setExpandedSup(sup.name)}>
                        + {sup.contacts.length - 2} autres contacts
                      </div>
                    )}
                  </div>
                )}

                {!sup.hasContact && (
                  <div style={{ padding: '10px 16px', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                    Aucun contact detecte
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
