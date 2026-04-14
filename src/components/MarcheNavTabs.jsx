import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNotation } from '../context/NotationContext';
import { marches } from '../data/mockData';

export default function MarcheNavTabs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getSession } = useNotation();
  const marche = marches.find(m => m.id === id);
  if (!marche) return null;

  const path = location.pathname;
  const active = path.includes('/reponses')       ? 'reponses'
    : path.includes('/infos')                     ? 'infos'
    : path.includes('/notation')                  ? 'notation'
    : path.includes('/analyse')                   ? 'analyse'
    : path.includes('/reporting')                 ? 'reporting'
    : path.includes('/interlocuteurs')            ? 'interlocuteurs'
    : path.includes('/erp')                       ? 'erp'
    : 'notation';

  const tabList = [
    { key: 'analyse',        label: 'Analyse',               path: '/marche/' + id + '/analyse',        show: true },
    { key: 'notation',       label: 'Notation',              path: '/marche/' + id + '/notation',       show: true },
    { key: 'reponses',       label: 'Réponses fournisseurs', path: '/marche/' + id + '/reponses',       show: !!getSession(id) },
    { key: 'infos',          label: 'Informations',          path: '/marche/' + id + '/infos',          show: true },
    { key: 'reporting',      label: 'Reporting',             path: '/marche/' + id + '/reporting',      show: marche.hasReporting },
    { key: 'interlocuteurs', label: 'Interlocuteurs',        path: '/marche/' + id + '/interlocuteurs', show: true },
    { key: 'erp',            label: 'ERP · KPI',             path: '/marche/' + id + '/erp',            show: true },
  ].filter(t => t.show);

  return (
    <div className="marche-tabs">
      {tabList.map(t => (
        <div
          key={t.key}
          className={'marche-tab' + (active === t.key ? ' active' : '')}
          onClick={() => navigate(t.path)}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
