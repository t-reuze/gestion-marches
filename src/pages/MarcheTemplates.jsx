import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import MarcheNavTabs from '../components/MarcheNavTabs';
import DocTemplatesTab from '../features/ao/DocTemplatesTab';
import { marches } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

export default function MarcheTemplates() {
  const { id } = useParams();
  const { getMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);
  const meta = getMeta(id);
  const nom = meta.nom || marche?.nom || id;

  // Récupérer les fournisseurs depuis le localStorage (annuaire scanné)
  const annuaire = meta.fournisseurs || [];

  return (
    <Layout title={nom} sub="— Templates documents">
      <MarcheNavTabs />
      <DocTemplatesTab marcheId={id} annuaire={annuaire} />
    </Layout>
  );
}
