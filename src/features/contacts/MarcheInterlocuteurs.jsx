import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import { marches } from '../../data/mockData';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

export default function MarcheInterlocuteurs() {
  const { id } = useParams();
  const { getMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);
  if (!marche) return null;

  const meta = getMeta(id);
  const responsable = meta.responsable || marche.responsable || '—';

  return (
    <Layout title={marche.nom} sub={marche.reference + ' · Interlocuteurs'}>
      <MarcheNavTabs />

      <div className="card" style={{ marginTop: 20, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Interlocuteurs du marché</h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Rôle</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Email</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Téléphone</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>Responsable marché</td>
              <td style={{ padding: '10px 12px' }}>{responsable}</td>
              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>—</td>
              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>—</td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
          Cette page sera enrichie avec les interlocuteurs fournisseurs, les contacts établissements et les référents techniques.
        </p>
      </div>
    </Layout>
  );
}
