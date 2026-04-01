import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import { marches } from '../../data/mockData';

export default function ErpKpi() {
  const { id } = useParams();
  const marche = marches.find(m => m.id === id);

  return (
    <Layout title={marche?.nom || 'ERP · KPI'} sub="ERP · KPI">
      <MarcheNavTabs />
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div className="empty-title">ERP · KPI</div>
        <div className="empty-sub">
          Indicateurs de performance et données ERP.<br />
          En cours de développement (Phase 3).
        </div>
      </div>
    </Layout>
  );
}
