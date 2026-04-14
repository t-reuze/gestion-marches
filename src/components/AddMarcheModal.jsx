import { useState } from 'react';
import { SECTEURS, STATUT_CONFIG } from '../data/mockData';
import { useNewMarches } from '../context/NewMarchesContext';

export default function AddMarcheModal({ onClose }) {
  const { addMarche } = useNewMarches();
  const secteurKeys = Object.keys(SECTEURS);

  const [form, setForm] = useState({
    nom: '',
    reference: '',
    secteur: secteurKeys[0],
    statut: 'ouvert',
    description: '',
    responsable: '',
    service: '',
    budgetEstime: '',
    dateOuverture: '',
    dateLimiteDepot: '',
  });
  const [error, setError] = useState('');

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom.trim()) { setError('Le nom est requis.'); return; }
    if (!form.secteur) { setError('Sélectionne un secteur.'); return; }
    addMarche(form);
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
          background: '#fff', borderRadius: 12, padding: 24, width: 'min(560px, 92vw)',
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Ajouter un marché</h2>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Fermer</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Nom du marché *</span>
            <input className="filter-input" value={form.nom} onChange={e => update('nom', e.target.value)} autoFocus />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Référence</span>
              <input className="filter-input" value={form.reference} onChange={e => update('reference', e.target.value)} placeholder="ex. PPE050" />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Secteur *</span>
              <select className="filter-input" value={form.secteur} onChange={e => update('secteur', e.target.value)}>
                {secteurKeys.map(k => (
                  <option key={k} value={k}>{SECTEURS[k].icon} {SECTEURS[k].label}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Statut</span>
              <select className="filter-input" value={form.statut} onChange={e => update('statut', e.target.value)}>
                {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Budget estimé</span>
              <input className="filter-input" value={form.budgetEstime} onChange={e => update('budgetEstime', e.target.value)} placeholder="ex. 1 500 000 €" />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Description</span>
            <textarea className="filter-input" rows={3} value={form.description} onChange={e => update('description', e.target.value)} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Responsable</span>
              <input className="filter-input" value={form.responsable} onChange={e => update('responsable', e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Service</span>
              <input className="filter-input" value={form.service} onChange={e => update('service', e.target.value)} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Date ouverture</span>
              <input type="date" className="filter-input" value={form.dateOuverture} onChange={e => update('dateOuverture', e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Date limite dépôt</span>
              <input type="date" className="filter-input" value={form.dateLimiteDepot} onChange={e => update('dateLimiteDepot', e.target.value)} />
            </label>
          </div>

          {error && <div style={{ color: '#DC2626', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer le marché</button>
          </div>
        </form>
      </div>
    </div>
  );
}
