import { useState, useMemo } from 'react';
import { useReportingData } from '../../context/ReportingDataContext';
import { APP_ID_TO_MARCHE } from '../../data/reportingConstants';
import ExcelUploadZone from './ExcelUploadZone';
import ReportingFilters from './ReportingFilters';
import MaintenanceKpis from './MaintenanceKpis';
import MaintenanceRenewals from './MaintenanceRenewals';
import MaintenanceCharts from './MaintenanceCharts';

export default function ReportingMaintenance({ marcheId }) {
  const { rows, meta } = useReportingData();

  const allYears = useMemo(() => (meta?.years || []).map(String).sort(), [meta]);
  const [filters, setFilters] = useState(null);

  const activeFilters = useMemo(() => {
    if (filters) return filters;
    return { annees: [...allYears], clcc: [], marche: [], fournisseur: [], typeEquipement: [] };
  }, [filters, allYears]);

  // Pré-filtrage par marché
  const marcheFilteredRows = useMemo(() => {
    if (!marcheId) return rows;
    const marcheLabels = APP_ID_TO_MARCHE[marcheId];
    if (!marcheLabels || marcheLabels.length === 0) return rows;
    return rows.filter(r => marcheLabels.includes(r.marcheGroupe));
  }, [rows, marcheId]);

  // Application des filtres
  const filteredRows = useMemo(() => {
    let result = marcheFilteredRows;
    if (activeFilters.annees.length > 0 && activeFilters.annees.length < allYears.length) {
      result = result.filter(r => activeFilters.annees.includes(String(r.annee)));
    } else if (activeFilters.annees.length === 0) {
      result = [];
    }
    if (activeFilters.clcc.length > 0) result = result.filter(r => activeFilters.clcc.includes(r.clcc));
    if (activeFilters.marche.length > 0) result = result.filter(r => activeFilters.marche.includes(r.marcheGroupe));
    if (activeFilters.fournisseur.length > 0) result = result.filter(r => activeFilters.fournisseur.includes(r.fournisseur));
    if (activeFilters.typeEquipement.length > 0) result = result.filter(r => activeFilters.typeEquipement.includes(r.typeEquipement));
    return result;
  }, [marcheFilteredRows, activeFilters, allYears]);

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
          <ReportingFilters meta={filteredMeta} filters={activeFilters} onFiltersChange={setFilters} />
          <MaintenanceKpis rows={filteredRows} />
          <MaintenanceRenewals rows={filteredRows} />
          <MaintenanceCharts rows={filteredRows} />
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">&#128200;</div>
          <div className="empty-state-text">Chargez un fichier Excel pour afficher les données maintenance</div>
        </div>
      )}
    </div>
  );
}
