import { useState } from 'react';

const DIMENSION_CONFIGS = [
  { key: 'clcc',           label: 'CLCC',               color: '#2563eb', metaKey: 'clccs' },
  { key: 'marche',         label: 'Marché',             color: '#9333ea', metaKey: 'marches' },
  { key: 'fournisseur',    label: 'Fournisseur',        color: '#0891b2', metaKey: 'fournisseurs' },
  { key: 'typeEquipement', label: "Type d'équipement",  color: '#dc2626', metaKey: 'typesEquipement' },
];

export default function ReportingFilters({ meta, filters, onFiltersChange }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [search, setSearch] = useState('');

  if (!meta) return null;

  const allYears = (meta.years || []).map(String).sort();
  const selectedYears = filters.annees || [];

  // --- Années ---
  function toggleYear(y) {
    const next = selectedYears.includes(y) ? selectedYears.filter(v => v !== y) : [...selectedYears, y];
    onFiltersChange({ ...filters, annees: next });
  }
  function selectAllYears() { onFiltersChange({ ...filters, annees: [...allYears] }); }
  function clearAllYears() { onFiltersChange({ ...filters, annees: [] }); }
  function selectLastN(n) {
    const last = allYears.slice(-n);
    onFiltersChange({ ...filters, annees: last });
  }

  // --- Dimensions ---
  function toggleValue(filterKey, val) {
    const current = filters[filterKey] || [];
    const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
    onFiltersChange({ ...filters, [filterKey]: next });
  }
  function selectAll(filterKey, metaKey) {
    onFiltersChange({ ...filters, [filterKey]: [...(meta[metaKey] || [])] });
  }
  function clearAll(filterKey) {
    onFiltersChange({ ...filters, [filterKey]: [] });
  }
  function toggleDropdown(key) {
    setOpenDropdown(openDropdown === key ? null : key);
    setSearch('');
  }

  const hasAnyFilter = selectedYears.length < allYears.length ||
    DIMENSION_CONFIGS.some(f => (filters[f.key]?.length || 0) > 0);

  return (
    <div className="reporting-filters-wrapper">
      {/* Filtre Années */}
      <div className="reporting-years-filter">
        <div className="reporting-years-header">
          <span className="reporting-years-title">Années</span>
          <div className="reporting-years-actions">
            <button className="btn btn-xs btn-ghost" onClick={selectAllYears}>Tout</button>
            <button className="btn btn-xs btn-ghost" onClick={() => selectLastN(5)}>5 ans</button>
            <button className="btn btn-xs btn-ghost" onClick={() => selectLastN(3)}>3 ans</button>
            <button className="btn btn-xs btn-ghost" onClick={clearAllYears}>Aucun</button>
          </div>
        </div>
        <div className="reporting-years-chips">
          {allYears.map(y => (
            <label key={y} className={'year-chip' + (selectedYears.includes(y) ? ' active' : '')}>
              <input type="checkbox" checked={selectedYears.includes(y)} onChange={() => toggleYear(y)} />
              <span>{y}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtres dimensions */}
      <div className="reporting-filters">
        {DIMENSION_CONFIGS.map(({ key, label, color, metaKey }) => {
          const allValues = meta[metaKey] || [];
          const selected = filters[key] || [];
          const isOpen = openDropdown === key;
          const filtered = search ? allValues.filter(v => v.toLowerCase().includes(search.toLowerCase())) : allValues;
          const isFiltered = selected.length > 0;

          return (
            <div key={key} className="filter-group">
              <div className="filter-group-header" onClick={() => toggleDropdown(key)}>
                <span className="filter-group-label" style={{ borderLeftColor: color }}>{label}</span>
                <span className="filter-group-count" style={isFiltered ? { color, fontWeight: 700 } : {}}>
                  {isFiltered ? selected.length + '/' + allValues.length : allValues.length}
                </span>
                <span className={'filter-group-arrow' + (isOpen ? ' open' : '')}>&#9662;</span>
              </div>

              {selected.length > 0 && (
                <div className="filter-pills">
                  {selected.map(val => (
                    <span key={val} className="filter-pill" style={{ background: color + '18', color, borderColor: color + '40' }}>
                      {val}
                      <button onClick={() => toggleValue(key, val)}>&times;</button>
                    </span>
                  ))}
                </div>
              )}

              {isOpen && (
                <div className="filter-dropdown">
                  <input
                    type="text"
                    className="filter-search"
                    placeholder={'Rechercher ' + label.toLowerCase() + '...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="filter-dropdown-actions">
                    <button className="btn btn-xs btn-ghost" onClick={() => selectAll(key, metaKey)}>Tout</button>
                    <button className="btn btn-xs btn-ghost" onClick={() => clearAll(key)}>Aucun</button>
                  </div>
                  <div className="filter-dropdown-list">
                    {filtered.map(val => (
                      <label key={val} className="filter-dropdown-item">
                        <input
                          type="checkbox"
                          checked={selected.includes(val)}
                          onChange={() => toggleValue(key, val)}
                        />
                        <span>{val}</span>
                      </label>
                    ))}
                    {filtered.length === 0 && <div className="filter-dropdown-empty">Aucun résultat</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {hasAnyFilter && (
          <button
            className="btn btn-xs btn-ghost"
            style={{ marginLeft: 'auto', fontSize: 11 }}
            onClick={() => onFiltersChange({ annees: [...allYears], clcc: [], marche: [], fournisseur: [], typeEquipement: [] })}
          >
            Effacer tous les filtres
          </button>
        )}
      </div>
    </div>
  );
}
