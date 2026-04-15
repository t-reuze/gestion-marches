import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { marches } from '../data/mockData';
import { useNotation } from '../context/NotationContext';

/* ── Helpers ───────────────────────────────────────────────── */

function scoreColor(n) {
  if (n >= 4) return '#10B981';
  if (n >= 3) return '#3B82F6';
  if (n >= 2) return '#F59E0B';
  return '#EF4444';
}

function computeVendorAvg(session, vendorName) {
  if (!session?.questions?.length) return null;
  let sum = 0, count = 0;
  session.questions.forEach(q => {
    if (q.skipped?.[vendorName]) return;
    const n = q.notes?.[vendorName];
    if (n != null && !isNaN(n)) { sum += n; count++; }
  });
  return count > 0 ? sum / count : null;
}

/* ── Component ─────────────────────────────────────────────── */

export default function Fournisseurs() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { getSession } = useNotation();

  /* Aggregate supplier data across all marchés */
  const suppliers = useMemo(() => {
    const map = {}; // vendorName → { name, initials, color, marches: [{id, nom, avg}], overallAvg }

    marches.forEach(m => {
      const session = getSession(m.id);
      if (!session?.vendors?.length) return;

      session.vendors.forEach(v => {
        const avg = computeVendorAvg(session, v.name);
        if (avg == null) return;

        if (!map[v.name]) {
          map[v.name] = {
            name: v.name,
            label: v.label || v.name,
            initials: v.initials || v.name.substring(0, 2).toUpperCase(),
            color: v.color || '#64748B',
            marches: [],
          };
        }
        map[v.name].marches.push({ id: m.id, nom: m.nom, avg });
      });
    });

    // Compute overall average for each supplier
    Object.values(map).forEach(s => {
      const total = s.marches.reduce((acc, m) => acc + m.avg, 0);
      s.overallAvg = total / s.marches.length;
    });

    // Sort by overall average descending
    return Object.values(map).sort((a, b) => b.overallAvg - a.overallAvg);
  }, [getSession]);

  const filtered = suppliers.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  const hasData = suppliers.length > 0;

  return (
    <Layout>
      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div className="hero-eyebrow">Unicancer · Fournisseurs</div>
          <div className="hero-title">Comparatif fournisseurs</div>
          <div className="hero-subtitle">
            {hasData
              ? `${suppliers.length} fournisseur${suppliers.length > 1 ? 's' : ''} évalué${suppliers.length > 1 ? 's' : ''} sur ${new Set(suppliers.flatMap(s => s.marches.map(m => m.id))).size} marché${new Set(suppliers.flatMap(s => s.marches.map(m => m.id))).size > 1 ? 's' : ''}`
              : 'Vue agrégée des évaluations fournisseurs'}
          </div>
        </div>
      </div>

      {!hasData ? (
        /* ── Empty state ──────────────────────────────────────── */
        <div className="empty-state">
          <div className="empty-title">Aucun fournisseur évalué pour le moment</div>
          <div className="empty-sub">
            Les fournisseurs apparaîtront ici après avoir noté des offres dans l'onglet Notation d'un marché.
          </div>
        </div>
      ) : (
        <>
          {/* ── Search ──────────────────────────────────────────── */}
          <div className="filters-row">
            <input
              className="filter-input"
              type="text"
              placeholder="Rechercher un fournisseur…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">Aucun résultat</div>
              <div className="empty-sub">Aucun fournisseur ne correspond à « {search} ».</div>
            </div>
          ) : (
            <div className="marche-grid">
              {filtered.map(supplier => {
                const maxScore = Math.max(...supplier.marches.map(m => m.avg));
                return (
                  <div className="card" key={supplier.name}>
                    <div className="card-body">
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        {/* Initials circle */}
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: supplier.color, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 16, flexShrink: 0,
                          letterSpacing: 0.5,
                        }}>
                          {supplier.initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {supplier.label}
                          </div>
                          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                            {supplier.marches.length} marché{supplier.marches.length > 1 ? 's' : ''}
                          </div>
                        </div>
                        {/* Overall score */}
                        <div style={{
                          fontSize: 28, fontWeight: 800, lineHeight: 1,
                          color: scoreColor(supplier.overallAvg),
                          textAlign: 'right', flexShrink: 0,
                        }}>
                          {supplier.overallAvg.toFixed(1)}
                          <div style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', marginTop: 2 }}>
                            /5 moy.
                          </div>
                        </div>
                      </div>

                      {/* Marchés list with mini bars */}
                      <div className="section-heading" style={{ fontSize: 12, marginBottom: 8 }}>
                        Détail par marché
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {supplier.marches
                          .sort((a, b) => b.avg - a.avg)
                          .map(m => (
                            <div
                              key={m.id}
                              onClick={() => navigate(`/marche/${m.id}/notation`)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
                                transition: 'background .15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {/* Marché name */}
                              <div style={{
                                flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                color: '#334155',
                              }}>
                                {m.nom}
                              </div>
                              {/* Mini bar */}
                              <div style={{
                                width: 80, height: 8, borderRadius: 4,
                                background: '#F1F5F9', overflow: 'hidden', flexShrink: 0,
                              }}>
                                <div style={{
                                  width: `${(m.avg / 5) * 100}%`,
                                  height: '100%', borderRadius: 4,
                                  background: scoreColor(m.avg),
                                  transition: 'width .3s ease',
                                }} />
                              </div>
                              {/* Score */}
                              <div style={{
                                fontSize: 13, fontWeight: 700, width: 32, textAlign: 'right',
                                color: scoreColor(m.avg),
                              }}>
                                {m.avg.toFixed(1)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
