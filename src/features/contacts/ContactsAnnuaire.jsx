import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { marches, formations } from '../../data/mockData';

function parseContacts(str) {
  if (!str) return [];
  return str.split(/[/,]/).map(s => s.trim()).filter(Boolean);
}

function buildAnnuaire() {
  const map = {};

  marches.forEach(m => {
    if (!m.responsable) return;
    parseContacts(m.responsable).forEach(nom => {
      if (!map[nom]) map[nom] = { marches: [], formations: [] };
      map[nom].marches.push({ id: m.id, reference: m.reference, nom: m.nom });
    });
  });

  formations.forEach(f => {
    if (!f.contact) return;
    parseContacts(f.contact).forEach(nom => {
      if (!map[nom]) map[nom] = { marches: [], formations: [] };
      map[nom].formations.push({ id: f.id, nom: f.nom });
    });
  });

  return Object.entries(map)
    .map(([nom, data]) => ({ nom, ...data }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

function initials(nom) {
  return nom.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const COLORS = ['#1A4FA8', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0891B2', '#DB2777'];

export default function ContactsAnnuaire() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const annuaire = useMemo(buildAnnuaire, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return annuaire.filter(c =>
      !q ||
      c.nom.toLowerCase().includes(q) ||
      c.marches.some(m => m.nom.toLowerCase().includes(q) || m.reference.toLowerCase().includes(q)) ||
      c.formations.some(f => f.nom.toLowerCase().includes(q))
    );
  }, [annuaire, search]);

  return (
    <Layout title="Contacts" sub="— Annuaire des interlocuteurs">
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          placeholder="Rechercher un contact, un marché…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, maxWidth: 360, padding: '8px 12px',
            border: '1.5px solid var(--border)', borderRadius: 8,
            fontSize: 13, background: 'var(--bg-main)', color: 'var(--text)',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} contact{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <div className="empty-title">Aucun contact trouvé</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map((c, i) => {
            const color = COLORS[i % COLORS.length];
            const total = c.marches.length + c.formations.length;
            return (
              <div key={c.nom} className="card" style={{ borderTop: '3px solid ' + color }}>
                <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0,
                  }}>
                    {initials(c.nom)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{c.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {total} responsabilité{total > 1 ? 's' : ''}
                    </div>

                    {c.marches.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Marchés
                        </div>
                        {c.marches.map(m => (
                          <div
                            key={m.id}
                            onClick={() => navigate('/marche/' + m.id)}
                            style={{
                              fontSize: 11, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                              background: 'var(--bg-alt)', marginBottom: 2, display: 'flex', gap: 6,
                            }}
                          >
                            <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--blue)', fontWeight: 700 }}>{m.reference}</span>
                            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nom}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {c.formations.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#10B981', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Formations
                        </div>
                        {c.formations.map(f => (
                          <div
                            key={f.id}
                            onClick={() => navigate('/formations/' + f.id)}
                            style={{
                              fontSize: 11, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                              background: 'var(--bg-alt)', marginBottom: 2,
                            }}
                          >
                            {f.nom}
                          </div>
                        ))}
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
