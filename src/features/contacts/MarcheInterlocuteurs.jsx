import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import { marches } from '../../data/mockData';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

const ROLE_COLORS = {
  'Référent marché': '#1A4FA8',
  'Acheteur': '#10B981',
  'Expert technique': '#8B5CF6',
  'Directeur': '#F59E0B',
  'Juriste': '#EF4444',
  'Finance': '#0891B2',
  'Autre': '#64748B',
};

const EMPTY_FORM = { nom: '', role: 'Référent marché', service: '', email: '', telephone: '' };

function initials(nom) {
  return nom.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function ContactForm({ form, setForm }) {
  const roles = ['Référent marché', 'Acheteur', 'Expert technique', 'Directeur', 'Juriste', 'Finance', 'Autre'];
  return (
    <div className="info-grid">
      <div className="info-field">
        <label className="info-field-label">Nom Prénom *</label>
        <input className="info-field-input" type="text" value={form.nom} placeholder="Dr Dupont Marie" onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Rôle</label>
        <select className="info-field-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="info-field">
        <label className="info-field-label">Service</label>
        <input className="info-field-input" type="text" value={form.service} placeholder="Direction achats" onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Email</label>
        <input className="info-field-input" type="email" value={form.email} placeholder="contact@unicancer.fr" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="info-field">
        <label className="info-field-label">Téléphone</label>
        <input className="info-field-input" type="tel" value={form.telephone} placeholder="+33 1 23 45 67 89" onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
      </div>
    </div>
  );
}

export default function MarcheInterlocuteurs() {
  const { id } = useParams();
  const { getMeta, setMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  if (!marche) return (
    <Layout title="Marché introuvable">
      <div className="empty-state"><div className="empty-title">Marché introuvable</div></div>
    </Layout>
  );

  const meta = getMeta(id);
  const interlocuteurs = meta.interlocuteurs || [];

  function startAdd() { setForm(EMPTY_FORM); setAdding(true); setEditingId(null); }

  function startEdit(il) {
    setForm({ nom: il.nom, role: il.role, service: il.service || '', email: il.email || '', telephone: il.telephone || '' });
    setEditingId(il.id);
    setAdding(false);
  }

  function saveAdd() {
    if (!form.nom.trim()) return;
    setMeta(id, { interlocuteurs: [...interlocuteurs, { ...form, id: Date.now().toString() }] });
    setAdding(false);
    setForm(EMPTY_FORM);
  }

  function saveEdit() {
    if (!form.nom.trim()) return;
    setMeta(id, { interlocuteurs: interlocuteurs.map(il => il.id === editingId ? { ...il, ...form } : il) });
    setEditingId(null);
  }

  function remove(ilId) {
    if (!window.confirm('Supprimer cet interlocuteur ?')) return;
    setMeta(id, { interlocuteurs: interlocuteurs.filter(il => il.id !== ilId) });
  }

  const title = marche.reference + ' — ' + marche.nom;

  return (
    <Layout title={title} sub="— Interlocuteurs">
      <MarcheNavTabs />

      {marche.responsable && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--blue)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
            }}>
              {initials(marche.responsable)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{marche.responsable}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Référent principal · <em>Données statiques</em>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>Interlocuteurs supplémentaires</div>
        <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Ajouter</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--blue)' }}>
          <div className="card-header"><span className="card-title">Nouvel interlocuteur</span></div>
          <div className="card-body">
            <ContactForm form={form} setForm={setForm} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={saveAdd}>✓ Ajouter</button>
              <button className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {interlocuteurs.length === 0 && !adding ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="empty-icon"></div>
          <div className="empty-sub">Aucun interlocuteur supplémentaire renseigné</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={startAdd}>+ Ajouter un interlocuteur</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {interlocuteurs.map(il => {
            const color = ROLE_COLORS[il.role] || '#64748B';
            const isEditing = editingId === il.id;
            return (
              <div key={il.id} className="card" style={{ borderTop: '3px solid ' + color }}>
                {isEditing ? (
                  <div className="card-body">
                    <ContactForm form={form} setForm={setForm} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓ Sauvegarder</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
                    }}>
                      {initials(il.nom)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{il.nom}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>{il.role}</div>
                      {il.service && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{il.service}</div>}
                      {il.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{il.email}</div>}
                      {il.telephone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{il.telephone}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => startEdit(il)}></button>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => remove(il.id)}>✗</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
