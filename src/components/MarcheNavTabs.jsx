import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNotation } from '../context/NotationContext';
import { useMarcheMeta } from '../context/MarcheMetaContext';
import { marches } from '../data/mockData';

const WORKFLOW_STEPS = [
  { key: 'sourcing', label: 'Sourcing', num: 1, path: id => '/marche/' + id + '/sourcing' },
  { key: 'analyse',  label: 'Analyse',  num: 2, path: id => '/marche/' + id + '/analyse' },
  { key: 'notation', label: 'Notation', num: 3, path: id => '/marche/' + id + '/notation' },
];

const ACCENT = '#E8501A';

function activeFromPath(path) {
  if (path.includes('/sourcing'))              return 'sourcing';
  if (path.includes('/analyse'))               return 'analyse';
  if (path.includes('/notation'))              return 'notation';
  if (path.includes('/reponses'))              return 'reponses';
  if (path.includes('/templates'))             return 'templates';
  if (path.includes('/contacts-fournisseurs')) return 'contacts-fournisseurs';
  if (path.includes('/infos'))                 return 'infos';
  if (path.includes('/reporting'))             return 'reporting';
  if (path.includes('/interlocuteurs'))        return 'interlocuteurs';
  return 'notation';
}

export default function MarcheNavTabs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getSession } = useNotation();
  const { getMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);
  if (!marche) return null;

  const active = activeFromPath(location.pathname);
  const workflowSteps = (getMeta(id).workflowSteps) || {};

  const dockItems = [
    { key: 'templates',             label: 'Templates',             path: '/marche/' + id + '/templates',             show: true },
    { key: 'contacts-fournisseurs', label: 'Contacts fournisseurs', path: '/marche/' + id + '/contacts-fournisseurs', show: true },
    { key: 'infos',                 label: 'Informations',          path: '/marche/' + id + '/infos',                 show: true },
    { key: 'interlocuteurs',        label: 'Interlocuteurs',        path: '/marche/' + id + '/interlocuteurs',        show: true },
    { key: 'reponses',              label: 'Réponses fournisseurs', path: '/marche/' + id + '/reponses',              show: !!getSession(id) },
    { key: 'reporting',             label: 'Reporting',             path: '/marche/' + id + '/reporting',             show: true },
  ].filter(d => d.show);

  // Tous les onglets pour les raccourcis clavier
  const allTabs = [
    ...WORKFLOW_STEPS.map(s => ({ key: s.key, path: s.path(id) })),
    ...dockItems,
  ];

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= allTabs.length) {
        e.preventDefault();
        navigate(allTabs[num - 1].path);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [allTabs, navigate]);

  return (
    <div className="marche-nav-wrapper">
      {/* Frise workflow */}
      <div className="workflow-frise" role="tablist" aria-label="Workflow du marché">
        {WORKFLOW_STEPS.map((step, i) => {
          const isActive = active === step.key;
          const isDone   = !!workflowSteps[step.key];
          const state = isActive ? 'active' : isDone ? 'done' : 'pending';
          const isLast = i === WORKFLOW_STEPS.length - 1;
          return (
            <div key={step.key} className="workflow-step-wrapper">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={'workflow-step workflow-step--' + state}
                onClick={() => navigate(step.path(id))}
                title={`${step.label} (${step.num})`}
              >
                <span className="workflow-step-num">{isDone && !isActive ? '✓' : step.num}</span>
                <span className="workflow-step-label">{step.label}</span>
              </button>
              {!isLast && (
                <span className={'workflow-connector ' + (isDone ? 'workflow-connector--done' : '')} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {/* Dock vues contextuelles */}
      <div className="workflow-dock" role="tablist" aria-label="Autres vues du marché">
        {dockItems.map((item, i) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active === item.key}
            className={'dock-link' + (active === item.key ? ' dock-link--active' : '')}
            onClick={() => navigate(item.path)}
            title={`${item.label} (${WORKFLOW_STEPS.length + i + 1})`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { ACCENT };
