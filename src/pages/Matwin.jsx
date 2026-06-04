import { useState } from 'react';
import Layout from '../components/Layout';
import MedTechHero from '../components/MedTechHero';

const LS_KEY = 'gm-matwin';

function loadData() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || { projets: [], notes: '' }; }
  catch { return { projets: [], notes: '' }; }
}

function saveData(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }

export default function Matwin() {
  const [data, setData] = useState(loadData);
  const [showAdd, setShowAdd] = useState(false);
  const [newProjet, setNewProjet] = useState({ nom: '', statut: 'en_cours', responsable: '', description: '', dateDebut: '', dateFin: '' });

  const update = (next) => { setData(next); saveData(next); };

  const addProjet = () => {
    if (!newProjet.nom.trim()) return;
    update({ ...data, projets: [...data.projets, { ...newProjet, id: Date.now().toString(36) }] });
    setNewProjet({ nom: '', statut: 'en_cours', responsable: '', description: '', dateDebut: '', dateFin: '' });
    setShowAdd(false);
  };

  const deleteProjet = (id) => {
    if (!window.confirm('Supprimer ce projet ?')) return;
    update({ ...data, projets: data.projets.filter(p => p.id !== id) });
  };

  const toggleStatut = (id) => {
    update({
      ...data,
      projets: data.projets.map(p => p.id === id
        ? { ...p, statut: p.statut === 'termine' ? 'en_cours' : 'termine' }
        : p),
    });
  };

  const statutColors = {
    en_cours: { bg: '#eff6ff', color: '#1d4ed8', label: 'En cours' },
    termine: { bg: '#f0fdf4', color: '#16a34a', label: 'Termine' },
    en_attente: { bg: '#fffbeb', color: '#d97706', label: 'En attente' },
  };

  return (
    <Layout title="Matwin">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Hero MedTech 3D */}
        <MedTechHero
          theme="cells"
          eyebrow="Unicancer · Innovation"
          title="Espace Matwin"
          subtitle="Suivi des projets et initiatives Matwin — collaboration avec l'équipe Matwin."
          kpis={[
            { label: 'Projets',  value: data.projets.length, sub: 'au total' },
            { label: 'Terminés', value: data.projets.filter(p => p.statut === 'termine').length },
            { label: 'En cours', value: data.projets.filter(p => p.statut === 'en_cours').length },
          ]}
        />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, padding: '14px 20px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{data.projets.length}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Projets</div>
          </div>
          <div style={{ flex: 1, padding: '14px 20px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{data.projets.filter(p => p.statut === 'termine').length}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Termines</div>
          </div>
          <div style={{ flex: 1, padding: '14px 20px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{data.projets.filter(p => p.statut === 'en_cours').length}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>En cours</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            + Nouveau projet
          </button>
        </div>

        {/* Formulaire ajout */}
        {showAdd && (
          <div style={{
            padding: 16, marginBottom: 16, borderRadius: 12,
            background: '#fff', border: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="Nom du projet..." value={newProjet.nom}
                onChange={e => setNewProjet(p => ({ ...p, nom: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addProjet()}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }}
                autoFocus />
              <select value={newProjet.statut} onChange={e => setNewProjet(p => ({ ...p, statut: e.target.value }))}
                style={{ padding: '6px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, fontFamily: 'inherit' }}>
                <option value="en_cours">En cours</option>
                <option value="en_attente">En attente</option>
                <option value="termine">Termine</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="Responsable..." value={newProjet.responsable}
                onChange={e => setNewProjet(p => ({ ...p, responsable: e.target.value }))}
                style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', fontFamily: 'inherit' }} />
              <input type="date" value={newProjet.dateDebut} onChange={e => setNewProjet(p => ({ ...p, dateDebut: e.target.value }))}
                style={{ padding: '6px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, fontFamily: 'inherit' }} />
              <input type="date" value={newProjet.dateFin} onChange={e => setNewProjet(p => ({ ...p, dateFin: e.target.value }))}
                style={{ padding: '6px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, fontFamily: 'inherit' }} />
            </div>
            <textarea placeholder="Description..." value={newProjet.description}
              onChange={e => setNewProjet(p => ({ ...p, description: e.target.value }))}
              rows={2}
              style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={addProjet}>Creer</button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAdd(false)}>Annuler</button>
            </div>
          </div>
        )}

        {/* Projets */}
        {data.projets.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>Aucun projet Matwin</div>
            <div style={{ fontSize: 13 }}>Cliquez "+ Nouveau projet" pour commencer.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {data.projets.map(p => {
              const s = statutColors[p.statut] || statutColors.en_cours;
              return (
                <div key={p.id} style={{
                  borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff',
                  overflow: 'hidden', opacity: p.statut === 'termine' ? 0.7 : 1,
                }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: s.bg, color: s.color,
                      }}>{s.label}</span>
                      <span style={{ flex: 1 }} />
                      <button onClick={() => toggleStatut(p.id)} title="Changer statut"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14 }}>
                        {p.statut === 'termine' ? '↩' : '✓'}
                      </button>
                      <button onClick={() => deleteProjet(p.id)} title="Supprimer"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4,
                      textDecoration: p.statut === 'termine' ? 'line-through' : 'none',
                    }}>{p.nom}</div>
                    {p.description && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{p.description}</div>}
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#9ca3af' }}>
                      {p.responsable && <span>{p.responsable}</span>}
                      {p.dateDebut && <span>{p.dateDebut}</span>}
                      {p.dateFin && <span>→ {p.dateFin}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Notes libres */}
        <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 14, color: '#111827' }}>
            Notes & remarques
          </div>
          <textarea
            value={data.notes}
            onChange={e => update({ ...data, notes: e.target.value })}
            placeholder="Notes libres sur l'espace Matwin..."
            rows={5}
            style={{
              width: '100%', padding: '12px 16px', border: 'none', outline: 'none',
              fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: '#374151',
            }}
          />
        </div>

      </div>
    </Layout>
  );
}
