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
    : path.includes('/notation')  ? 'notation'
    : path.includes('/reporting') ? 'reporting'
    : 'notation';

  const tabList = [
    { key: 'notation',  label: '\u270f\ufe0f Notation',               path: '/marche/' + id + '/notation',  show: true },
    { key: 'reponses',  label: '\ud83d\udccb R\u00e9ponses fournisseurs', path: '/marche/' + id + '/reponses',  show: !!getSession(id) },
    { key: 'reporting', label: '\ud83d\udcc8 Reporting',               path: '/marche/' + id + '/reporting', show: marche.hasReporting },
  ].filter(t => t.show);

  if (tabList.length <= 1) return null;

  return (
    <div className="marche-tabs">
      {tabList.map(t => (
        <div
          key={t.key}
          className={'marche-tab' + (active === t.key ? ' active' : '')}
          onClick={() => navigate(t.path)}
        >{t.label}</div>
      ))}
    </div>
  );
}
