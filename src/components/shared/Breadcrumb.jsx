import { Link, useParams, useLocation } from 'react-router-dom';
import { SECTEURS } from '../../data/mockData';
import { useFindMarche } from '../../context/NewMarchesContext';

const TAB_LABELS = {
  notation:       'Notation',
  analyse:        'AO / Analyse',
  reporting:      'Reporting',
  reponses:       'Réponses',
  infos:          'Informations',
  interlocuteurs: 'Interlocuteurs',
  erp:            'ERP · KPI',
};

export default function Breadcrumb() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const marche = useFindMarche(id);

  const items = [];

  const isMarches = pathname === '/' || pathname.startsWith('/marche');
  if (!isMarches) return null;

  // Root
  items.push({ label: 'Marchés', to: '/' });

  if (id) {
    if (marche) {
      // Secteur
      const secteur = SECTEURS[marche.secteur];
      if (secteur) {
        items.push({ label: secteur.label, to: '/' });
      }

      // Marché
      items.push({ label: marche.nom, to: '/marche/' + id });

      // Tab (last path segment)
      const segments = pathname.split('/').filter(Boolean);
      const tabSlug  = segments[segments.length - 1];
      if (tabSlug && TAB_LABELS[tabSlug]) {
        items.push({ label: TAB_LABELS[tabSlug], to: null });
      }
    }
  }

  // Don't render on root dashboard (single item = not useful)
  if (items.length <= 1) return null;

  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      {items.map((item, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {item.to ? (
            <Link to={item.to} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
