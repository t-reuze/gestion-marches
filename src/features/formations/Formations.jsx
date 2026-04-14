import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formations } from '../../data/mockData';
import { useFormationsMeta } from '../../context/FormationsMetaContext';

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

const STATUTS_F_COLORS = { planifie: '#64748B', inscriptions: '#10B981', en_cours: '#F59E0B', termine: '#8B5CF6', annule: '#EF4444' };
const STATUTS_F_LABELS = { planifie: 'Planifié', inscriptions: 'Inscriptions ouvertes', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' };

function BadgeRenew({ yes }) {
  if (yes) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', color: '#065F46',
      borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 600,
      boxShadow: '0 1px 3px rgba(6,95,70,.12)',
    }}>
      <span style={{ fontSize: 13 }}>✓</span> Oui
    </span>
  );
  return (
    <span style={{
      display: 'inline-block', background: 'var(--surface-subtle)',
      color: 'var(--text-3)', borderRadius: 20, padding: '4px 14px', fontSize: 11,
    }}>—</span>
  );
}

function StatusBadge({ statut }) {
  if (!statut) return null;
  const color = STATUTS_F_COLORS[statut] || '#64748B';
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: color + '15',
      color, border: `1px solid ${color}30`,
    }}>
      {STATUTS_F_LABELS[statut] || statut}
    </span>
  );
}

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
            <th>Statut</th>
            <th>Commentaires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(f => {
            const m = metas[f.id] || {};
            const urgent = isUrgent(f.dateEcheance);
            return (
              <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/formations/' + f.id)}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{f.nom}</td>
                <td style={{
                  fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap',
                  color: urgent ? '#EF4444' : 'var(--text-2)',
                }}>
                  {formatDateFormation(f.dateEcheance)}
                </td>
                <td className="td-center">
                  <BadgeRenew yes={f.renouvellement} />
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                  {f.responsablePedagogique || <span style={{ color: 'var(--text-3)' }}>—</span>}
                </td>
                <td style={{ fontSize: 12.5, fontWeight: 500 }}>
                  {f.contact || <span style={{ color: 'var(--text-3)' }}>—</span>}
                </td>
                <td><StatusBadge statut={m.statut} /></td>
                <td style={{ fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic', maxWidth: 220 }}>
                  {f.commentaires || '—'}
                </td>
              </tr>
            );
          })}
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
