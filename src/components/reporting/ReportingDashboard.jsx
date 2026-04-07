import { useState, useMemo } from 'react';
import { useReportingData } from '../../context/ReportingDataContext';
import { APP_ID_TO_MARCHE } from '../../data/reportingConstants';
import ExcelUploadZone from './ExcelUploadZone';
import ReportingFilters from './ReportingFilters';
import ReportingKpis from './ReportingKpis';
import ReportingCharts from './ReportingCharts';

export default function ReportingDashboard({ marcheId }) {
  const { rows, meta } = useReportingData();

  // Initialiser les années sélectionnées avec toutes les années disponibles
  const allYears = useMemo(() => (meta?.years || []).map(String).sort(), [meta]);
  const [filters, setFilters] = useState(null);

  // Au premier rendu avec données, initialiser les filtres
  const activeFilters = useMemo(() => {
    if (filters) return filters;
    return { annees: [...allYears], clcc: [], marche: [], fournisseur: [], typeEquipement: [] };
  }, [filters, allYears]);

  // Reset les filtres quand les données changent (nouveau fichier uploadé)
  function handleFiltersChange(newFilters) {
    setFilters(newFilters);
  }

  // Pré-filtrage par marché si on est en vue par marché
  const marcheFilteredRows = useMemo(() => {
    if (!marcheId) return rows;
    const marcheLabels = APP_ID_TO_MARCHE[marcheId];
    if (!marcheLabels || marcheLabels.length === 0) return rows;
    return rows.filter(r => marcheLabels.includes(r.marcheGroupe));
  }, [rows, marcheId]);

  // Application des filtres utilisateur
  const filteredRows = useMemo(() => {
    let result = marcheFilteredRows;

    // Filtre années
    if (activeFilters.annees.length > 0 && activeFilters.annees.length < allYears.length) {
      result = result.filter(r => activeFilters.annees.includes(String(r.annee)));
    } else if (activeFilters.annees.length === 0) {
      result = [];
    }

    // Filtres dimensions
    if (activeFilters.clcc.length > 0) result = result.filter(r => activeFilters.clcc.includes(r.clcc));
    if (activeFilters.marche.length > 0) result = result.filter(r => activeFilters.marche.includes(r.marcheGroupe));
    if (activeFilters.fournisseur.length > 0) result = result.filter(r => activeFilters.fournisseur.includes(r.fournisseur));
    if (activeFilters.typeEquipement.length > 0) result = result.filter(r => activeFilters.typeEquipement.includes(r.typeEquipement));

    return result;
  }, [marcheFilteredRows, activeFilters, allYears]);

  // Méta pour les dropdowns (reflète le pré-filtrage marché)
  const filteredMeta = useMemo(() => {
    if (!meta) return null;
    const r = marcheFilteredRows;
    return {
      years: [...new Set(r.map(row => row.annee).filter(Boolean))].sort(),
      clccs: [...new Set(r.map(row => row.clcc).filter(Boolean))].sort(),
      marches: [...new Set(r.map(row => row.marcheGroupe).filter(Boolean))].sort(),
      fournisseurs: [...new Set(r.map(row => row.fournisseur).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })),
      typesEquipement: [...new Set(r.map(row => row.typeEquipement).filter(Boolean))].sort(),
    };
  }, [marcheFilteredRows, meta]);

  const hasData = rows.length > 0;

  return (
    <div className="reporting-dashboard">
      <ExcelUploadZone />

      {hasData ? (
        <>
          <ReportingFilters meta={filteredMeta} filters={activeFilters} onFiltersChange={handleFiltersChange} />
          <ReportingKpis rows={filteredRows} />
          <ReportingCharts rows={filteredRows} />
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">&#128200;</div>
          <div className="empty-state-text">Chargez un fichier Excel pour afficher le reporting</div>
        </div>
      )}
    </div>
  );
}
