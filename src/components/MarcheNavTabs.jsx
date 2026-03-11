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
  const active = path.includes('/reponses')  ? 'reponses'
    : path.includes('/infos')     ? 'infos'
    : path.includes('/notation')  ? 'notation'
    : path.includes('/analyse')   ? 'analyse'
    : path.includes('/reporting') ? 'reporting'
    : 'notation';

  const tabList = [
    { key: 'notation',  label: '&#x270F;&#xFE0F; Notation',               path: '/marche/' + id + '/notation',  show: true },
    { key: 'reponses',  label: '&#x1F4CB; Réponses fournisseurs',   path: '/marche/' + id + '/reponses',  show: !!getSession(id) },
    { key: 'infos',     label: '&#x2139;&#xFE0F; Informations',           path: '/marche/' + id + '/infos',     show: true },
    { key: 'reporting', label: '&#x1F4C8; Reporting',                     path: '/marche/' + id + '/reporting', show: marche.hasReporting },
    { key: 'analyse',   label: '&#x1F50D; Analyse offres',                 path: '/marche/' + id + '/analyse',   show: id === 'bio-mol' || marche.hasAnalyse },
  ].filter(t => t.show);

  return (
    <div className="marche-tabs">
      {tabList.map(t => (
        <div
          key={t.key}
          className={'marche-tab' + (active === t.key ? ' active' : '')}
          onClick={() => navigate(t.path)}
          dangerouslySetInnerHTML={{ __html: t.label }}
        />
      ))}
    </div>
  );
}
