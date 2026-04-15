import { useState } from 'react';
import { useSourcingTemplates } from '../../context/SourcingTemplatesContext';
import { DEFAULT_TEMPLATES } from '../../data/sourcingTemplates';

export default function SourcingTemplatePicker({ onPick, onClose }) {
  const { userTemplates, saveAsNewTemplate, deleteTemplate } = useSourcingTemplates();
  const [creating, setCreating] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newSections, setNewSections] = useState([]);
  const [newSectionNom, setNewSectionNom] = useState('');

  function addSection() {
    const nom = newSectionNom.trim();
    if (!nom) return;
    setNewSections(s => [...s, { id: 'sec-' + Date.now().toString(36), nom, criteres: [] }]);
    setNewSectionNom('');
  }
  function addCritere(sectionIdx, nom) {
    if (!nom.trim()) return;
    setNewSections(s => s.map((sec, i) => i === sectionIdx ? {
      ...sec, criteres: [...sec.criteres, { id: 'cr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nom: nom.trim() }]
    } : sec));
  }
  function removeSection(idx) {
    setNewSections(s => s.filter((_, i) => i !== idx));
  }
  function removeCritere(sectionIdx, critereIdx) {
    setNewSections(s => s.map((sec, i) => i === sectionIdx ? {
      ...sec, criteres: sec.criteres.filter((_, j) => j !== critereIdx),
    } : sec));
  }

  function createAndPick() {
    if (!newNom.trim() || newSections.length === 0) return;
    const tpl = saveAsNewTemplate(newNom, newSections);
    onPick(tpl);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 8, width: 'min(780px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {creating ? 'Créer un nouveau template' : 'Choisir un template de sourcing'}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 14 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16 }}>
          {!creating ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                ⭐ Templates par défaut
              </div>
              {DEFAULT_TEMPLATES.map(tpl => (
                <TemplateCard key={tpl.id} tpl={tpl} onPick={() => onPick(tpl)} />
              ))}

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>
                👤 Mes templates
              </div>
              {userTemplates.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 12 }}>
                  Aucun template personnalisé pour l'instant.
                </div>
              ) : userTemplates.map(tpl => (
                <TemplateCard
                  key={tpl.id} tpl={tpl}
                  onPick={() => onPick(tpl)}
                  onDelete={() => {
                    if (window.confirm('Supprimer le template « ' + tpl.nom + ' » ?')) deleteTemplate(tpl.id);
                  }}
                />
              ))}

              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 16, width: '100%' }}
                onClick={() => setCreating(true)}
              >
                ➕ Créer un nouveau template
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nom du template *</label>
                <input
                  className="info-field-input"
                  type="text"
                  autoFocus
                  placeholder="Ex: Formation continue, Travaux bâtiment..."
                  value={newNom}
                  onChange={e => setNewNom(e.target.value)}
                />
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Sections et critères</div>

              {newSections.map((sec, idx) => (
                <div key={sec.id} className="card" style={{ marginBottom: 8 }}>
                  <div className="card-body" style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <strong style={{ flex: 1, fontSize: 13 }}>{sec.nom}</strong>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 10, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => removeSection(idx)}>✗ Retirer la section</button>
                    </div>
                    {sec.criteres.map((c, ci) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4, paddingLeft: 12 }}>
                        <span style={{ flex: 1 }}>• {c.nom}</span>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: '#EF4444' }} onClick={() => removeCritere(idx, ci)}>✕</button>
                      </div>
                    ))}
                    <CritereInput onAdd={nom => addCritere(idx, nom)} />
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="info-field-input"
                  type="text"
                  placeholder="Nom de la section (ex: Identité, Prix...)"
                  value={newSectionNom}
                  onChange={e => setNewSectionNom(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-outline btn-sm" onClick={addSection}>+ Ajouter section</button>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {creating ? (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setCreating(false)}>Retour</button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!newNom.trim() || newSections.length === 0}
                onClick={createAndPick}
              >
                ✓ Enregistrer et utiliser
              </button>
            </>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={onClose}>Fermer</button>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ tpl, onPick, onDelete }) {
  const nbCriteres = (tpl.sections || []).reduce((s, sec) => s + (sec.criteres || []).length, 0);
  return (
    <div
      className="card"
      style={{ marginBottom: 8, cursor: 'pointer', transition: 'transform 120ms' }}
      onClick={onPick}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{tpl.nom}</div>
          {tpl.description && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tpl.description}</div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {(tpl.sections || []).length} section{tpl.sections?.length > 1 ? 's' : ''} · {nbCriteres} critères
          </div>
        </div>
        {onDelete && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, color: '#EF4444' }}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Supprimer ce template"
          >✕</button>
        )}
      </div>
    </div>
  );
}

function CritereInput({ onAdd }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 12 }}>
      <input
        type="text"
        className="info-field-input"
        placeholder="Nouveau critère..."
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (val.trim()) { onAdd(val); setVal(''); } } }}
        style={{ flex: 1, height: 28, fontSize: 12 }}
      />
      <button
        className="btn btn-outline btn-sm"
        style={{ fontSize: 11 }}
        onClick={() => { if (val.trim()) { onAdd(val); setVal(''); } }}
      >+</button>
    </div>
  );
}
