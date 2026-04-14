import { useState } from 'react';
import { useNewFormations } from '../context/NewFormationsContext';

export default function AddFormationModal({ onClose }) {
  const { addFormation } = useNewFormations();

  const [form, setForm] = useState({
    nom: '',
    dateEcheance: '',
    renouvellement: false,
    responsablePedagogique: '',
    contact: '',
    commentaires: '',
  });
  const [error, setError] = useState('');

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom.trim()) { setError('Le nom est requis.'); return; }
    addFormation(form);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, padding: 24, width: 'min(520px, 92vw)',
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Ajouter une formation</h2>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Fermer</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Nom de la formation *</span>
            <input className="filter-input" value={form.nom} onChange={e => update('nom', e.target.value)} autoFocus />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Date d'échéance</span>
              <input type="date" className="filter-input" value={form.dateEcheance} onChange={e => update('dateEcheance', e.target.value)} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
              <input type="checkbox" checked={form.renouvellement} onChange={e => update('renouvellement', e.target.checked)} />
              <span style={{ fontSize: 13 }}>À renouveler</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Responsable pédagogique</span>
              <input className="filter-input" value={form.responsablePedagogique} onChange={e => update('responsablePedagogique', e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Contact</span>
              <input className="filter-input" value={form.contact} onChange={e => update('contact', e.target.value)} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Commentaires</span>
            <textarea className="filter-input" rows={3} value={form.commentaires} onChange={e => update('commentaires', e.target.value)} />
          </label>

          {error && <div style={{ color: '#DC2626', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-blue">Créer la formation</button>
          </div>
        </form>
      </div>
    </div>
  );
}
