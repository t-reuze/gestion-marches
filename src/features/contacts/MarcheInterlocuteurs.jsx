import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import { marches } from '../../data/mockData';

export default function MarcheInterlocuteurs() {
  const { id } = useParams();
  const marche = marches.find(m => m.id === id);

  return (
    <Layout title={marche?.nom || 'Interlocuteurs'} sub="Interlocuteurs">
      <MarcheNavTabs />
      <div className="empty-state">
        <div className="empty-icon">👤</div>
        <div className="empty-title">Interlocuteurs du marché</div>
        <div className="empty-sub">
          Contacts fournisseurs et référents internes.<br />
          En cours de développement (Phase 2).
        </div>
      </div>
    </Layout>
  );
}
