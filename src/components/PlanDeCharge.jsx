import { useState, useEffect, useCallback } from 'react';

const ACHETEURS = [
  // Marchés de la logistique
  'Alban HARTMANN',
  'Melissandre PECHARD',
  // Marchés R&D
  'Soumaya EL HIMDI',
  // Marchés des Investissements
  'Gaëtan RAYMOND',
  'Claire FOURIS',
  'Sergio RABENJASON',
  'Eloïse SALLES',
  'Timothée REUZE',
  // Marchés pharmaceutiques
  'Cécile BERGER',
  'Natacha GUENOT',
  'Michèle HO VAN CAM',
];

const LS_KEY = 'gm-plan-de-charge';

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveTasks(tasks) { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); }

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export default function PlanDeCharge({ open, onClose }) {
  const [tasks, setTasks] = useState(loadTasks);
  const [filterAcheteur, setFilterAcheteur] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ titre: '', acheteurs: [], priorite: 'P1', echeance: '', marche: '', description: '' });

  useEffect(() => { saveTasks(tasks); }, [tasks]);

  const addTask = useCallback(() => {
    if (!newTask.titre.trim()) return;
    setTasks(prev => [...prev, { ...newTask, id: generateId(), fait: false, dateCreation: new Date().toISOString() }]);
    setNewTask({ titre: '', acheteurs: [], priorite: 'P1', echeance: '', marche: '', description: '' });
    setShowAdd(false);
  }, [newTask]);

  const toggleTask = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, fait: !t.fait } : t));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // Helper : récupère la liste des acheteurs d'une tâche (rétrocompatible)
  const getAcheteurs = (t) => {
    if (t.acheteurs && t.acheteurs.length) return t.acheteurs;
    if (t.acheteur) return [t.acheteur];
    return [];
  };

  const filtered = tasks.filter(t => {
    if (filterAcheteur !== 'tous' && !getAcheteurs(t).includes(filterAcheteur)) return false;
    if (filterStatut === 'fait' && !t.fait) return false;
    if (filterStatut === 'afaire' && t.fait) return false;
    return true;
  }).sort((a, b) => {
    if (a.fait !== b.fait) return a.fait ? 1 : -1;
    const pOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return (pOrder[a.priorite] || 9) - (pOrder[b.priorite] || 9);
  });

  const stats = {
    total: tasks.length,
    fait: tasks.filter(t => t.fait).length,
    afaire: tasks.filter(t => !t.fait).length,
  };
  const byAcheteur = ACHETEURS.map(a => ({
    name: a,
    total: tasks.filter(t => getAcheteurs(t).includes(a)).length,
    fait: tasks.filter(t => getAcheteurs(t).includes(a) && t.fait).length,
  }));

  if (!open) return null;

  const priColors = { P0: '#dc2626', P1: '#f59e0b', P2: '#3b82f6', P3: '#9ca3af' };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 420, height: '100vh', zIndex: 1000,
      background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,.12)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideInRight .2s ease-out',
    }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div style={{
        padding: '16px 20px', background: '#001E45', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>Plan de charge</span>
        <span style={{ fontSize: 12, opacity: .7 }}>{stats.fait}/{stats.total}</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>

      {/* Stats par acheteur */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => setFilterAcheteur('tous')}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            border: filterAcheteur === 'tous' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
            background: filterAcheteur === 'tous' ? '#eff6ff' : '#fff',
            color: filterAcheteur === 'tous' ? '#1d4ed8' : '#6b7280',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          Tous ({stats.total})
        </button>
        {byAcheteur.filter(a => a.total > 0).map(a => (
          <button key={a.name} onClick={() => setFilterAcheteur(filterAcheteur === a.name ? 'tous' : a.name)}
            style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 500,
              border: filterAcheteur === a.name ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              background: filterAcheteur === a.name ? '#eff6ff' : '#fff',
              color: filterAcheteur === a.name ? '#1d4ed8' : '#374151',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {a.name.split(' ')[0]} <span style={{ color: '#9ca3af' }}>{a.fait}/{a.total}</span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 20px', borderBottom: '1px solid #f3f4f6' }}>
        {[['tous', 'Toutes'], ['afaire', 'A faire'], ['fait', 'Faites']].map(([k, label]) => (
          <button key={k} onClick={() => setFilterStatut(k)}
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              border: filterStatut === k ? '1px solid #3b82f6' : '1px solid #d1d5db',
              background: filterStatut === k ? '#eff6ff' : '#fff',
              color: filterStatut === k ? '#1d4ed8' : '#6b7280',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {label} ({k === 'tous' ? stats.total : k === 'fait' ? stats.fait : stats.afaire})
          </button>
        ))}
        <button onClick={() => setShowAdd(!showAdd)}
          style={{
            marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            border: 'none', background: '#001E45', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          + Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAdd && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <input type="text" placeholder="Titre de la tache..." value={newTask.titre}
            onChange={e => setNewTask(p => ({ ...p, titre: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8, outline: 'none', fontFamily: 'inherit' }}
            autoFocus />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <select value={newTask.priorite} onChange={e => setNewTask(p => ({ ...p, priorite: e.target.value }))}
              style={{ width: 60, padding: '4px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, fontFamily: 'inherit' }}>
              {['P0', 'P1', 'P2', 'P3'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={newTask.echeance} onChange={e => setNewTask(p => ({ ...p, echeance: e.target.value }))}
              style={{ flex: 1, padding: '4px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, fontFamily: 'inherit' }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Assignee(s) :</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, maxHeight: 80, overflowY: 'auto' }}>
            {ACHETEURS.map(a => {
              const selected = newTask.acheteurs.includes(a);
              return (
                <label key={a} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                  borderRadius: 4, fontSize: 10, cursor: 'pointer',
                  background: selected ? '#eff6ff' : '#f9fafb',
                  border: selected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                  color: selected ? '#1d4ed8' : '#374151',
                }}>
                  <input type="checkbox" checked={selected} style={{ width: 12, height: 12 }}
                    onChange={() => setNewTask(p => ({
                      ...p,
                      acheteurs: selected
                        ? p.acheteurs.filter(x => x !== a)
                        : [...p.acheteurs, a],
                    }))} />
                  {a.split(' ')[0]}
                </label>
              );
            })}
          </div>
          <input type="text" placeholder="Marche associe (optionnel)" value={newTask.marche}
            onChange={e => setNewTask(p => ({ ...p, marche: e.target.value }))}
            style={{ width: '100%', padding: '4px 10px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 8, outline: 'none', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addTask} style={{ padding: '4px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', background: '#001E45', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Ajouter</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '4px 14px', borderRadius: 6, fontSize: 11, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des taches */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Aucune tache {filterStatut !== 'tous' ? 'dans ce filtre' : '— cliquez + Ajouter'}
          </div>
        ) : (
          filtered.map(task => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 20px', borderBottom: '1px solid #f3f4f6',
              opacity: task.fait ? 0.5 : 1,
              background: task.fait ? '#fafbfc' : '#fff',
            }}>
              <input type="checkbox" checked={task.fait} onChange={() => toggleTask(task.id)}
                style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: '#111827',
                  textDecoration: task.fait ? 'line-through' : 'none',
                }}>
                  {task.titre}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                  {getAcheteurs(task).map(a => (
                    <span key={a} style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                      background: '#f3f4f6', color: '#374151',
                    }}>{a.split(' ')[0]}</span>
                  ))}
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                    background: priColors[task.priorite] + '18', color: priColors[task.priorite],
                  }}>{task.priorite}</span>
                  {task.echeance && (
                    <span style={{ fontSize: 10, color: '#6b7280' }}>
                      {new Date(task.echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {task.marche && (
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{task.marche}</span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} title="Supprimer"
                style={{ border: 'none', background: 'none', color: '#d1d5db', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Barre progression */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
          <span>Progression globale</span>
          <span>{stats.total > 0 ? Math.round(stats.fait / stats.total * 100) : 0}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg, #16a34a, #22c55e)',
            width: stats.total > 0 ? Math.round(stats.fait / stats.total * 100) + '%' : '0%',
            transition: 'width .3s',
          }} />
        </div>
      </div>
    </div>
  );
}
