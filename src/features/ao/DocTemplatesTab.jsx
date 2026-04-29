import { useState, useCallback, useMemo } from 'react';
import XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import { getDocTemplates, marches } from '../../data/mockData';

// ─── Générateurs de templates vierges ─────────────────────────────────────────

function buildExcelBuffer(doc, marcheNom) {
  const wb = XLSX.utils.book_new();
  let ws;
  switch (doc.id) {
    // ── BPU générique ──
    case 'bpu-xls': {
      const h = ['Désignation de la prestation / fourniture', 'Référence', 'Unité', 'PUHT Tarif (€)', 'Taux de remise (%)', 'PUHT remisé (€)', 'TVA (%)', 'PUTTC (€)'];
      ws = XLSX.utils.aoa_to_sheet([
        [`Bordereau de Prix Unitaires — ${marcheNom}`], ['Marché Unicancer'], [],
        ['Fournisseur :'], ['Lot :'], [],
        ['Le Candidat complète les colonnes PUHT et taux de remise. Les colonnes PUHT remisé et PUTTC sont calculées automatiquement.'],
        [], h,
        ...Array.from({ length: 25 }, () => ['', '', '', '', '', '', '20%', '']),
      ]);
      ws['!cols'] = [{ wch: 45 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 14 }];
      break;
    }
    // ── BPU Accélérateurs Mono-Ref ──
    case 'bpu-mono': {
      const sheets = ['Base', 'Variante_1', 'Variante_2', 'Financement', 'DROM-COM', 'Guide_Remises'];
      for (const sn of sheets) {
        const h = ['Désignation / Composition offre', 'Détail fourniture', 'Référence commerciale', 'Réf CCTP', '', 'PUHT Tarif (€)', 'Taux de remise', 'PUHT remisé (€)', 'TVA', 'PUTTC (€)'];
        const data = [[`BPU Mono-Référence — ${marcheNom}`], ['Fournisseur :'], ['Matériels :'], [], h,
          ['Le Candidat peut ajouter des lignes si nécessaire'], [],
          ['Composition offre de base', 'Détail fourniture'], ...Array.from({ length: 15 }, () => [])];
        const s = XLSX.utils.aoa_to_sheet(data);
        s['!cols'] = [{ wch: 38 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 4 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, s, sn);
      }
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    // ── BPU Accélérateurs Multi-Ref ──
    case 'bpu-multi': {
      const sheets = ['Base', 'Variante_1', 'Variante_2', 'Base_Financement', 'DROM-COM', 'Guide_Remises'];
      for (const sn of sheets) {
        const h = ['Désignation / Composition offre', 'Détail fourniture', 'Réf commerciale', 'Réf CCTP', '', 'PUHT Tarif (€)', 'Taux de remise', 'PUHT remisé (€)', 'TVA', 'PUTTC (€)'];
        const data = [[`BPU Multi-Références — ${marcheNom}`], ['Offre dans le cadre d\'un multi-références'], ['Fournisseur :'], [], h,
          ...Array.from({ length: 15 }, () => [])];
        const s = XLSX.utils.aoa_to_sheet(data);
        s['!cols'] = [{ wch: 38 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 4 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, s, sn);
      }
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    // ── BPU Cybersécurité TJM ──
    case 'bpu-tjm': {
      for (let lot = 1; lot <= 5; lot++) {
        const data = [[`BPU — Taux Journaliers Moyens — ${marcheNom}`], [], [],
          ['', 'TJM € HT', 'TVA', 'Montant € TTC'], [],
          [`Lot ${lot}`], [],
          ['Consultant Junior'], ['Consultant Senior'], ['Consultant Expert'], [],
          ['Profil spécialisé 1'], ['Profil spécialisé 2']];
        const s = XLSX.utils.aoa_to_sheet(data);
        s['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, s, `Lot ${lot} - TJM`);
      }
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    // ── BPU Cybersécurité Cas d'usage ──
    case 'bpu-cas': {
      for (let lot = 1; lot <= 5; lot++) {
        const h = ['Volume (jour)', 'Qualification', 'TJM lissé € HT', 'Montant € HT', 'TVA', 'Montant € TTC'];
        const data = [[`BPU — Cas d'usage — ${marcheNom}`], [], [],
          ['', ...h], [],
          [`Lot ${lot} — Cas d'usage`], [],
          [`L${lot}_CU1 — Cas d'usage 1`], [`L${lot}_CU2 — Cas d'usage 2`], [`L${lot}_CU3 — Cas d'usage 3`]];
        const s = XLSX.utils.aoa_to_sheet(data);
        s['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, s, `Lot ${lot} - CU`);
      }
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    // ── Annexe 4 — Fiche contacts ──
    case 'contact': {
      ws = XLSX.utils.aoa_to_sheet([
        [`Annexe 4 CCAP — Fiche Contacts — ${marcheNom}`], ['Marché Unicancer — À compléter par le candidat'], [],
        ['Fournisseur :'], ['Lot(s) :'], [],
        ['Rôle / Fonction', 'Civilité', 'Prénom', 'Nom', 'Service / Direction', 'Téléphone fixe', 'Téléphone mobile', 'Email', 'Adresse postale'],
        ['Responsable commercial du marché'], ['Responsable technique / Chef de projet'],
        ['Contact facturation'], ['Contact SAV / Support technique'], ['Référent marché Unicancer'],
        ['Contact logistique / livraison'], ['Directeur de compte'], [''],
        ['Commentaires :'],
      ]);
      ws['!cols'] = [{ wch: 30 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 30 }];
      break;
    }
    // ── Annexe 8 — Questionnaire DD/RSE ──
    case 'rse-quest': {
      ws = XLSX.utils.aoa_to_sheet([
        ['ANNEXE 8 — QUESTIONNAIRE DEVELOPPEMENT DURABLE'], [`${marcheNom} — Marché Unicancer`], [],
        ['THEMATIQUE', 'QUESTION', 'COMMENTAIRES / REPONSE CANDIDAT'], [],
        ['PILIER SOCIAL'],
        ['Certification organisme évaluation', 'Certification EcoVadis ? Autre organisme d\'évaluation RSE ?'],
        ['Stratégie RSE / gouvernance', 'Avez-vous une démarche, une politique ou une charte RSE formalisée ?'],
        ['Stratégie RSE / gouvernance', 'Avez-vous rédigé un rapport RSE / DD ?'],
        ['Stratégie RSE / gouvernance', 'Avez-vous des ressources internes dédiées à la mise en oeuvre de votre politique RSE ?'],
        ['Stratégie RSE / gouvernance', 'Nombre d\'heures de formations RSE/DD dispensées ?'],
        ['Stratégie RSE / gouvernance', 'Système de management de l\'environnement certifié (ISO 14001…) ?'],
        ['Stratégie RSE / gouvernance', 'Système de management santé et sécurité au travail (ISO 45001…) ?'],
        ['Relations et conditions de travail', 'Mesure du bien-être et satisfaction des collaborateurs ?'],
        ['Relations et conditions de travail', 'Politique RH favorisant l\'égalité des chances, la diversité, le handicap ?'],
        ['Relations et conditions de travail', 'Justification qu\'aucun enfant ne travaille dans votre chaîne de valeur ?'],
        ['ACHATS RESPONSABLES'],
        ['Achats responsables', 'Intégration de l\'économie sociale et solidaire dans vos achats ?'],
        ['Achats responsables', 'Critères environnementaux/sociaux pour la sélection de vos fournisseurs ?'],
        ['PERFORMANCE ENVIRONNEMENTALE'],
        ['Indicateurs environnementaux', 'Suivi d\'indicateurs environnementaux (eau, énergie, déchets, GES) ?'],
        ['Indicateurs environnementaux', 'Bilan Carbone et/ou bilan gaz à effet de serre réalisé ?'],
        ['ECHANGES DEMATÉRIALISES'],
        ['Dématérialisation', 'Système de dématérialisation des échanges (facturation, commandes, reporting) ?'],
      ]);
      ws['!cols'] = [{ wch: 35 }, { wch: 60 }, { wch: 50 }];
      break;
    }
    // ── Annexe 1 CCTP — Questionnaire Technique ──
    case 'qt': {
      ws = XLSX.utils.aoa_to_sheet([
        ['QUESTIONS TECHNIQUES COMPLEMENTAIRES'], [`${marcheNom} — Marché Unicancer`],
        ['Base (répéter pour les variantes)'], [], [],
        ['Fournisseur :'], ['Matériels :'], [], [],
        ['Technical Criteria', 'Réponse Fournisseur', 'Commentaire / Précision'],
        ['General information'],
        ['Nom du responsable installation', '', ''], ['Adresse email', '', ''], ['Téléphone', '', ''],
        ['Nom du responsable matériovigilance', '', ''],
        ['Performance'],
        ['Caractéristiques techniques principales', '', ''], ['Normes et certifications applicables', '', ''],
        ['Dimensions et poids de l\'équipement', '', ''], ['Prérequis techniques (surface, alimentation)', '', ''],
        ['Installation'],
        ['Délai de fabrication et livraison', '', ''], ['Délai d\'installation sur site', '', ''],
        ['Maintenance'],
        ['MTBF (temps moyen entre pannes)', '', ''], ['Délai d\'intervention garanti', '', ''],
        ['Stock pièces détachées en France', '', ''], ['Durée de vie estimée de l\'équipement', '', ''],
        ['Formation'],
        ['Programme de formation utilisateurs', '', ''], ['Programme de formation physiciens', '', ''],
        ['Durée de la formation initiale', '', ''],
      ]);
      ws['!cols'] = [{ wch: 45 }, { wch: 40 }, { wch: 35 }];
      break;
    }
    // ── Annexe 3 CCTP — Rétroplanning ──
    case 'retro': {
      ws = XLSX.utils.aoa_to_sheet([
        [`Annexe 3 CCTP — Rétroplanning Installation — ${marcheNom}`],
        ['Planning prévisionnel à compléter par le candidat — un par site bénéficiaire'], [],
        ['Fournisseur :'], ['Équipement :'], ['Site bénéficiaire :'], [],
        ['Phase', 'Étape détaillée', 'Durée (jours ouvrés)', 'Semaine début (S+)', 'Semaine fin (S+)', 'Responsable', 'Prérequis / Commentaires'],
        ['Commande', 'Confirmation de commande'], ['Commande', 'Fabrication'], ['Commande', 'Contrôle qualité usine'],
        ['Livraison', 'Transport vers le site'], ['Livraison', 'Déchargement et mise en salle'],
        ['Installation', 'Assemblage mécanique'], ['Installation', 'Raccordement électrique'], ['Installation', 'Installation logicielle'], ['Installation', 'Mise en réseau'],
        ['Recette', 'Tests de performance'], ['Recette', 'Calibration et dosimétrie'], ['Recette', 'Validation acceptance tests'],
        ['Formation', 'Formation utilisateurs (RTT, manipulateurs)'], ['Formation', 'Formation physiciens'],
        ['Formation', 'Formation techniciens maintenance'], ['Formation', 'Formation applicative avancée'],
        ['Mise en service', 'Mise en service clinique'], ['Mise en service', 'Accompagnement premiers patients'],
      ]);
      ws['!cols'] = [{ wch: 16 }, { wch: 35 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 30 }];
      break;
    }
    // ── Annexe 6 — Volumes du marché (Cyber) ──
    case 'annexe6': {
      ws = XLSX.utils.aoa_to_sheet([
        [`Annexe 6 — Volumes du Marché — ${marcheNom}`], ['Estimation prévisionnelle — À compléter par Unicancer'], [],
        ['Lot', 'Intitulé du lot', 'Volume annuel estimé (jours)', 'Commentaires'],
        [1, '', '', ''], [2, '', '', ''], [3, '', '', ''], [4, '', '', ''], [5, '', '', ''],
      ]);
      ws['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 25 }, { wch: 30 }];
      break;
    }
    // ── Défaut ──
    default: {
      ws = XLSX.utils.aoa_to_sheet([[doc.label], [`${marcheNom} — Marché Unicancer`], [], [doc.description], [], ['À compléter par le candidat']]);
      ws['!cols'] = [{ wch: 60 }];
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// Plus de PDF — tous les templates sont en Excel (.xlsx) ou Word (.docx via Excel)

function sanitizeFileName(s) {
  return s.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s\-]/g, '').replace(/\s+/g, '_').substring(0, 60);
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DocTemplatesTab({ marcheId, annuaire = [] }) {
  const categories = getDocTemplates(marcheId);
  const marcheNom = marches.find(m => m.id === marcheId)?.nom || marcheId;

  const [expandedCat, setExpandedCat] = useState(() =>
    Object.fromEntries(categories.map(c => [c.category, true]))
  );
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState(new Set());
  const [manualEmails, setManualEmails] = useState('');
  const [generating, setGenerating] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  const allDocs = useMemo(() => categories.flatMap(c => c.docs), [categories]);
  const toggleCat = (cat) => setExpandedCat(prev => ({ ...prev, [cat]: !prev[cat] }));

  const toggleDoc = (id) => setSelectedDocs(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll = () => setSelectedDocs(new Set(allDocs.map(d => d.id)));
  const selectNone = () => setSelectedDocs(new Set());
  const selectObligatoires = () => setSelectedDocs(new Set(allDocs.filter(d => d.obligatoire).map(d => d.id)));

  // Fournisseurs depuis l'annuaire
  const suppliers = useMemo(() => {
    return annuaire.map(row => ({
      name: row['Nom fournisseur'] || '',
      email: row['MAIL'] || '',
      tel: row['TEL'] || '',
      prenom: row['PRENOM'] || '',
      nom: row['NOM'] || '',
    })).filter(s => s.name);
  }, [annuaire]);

  const toggleSupplier = (name) => setSelectedSuppliers(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  const selectAllSuppliers = () => setSelectedSuppliers(new Set(suppliers.map(s => s.name)));
  const selectNoSuppliers = () => setSelectedSuppliers(new Set());

  // Emails collectés
  const collectedEmails = useMemo(() => {
    const emails = new Set();
    for (const s of suppliers) {
      if (selectedSuppliers.has(s.name) && s.email) emails.add(s.email);
    }
    for (const e of manualEmails.split(/[,;\s]+/).filter(Boolean)) {
      if (e.includes('@')) emails.add(e.trim());
    }
    return [...emails];
  }, [suppliers, selectedSuppliers, manualEmails]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [suppliers, supplierSearch]);

  // Générer ZIP + ouvrir mail
  const handleSend = useCallback(async () => {
    if (!selectedDocs.size) return;
    setGenerating(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('Templates_' + sanitizeFileName(marcheNom));

      for (const doc of allDocs) {
        if (!selectedDocs.has(doc.id)) continue;
        const fileName = sanitizeFileName(doc.label) + '_template';
        const buf = buildExcelBuffer(doc, marcheNom);
        folder.file(fileName + '.xlsx', buf);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Templates_' + sanitizeFileName(marcheNom) + '.zip';
      a.click();
      URL.revokeObjectURL(url);

      // Ouvrir le client mail
      if (collectedEmails.length) {
        const subject = encodeURIComponent(`[Unicancer] Documents à compléter — ${marcheNom}`);
        const docList = allDocs.filter(d => selectedDocs.has(d.id)).map(d => `  - ${d.label} (${d.format})`).join('\n');
        const body = encodeURIComponent(
          `Bonjour,\n\n` +
          `Dans le cadre du marché "${marcheNom}", veuillez trouver ci-joint les documents suivants à compléter et retourner :\n\n` +
          docList + '\n\n' +
          `Merci de retourner les documents complétés et signés dans les délais impartis.\n\n` +
          `Cordialement,\n` +
          `Service Achats — UNICANCER`
        );
        const mailto = `mailto:${collectedEmails.join(',')}?subject=${subject}&body=${body}`;
        window.open(mailto, '_blank');
      }
    } catch (e) {
      console.error('Erreur génération templates:', e);
    }
    setGenerating(false);
  }, [selectedDocs, allDocs, marcheNom, collectedEmails]);

  // Télécharger un seul template (toujours en Excel)
  const handleDownloadOne = useCallback((doc) => {
    const buf = buildExcelBuffer(doc, marcheNom);
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = sanitizeFileName(doc.label) + '_template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }, [marcheNom]);

  const totalDocs = allDocs.length;
  const obligatoires = allDocs.filter(d => d.obligatoire).length;

  return (
    <div className="fade-in">
      {/* Stats + actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ padding: '12px 20px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8' }}>{totalDocs}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Documents</div>
        </div>
        <div style={{ padding: '12px 20px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{obligatoires}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Obligatoires</div>
        </div>
        <div style={{ padding: '12px 20px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{selectedDocs.size}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Selectionnes</div>
        </div>
        <div style={{
          padding: '12px 16px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb',
          flex: 2, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={selectAll}>Tout</button>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={selectObligatoires}>Obligatoires</button>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={selectNone}>Aucun</button>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontSize: 12 }}
            disabled={!selectedDocs.size || generating}
            onClick={() => setShowSendPanel(true)}
          >
            {generating ? 'Generation...' : `Preparer l'envoi (${selectedDocs.size} doc${selectedDocs.size > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>

      {/* Send panel */}
      {showSendPanel && (
        <div style={{
          marginBottom: 16, borderRadius: 12, overflow: 'hidden',
          border: '2px solid #3b82f6', background: '#fff',
        }}>
          <div style={{
            padding: '12px 16px', background: '#eff6ff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>
              Envoi de {selectedDocs.size} template{selectedDocs.size > 1 ? 's' : ''}
            </div>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }}
              onClick={() => setShowSendPanel(false)}>Fermer</button>
          </div>

          <div style={{ padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Colonne fournisseurs */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                Destinataires
                {suppliers.length > 0 && (
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                    ({selectedSuppliers.size}/{suppliers.length} fournisseurs)
                  </span>
                )}
              </div>

              {suppliers.length > 0 ? (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button className="btn btn-outline btn-sm" style={{ fontSize: 10 }} onClick={selectAllSuppliers}>Tous</button>
                    <button className="btn btn-outline btn-sm" style={{ fontSize: 10 }} onClick={selectNoSuppliers}>Aucun</button>
                    <input
                      type="text" placeholder="Filtrer..."
                      value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
                      style={{ flex: 1, padding: '3px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none' }}
                    />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    {filteredSuppliers.map(s => (
                      <label key={s.name} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                        cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 12,
                        background: selectedSuppliers.has(s.name) ? '#eff6ff' : '#fff',
                      }}>
                        <input type="checkbox" checked={selectedSuppliers.has(s.name)}
                          onChange={() => toggleSupplier(s.name)} />
                        <span style={{ fontWeight: 500, flex: 1 }}>{s.name}</span>
                        <span style={{ color: s.email ? '#16a34a' : '#dc2626', fontSize: 11 }}>
                          {s.email || 'pas d\'email'}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginBottom: 8 }}>
                  Aucun fournisseur dans l'annuaire — lancez d'abord une analyse ou ajoutez des emails manuellement.
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Emails supplementaires (separes par virgule)
                </div>
                <input
                  type="text" placeholder="email1@example.com, email2@example.com"
                  value={manualEmails} onChange={e => setManualEmails(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #d1d5db',
                    borderRadius: 6, outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Colonne résumé + actions */}
            <div style={{ flex: 1, minWidth: 250 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                Resume
              </div>
              <div style={{
                padding: 12, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb',
                fontSize: 12, marginBottom: 12,
              }}>
                <div style={{ marginBottom: 6 }}>
                  <strong>{selectedDocs.size}</strong> document{selectedDocs.size > 1 ? 's' : ''} selectionne{selectedDocs.size > 1 ? 's' : ''} :
                </div>
                {allDocs.filter(d => selectedDocs.has(d.id)).map(d => (
                  <div key={d.id} style={{ paddingLeft: 8, color: '#374151' }}>
                    - {d.label} ({d.format})
                  </div>
                ))}
                <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                  <strong>{collectedEmails.length}</strong> destinataire{collectedEmails.length > 1 ? 's' : ''} :
                </div>
                {collectedEmails.length > 0 ? (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, wordBreak: 'break-all' }}>
                    {collectedEmails.join(', ')}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                    Aucun destinataire selectionne
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  disabled={generating}
                  onClick={handleSend}
                  style={{ flex: 1, fontSize: 13 }}
                >
                  {generating ? 'Generation...' : 'Telecharger ZIP + ouvrir mail'}
                </button>
                {collectedEmails.length > 0 && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(collectedEmails.join('; '));
                    }}
                    style={{ fontSize: 11 }}
                  >
                    Copier les emails
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                Le ZIP des templates sera telecharge, puis votre client mail s'ouvrira avec les destinataires
                et un mail pre-rempli. Il vous suffira d'attacher le ZIP.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.map(cat => {
        const isOpen = expandedCat[cat.category] !== false;
        const oblig = cat.docs.filter(d => d.obligatoire).length;
        const catSelected = cat.docs.filter(d => selectedDocs.has(d.id)).length;

        return (
          <div key={cat.category} style={{
            marginBottom: 12, borderRadius: 12, overflow: 'hidden',
            border: '1px solid #e5e7eb', background: '#fff',
          }}>
            <button
              onClick={() => toggleCat(cat.category)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)',
                fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                <polyline points="6,4 10,8 6,12"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', flex: 1 }}>
                {cat.category}
              </span>
              {catSelected > 0 && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>
                  {catSelected} sel.
                </span>
              )}
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#e5e7eb', color: '#374151', fontWeight: 600 }}>
                {cat.docs.length} doc{cat.docs.length > 1 ? 's' : ''}
              </span>
              {oblig > 0 && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                  {oblig} oblig.
                </span>
              )}
            </button>

            {isOpen && (
              <div>
                {cat.docs.map((doc, i) => {
                  const isSelected = selectedDocs.has(doc.id);
                  return (
                    <div key={doc.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px 8px 20px',
                      borderTop: '1px solid #f3f4f6',
                      background: isSelected ? '#eff6ff' : (i % 2 === 0 ? '#fff' : '#fafbfc'),
                      transition: 'background .1s',
                    }}>
                      {/* Checkbox */}
                      <input type="checkbox" checked={isSelected} onChange={() => toggleDoc(doc.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />

                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: doc.obligatoire ? '#ef4444' : '#d1d5db',
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{doc.label}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{doc.description}</div>
                      </div>

                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                        background: doc.format === '.xlsx' || doc.format === '.xls' ? '#ecfdf5' : doc.format === '.pdf' ? '#fef2f2' : '#eff6ff',
                        color: doc.format === '.xlsx' || doc.format === '.xls' ? '#047857' : doc.format === '.pdf' ? '#b91c1c' : '#1d4ed8',
                        fontWeight: 600, fontFamily: 'monospace',
                      }}>
                        {doc.format}
                      </span>

                      <span style={{ fontSize: 10, fontWeight: 600, minWidth: 60, textAlign: 'center', flexShrink: 0, color: doc.obligatoire ? '#dc2626' : '#9ca3af' }}>
                        {doc.obligatoire ? 'OBLIG.' : 'Facult.'}
                      </span>

                      <button
                        onClick={() => handleDownloadOne(doc)}
                        title={'Telecharger ' + doc.label}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '3px 8px', borderRadius: 5,
                          fontSize: 11, border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151',
                          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
