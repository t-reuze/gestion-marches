import { useState } from 'react';
import { useSourcingTemplates } from '../../context/SourcingTemplatesContext';

function genId(prefix) { return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

export default function SourcingCriteresEditor({ sections: initial, templateNom, onSave, onClose }) {
  const [sections, setSections] = useState(() => JSON.parse(JSON.stringify(initial || [])));
  const [savingAs, setSavingAs] = useState(false);
  const [newTplNom, setNewTplNom] = useState('');
  const { saveAsNewTemplate } = useSourcingTemplates();

  function updateSectionNom(idx, nom) {
    setSections(s => s.map((sec, i) => i === idx ? { ...sec, nom } : sec));
  }
  function addSection() {
    const nom = window.prompt('Nom de la nouvelle section :');
    if (!nom || !nom.trim()) return;
    setSections(s => [...s, { id: genId('sec'), nom: nom.trim(), criteres: [] }]);
  }
  function removeSection(idx) {
    if (!window.confirm('Supprimer la section « ' + sections[idx].nom + ' » et tous ses critères ?')) return;
    setSections(s => s.filter((_, i) => i !== idx));
  }
  function moveSection(idx, dir) {
    const next = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSections(next);
  }

  function addCritere(sectionIdx) {
    const nom = window.prompt('Nom du nouveau critère :');
    if (!nom || !nom.trim()) return;
    setSections(s => s.map((sec, i) => i === sectionIdx ? {
      ...sec, criteres: [...(sec.criteres || []), { id: genId('cr'), nom: nom.trim() }],
    } : sec));
  }
  function updateCritereNom(sectionIdx, critereIdx, nom) {
    setSections(s => s.map((sec, i) => i === sectionIdx ? {
      ...sec, criteres: sec.criteres.map((c, j) => j === critereIdx ? { ...c, nom } : c),
    } : sec));
  }
  function removeCritere(sectionIdx, critereIdx) {
    setSections(s => s.map((sec, i) => i === sectionIdx ? {
      ...sec, criteres: sec.criteres.filter((_, j) => j !== critereIdx),
    } : sec));
  }
  function moveCritere(sectionIdx, critereIdx, dir) {
    setSections(s => s.map((sec, i) => {
      if (i !== sectionIdx) return sec;
      const next = [...sec.criteres];
      const target = critereIdx + dir;
      if (target < 0 || target >= next.length) return sec;
      [next[critereIdx], next[target]] = [next[target], next[critereIdx]];
      return { ...sec, criteres: next };
    }));
  }

  function handleSaveAs() {
    if (!newTplNom.trim()) return;
    saveAsNewTemplate(newTplNom, sections);
    setSavingAs(false);
    setNewTplNom('');
    alert('Template « ' + newTplNom + ' » enregistré dans « Mes templates ».');
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 8, width: 'min(820px, 94vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Critères de sourcing</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Basé sur : <strong>{templateNom}</strong> · Modifications locales à ce marché
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 14 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {sections.map((sec, idx) => (
            <div key={sec.id || idx} className="card" style={{ marginBottom: 10 }}>
              <div className="card-body" style={{ padding: 10 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    type="text"
                    className="info-field-input"
                    value={sec.nom}
                    onChange={e => updateSectionNom(idx, e.target.value)}
                    style={{ flex: 1, fontWeight: 700, fontSize: 13 }}
                  />
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} title="Monter" onClick={() => moveSection(idx, -1)}>↑</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} title="Descendre" onClick={() => moveSection(idx, 1)}>↓</button>
                  <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => removeSection(idx)}>Supprimer</button>
                </div>
                {(sec.criteres || []).map((c, ci) => (
                  <div key={c.id || ci} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, paddingLeft: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <input
                      type="text"
                      className="info-field-input"
                      value={c.nom}
                      onChange={e => updateCritereNom(idx, ci, e.target.value)}
                      style={{ flex: 1, height: 30, fontSize: 12 }}
                    />
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => moveCritere(idx, ci, -1)}>↑</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => moveCritere(idx, ci, 1)}>↓</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#EF4444' }} onClick={() => removeCritere(idx, ci)}>✕</button>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" style={{ fontSize: 11, marginTop: 6, marginLeft: 12 }} onClick={() => addCritere(idx)}>
                  + Ajouter un critère
                </button>
              </div>
            </div>
          ))}

          <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={addSection}>
            + Ajouter une section
          </button>
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {savingAs ? (
            <>
              <input
                type="text"
                className="info-field-input"
                autoFocus
                placeholder="Nom du nouveau template"
                value={newTplNom}
                onChange={e => setNewTplNom(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <button className="btn btn-primary btn-sm" disabled={!newTplNom.trim()} onClick={handleSaveAs}>✓ Enregistrer</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setSavingAs(false); setNewTplNom(''); }}>Annuler</button>
            </>
          ) : (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setSavingAs(true)}>
                💾 Sauvegarder comme nouveau template
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={onClose}>Annuler</button>
                <button className="btn btn-primary btn-sm" onClick={() => onSave(sections)}>✓ Appliquer à ce marché</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
