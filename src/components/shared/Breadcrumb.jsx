import { Link, useParams, useLocation } from 'react-router-dom';
import { marches, SECTEURS } from '../../data/mockData';

const TAB_LABELS = {
  analyse:        'AO / Analyse',
  notation:       'Notation',
  reponses:       'Réponses fournisseurs',
  infos:          'Informations',
  reporting:      'Reporting',
  interlocuteurs: 'Interlocuteurs',
  erp:            'ERP · KPI',
};

export default function Breadcrumb() {
  const { id } = useParams();
  const location = useLocation();
  const path = location.pathname;

  const crumbs = [{ label: 'Marchés', to: '/' }];

  if (id) {
    const marche = marches.find(m => m.id === id);
    if (marche) {
      const secteur = SECTEURS[marche.secteur];
      if (secteur) {
        crumbs.push({ label: secteur.label, to: '/?secteur=' + marche.secteur });
      }
      crumbs.push({ label: marche.nom, to: '/marche/' + id + '/analyse' });

      const tab = Object.keys(TAB_LABELS).find(t => path.includes('/' + t));
      if (tab) {
        crumbs.push({ label: TAB_LABELS[tab] });
      }
    }
  } else if (path.includes('/formations')) {
    crumbs.length = 0;
    crumbs.push({ label: 'Formations', to: '/formations' });
    if (path.match(/\/formations\/.+/)) {
      crumbs.push({ label: 'Détail' });
    }
  } else if (path.includes('/reporting')) {
    crumbs.length = 0;
    crumbs.push({ label: 'Reporting' });
  } else if (path.includes('/contacts')) {
    crumbs.length = 0;
    crumbs.push({ label: 'Contacts' });
  }

  if (crumbs.length <= 1) return null;

  return (
    <div className="breadcrumb">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="breadcrumb-item">
            {i > 0 && <span className="breadcrumb-sep">›</span>}
            {isLast || !crumb.to ? (
              <span className="breadcrumb-current">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="breadcrumb-link">{crumb.label}</Link>
            )}
          </span>
        );
      })}
    </div>
  );
}
