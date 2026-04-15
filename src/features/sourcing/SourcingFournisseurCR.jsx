import { useState, useEffect, useMemo } from 'react';

function fileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function SourcingFournisseurCR({ fournisseur, sections, cr, onSave, onBack }) {
  const [draft, setDraft] = useState(() => ({
    reunionDate:    cr?.reunionDate    || '',
    reunionDuree:   cr?.reunionDuree   || '',
    lieu:           cr?.lieu           || '',
    participantsUnicancer: cr?.participantsUnicancer || '',
    participantsFournisseur: cr?.participantsFournisseur || '',
    transcriptionName: cr?.transcriptionName || '',
    transcriptionData: cr?.transcriptionData || '',
    transcriptionSize: cr?.transcriptionSize || 0,
    syntheseIA:     cr?.syntheseIA     || '',
    valeurs:        cr?.valeurs        || {},
  }));
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setDirty(false); }, [fournisseur?.id]);

  function patch(p) { setDraft(d => ({ ...d, ...p })); setDirty(true); }
  function patchValeur(critereId, value) {
    setDraft(d => ({ ...d, valeurs: { ...d.valeurs, [critereId]: value } }));
    setDirty(true);
  }

  async function handleUpload(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      if (!window.confirm('Fichier de ' + fileSize(file.size) + ', cela peut ralentir le navigateur. Continuer ?')) return;
    }
    const dataUrl = await readFileAsDataURL(file);
    patch({ transcriptionName: file.name, transcriptionData: dataUrl, transcriptionSize: file.size });
  }

  function clearTranscription() {
    if (!window.confirm('Retirer la transcription ?')) return;
    patch({ transcriptionName: '', transcriptionData: '', transcriptionSize: 0 });
  }

  function save() {
    onSave({ ...draft, updatedAt: new Date().toISOString() });
    setDirty(false);
  }

  // Stats de complétion
  const stats = useMemo(() => {
    const all = (sections || []).flatMap(s => s.criteres || []);
    const filled = all.filter(c => (draft.valeurs[c.id] || '').trim()).length;
    return { total: all.length, filled };
  }, [sections, draft.valeurs]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button className="btn btn-outline btn-sm" onClick={onBack}>&larr; Retour à la shortlist</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{fournisseur.nom}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            CR de réunion · {stats.filled} / {stats.total} critères renseignés
            {cr?.updatedAt && <> · sauvegardé le {new Date(cr.updatedAt).toLocaleString('fr-FR')}</>}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={save}>
          {dirty ? '✓ Enregistrer' : '✓ Enregistré'}
        </button>
      </div>

      {/* Métadonnées de la réunion */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">Réunion</span></div>
        <div className="card-body">
          <div className="info-grid">
            <div className="info-field">
              <label className="info-field-label">Date</label>
              <input className="info-field-input" type="date" value={draft.reunionDate} onChange={e => patch({ reunionDate: e.target.value })} />
            </div>
            <div className="info-field">
              <label className="info-field-label">Durée</label>
              <input className="info-field-input" type="text" placeholder="Ex: 1h30" value={draft.reunionDuree} onChange={e => patch({ reunionDuree: e.target.value })} />
            </div>
            <div className="info-field">
              <label className="info-field-label">Lieu / format</label>
              <input className="info-field-input" type="text" placeholder="Teams, Visio, présentiel..." value={draft.lieu} onChange={e => patch({ lieu: e.target.value })} />
            </div>
            <div className="info-field">
              <label className="info-field-label">Participants Unicancer</label>
              <input className="info-field-input" type="text" placeholder="Noms séparés par des virgules" value={draft.participantsUnicancer} onChange={e => patch({ participantsUnicancer: e.target.value })} />
            </div>
            <div className="info-field" style={{ gridColumn: '1 / -1' }}>
              <label className="info-field-label">Participants côté fournisseur</label>
              <input className="info-field-input" type="text" placeholder="Noms et fonctions" value={draft.participantsFournisseur} onChange={e => patch({ participantsFournisseur: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Transcription + synthèse IA */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">Transcription & synthèse</span></div>
        <div className="card-body">
          <div style={{ marginBottom: 12 }}>
            <label className="info-field-label">Transcription de réunion (.txt, .vtt, .docx)</label>
            {draft.transcriptionName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface-subtle, #f8fafc)', borderRadius: 6, marginTop: 6 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{draft.transcriptionName}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fileSize(draft.transcriptionSize)}</div>
                </div>
                <a href={draft.transcriptionData} download={draft.transcriptionName} className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>Télécharger</a>
                <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={clearTranscription}>✗</button>
              </div>
            ) : (
              <input
                type="file"
                accept=".txt,.vtt,.docx,.md,.rtf"
                style={{ marginTop: 6, fontSize: 12 }}
                onChange={e => handleUpload(e.target.files?.[0])}
              />
            )}
          </div>
          <div>
            <label className="info-field-label">Synthèse (collée depuis Copilot ou rédigée manuellement)</label>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontStyle: 'italic' }}>
              Astuce : ouvre la transcription dans Word/Teams, demande à Copilot « Résume cette réunion en extrayant prix, délais et caractéristiques techniques », puis colle le résultat ici.
            </div>
            <textarea
              className="info-field-input"
              rows={6}
              value={draft.syntheseIA}
              onChange={e => patch({ syntheseIA: e.target.value })}
              placeholder="Synthèse globale de la réunion..."
            />
          </div>
        </div>
      </div>

      {/* Critères du template */}
      {(sections || []).map(sec => {
        const filled = (sec.criteres || []).filter(c => (draft.valeurs[c.id] || '').trim()).length;
        const total = (sec.criteres || []).length;
        return (
          <div key={sec.id} className="card" style={{ marginBottom: 12 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="card-title">{sec.nom}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filled} / {total}</span>
            </div>
            <div className="card-body">
              {(sec.criteres || []).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun critère dans cette section.</div>
              ) : (sec.criteres || []).map(c => (
                <div key={c.id} className="info-field" style={{ marginBottom: 10 }}>
                  <label className="info-field-label">{c.nom}</label>
                  <textarea
                    className="info-field-input"
                    rows={2}
                    value={draft.valeurs[c.id] || ''}
                    onChange={e => patchValeur(c.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, marginBottom: 24 }}>
        <button className="btn btn-outline btn-sm" onClick={onBack}>Retour</button>
        <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={save}>
          {dirty ? '✓ Enregistrer' : '✓ Enregistré'}
        </button>
      </div>
    </div>
  );
}
