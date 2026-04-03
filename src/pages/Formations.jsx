import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { formations } from '../data/mockData';
import { useFormationsMeta } from '../context/FormationsMetaContext';

function formatDateFormation(d) {
  if (!d) return '—';
  if (!d.includes('-')) return d;
  const [y, m, day] = d.split('-');
  if (!day) return d;
  return day + '/' + m + '/' + y;
}

function isUrgent(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
  return d <= sixMonths;
}

function BadgeOui() {
  return <span style={{ display: 'inline-block', background: '#D1FAE5', color: '#065F46', borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Oui</span>;
}

const STATUTS_F_COLORS = { planifie: '#64748B', inscriptions: '#10B981', en_cours: '#F59E0B', termine: '#8B5CF6', annule: '#EF4444' };
const STATUTS_F_LABELS = { planifie: 'Planifié', inscriptions: 'Inscriptions ouvertes', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' };

function TableFormations({ rows, metas, navigate }) {
  return (
    <div className="table-container" style={{ marginBottom: 28 }}>
      <table>
        <thead>
          <tr>
            <th>Domaine</th>
            <th>Date d&#x27;échéance</th>
            <th className="td-center">Renouvellement 2026&#x2013;2027</th>
            <th>Responsable pédagogique CLCC / Extérieur</th>
            <th>Contact</th>
            <th>Statut</th><th>Commentaires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(f => (
            <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => navigate("/formations/" + f.id)}>
              <td style={{ fontWeight: 600, fontSize: 13 }}>{f.nom}</td>
              <td style={{
                fontFamily: 'DM Mono,monospace', fontSize: 12, whiteSpace: 'nowrap',
                color: isUrgent(f.dateEcheance) ? '#EF4444' : 'inherit',
              }}>
                {formatDateFormation(f.dateEcheance)}
              </td>
              <td className="td-center">
                {f.renouvellement
                  ? <BadgeOui />
                  : <span style={{ display: 'inline-block', background: '#F1F5F9', color: '#64748B', borderRadius: 12, padding: '2px 10px', fontSize: 11 }}>—</span>
                }
              </td>
              <td style={{ fontSize: 12 }}>{f.responsablePedagogique || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
              <td style={{ fontSize: 12, fontWeight: 500 }}>{f.contact || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
              <td>{(() => { const m = metas[f.id] || {}; const s = m.statut; return s ? <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: (STATUTS_F_COLORS[s] || '#64748B') + '22', color: STATUTS_F_COLORS[s] || '#64748B' }}>{STATUTS_F_LABELS[s] || s}</span> : null; })()}</td><td style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{f.commentaires || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Formations() {
  const navigate = useNavigate();
  const { getMeta } = useFormationsMeta();
  const metas = Object.fromEntries(formations.map(f => [f.id, getMeta(f.id)]));
  const aRenouveler = formations.filter(f => f.renouvellement);
  const autres      = formations.filter(f => !f.renouvellement);

  return (
    <Layout title="Formations" sub="— Formations à renouveler et en cours">
      <div className="section-title">Formations à renouveler et formations en cours</div>
      <TableFormations rows={aRenouveler} metas={metas} navigate={navigate} />

      {autres.length > 0 && (
        <>
          <div className="section-title">Autres formations suivies</div>
          <TableFormations rows={autres} metas={metas} navigate={navigate} />
        </>
      )}
    </Layout>
  );
}
