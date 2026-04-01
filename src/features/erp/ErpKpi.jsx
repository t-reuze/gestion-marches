import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import EmptyState from '../../components/EmptyState';
import { marches } from '../../data/mockData';

export default function ErpKpi() {
  const { id } = useParams();
  const marche = marches.find(m => m.id === id);
  if (!marche) return null;

  return (
    <Layout title={marche.nom} sub={marche.reference + ' · ERP · KPI'}>
      <MarcheNavTabs />
      <div style={{ marginTop: 20 }}>
        <EmptyState
          title="ERP · KPI"
          message="Cette section permettra de suivre les indicateurs ERP et KPI du marché. Fonctionnalité à venir."
        />
      </div>
    </Layout>
  );
}
