import Layout from '../components/Layout';
import { formations } from '../data/mockData';

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

function TableFormations({ rows }) {
  return (
    <div className="table-container" style={{ marginBottom: 28 }}>
      <table>
        <thead>
          <tr>
            <th>Domaine</th>
            <th>Date d&#x27;&#xe9;ch&#xe9;ance</th>
            <th className="td-center">Renouvellement 2026&#x2013;2027</th>
            <th>Responsable p&#xe9;dagogique CLCC / Ext&#xe9;rieur</th>
            <th>Contact</th>
            <th>Commentaires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(f => (
            <tr key={f.id}>
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
              <td style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{f.commentaires || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Formations() {
  const aRenouveler = formations.filter(f => f.renouvellement);
  const autres      = formations.filter(f => !f.renouvellement);

  return (
    <Layout title="Formations" sub="— Formations à renouveler et en cours">
      <div className="section-title">&#x1F4DA; Formations &#xe0; renouveler et formations en cours</div>
      <TableFormations rows={aRenouveler} />

      {autres.length > 0 && (
        <>
          <div className="section-title">&#x1F4C5; Autres formations suivies</div>
          <TableFormations rows={autres} />
        </>
      )}
    </Layout>
  );
}
