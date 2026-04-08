import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { clccs, marches } from '../../data/mockData';
import { FONCTIONS_IMPORT as FONCTIONS } from '../../data/clccContacts';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

export default function ClccContactForm() {
  const { clccId } = useParams();
  const navigate = useNavigate();
  const { getMeta, setMeta } = useMarcheMeta();

  const clcc = clccs.find(c => c.id === clccId);

  const [form, setForm] = useState({
    nom: '',
    fonction: FONCTIONS[0],
    service: '',
    email: '',
    telephone: '',
    marchesLies: [],
  });
  const [saved, setSaved] = useState(false);

  if (!clcc) {
    return (
      <Layout title="Centre introuvable">
        <div className="empty-state"><div className="empty-title">Centre CLCC introuvable</div></div>
      </Layout>
    );
  }

  function handleSave(e) {
    e.preventDefault();
    if (!form.nom.trim()) return;

    const metaKey = 'clcc-' + clcc.id;
    const meta = getMeta(metaKey);
    const contacts = meta.contacts || [];

    const newContact = {
      id: Date.now().toString(),
      nom: form.nom.trim(),
      fonction: form.fonction,
      service: form.service.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      marchesLies: form.marchesLies,
    };

    setMeta(metaKey, { contacts: [...contacts, newContact] });
    setSaved(true);

    // Reset form for next entry
    setTimeout(() => {
      setForm({ nom: '', fonction: FONCTIONS[0], service: '', email: '', telephone: '', marchesLies: [] });
      setSaved(false);
    }, 1500);
  }

  function toggleMarche(mid) {
    setForm(f => ({
      ...f,
      marchesLies: f.marchesLies.includes(mid)
        ? f.marchesLies.filter(x => x !== mid)
        : [...f.marchesLies, mid],
    }));
  }

  return (
    <Layout title={'Nouveau contact — ' + clcc.nom} sub={'— ' + clcc.ville}>
      <button
        className="btn btn-outline btn-sm"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/contacts')}
      >
        &larr; Retour à l'annuaire
      </button>

      <form onSubmit={handleSave}>
        {/* Identité */}
        <div className="info-section">
          <div className="info-section-title">Identité</div>
          <div className="info-grid">
            <div className="info-field">
              <label className="info-field-label">Nom Prénom *</label>
              <input
                className="info-field-input" type="text"
                value={form.nom} placeholder="Dr Dupont Marie"
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                required
              />
            </div>
            <div className="info-field">
              <label className="info-field-label">Fonction *</label>
              <select
                className="info-field-input"
                value={form.fonction}
                onChange={e => setForm(f => ({ ...f, fonction: e.target.value }))}
              >
                {FONCTIONS.map(fn => <option key={fn} value={fn}>{fn}</option>)}
              </select>
            </div>
            <div className="info-field">
              <label className="info-field-label">Service</label>
              <input
                className="info-field-input" type="text"
                value={form.service} placeholder="Direction achats"
                onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="info-section">
          <div className="info-section-title">Coordonnées</div>
          <div className="info-grid">
            <div className="info-field">
              <label className="info-field-label">Email</label>
              <input
                className="info-field-input" type="email"
                value={form.email} placeholder="contact@unicancer.fr"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="info-field">
              <label className="info-field-label">Téléphone</label>
              <input
                className="info-field-input" type="tel"
                value={form.telephone} placeholder="+33 1 23 45 67 89"
                onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Marchés liés */}
        <div className="info-section">
          <div className="info-section-title">Marchés liés (optionnel)</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Cochez les marchés sur lesquels ce contact est impliqué.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
            {marches.map(m => (
              <label
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                  background: form.marchesLies.includes(m.id) ? 'var(--blue-soft)' : 'var(--surface-subtle)',
                  border: '1px solid ' + (form.marchesLies.includes(m.id) ? 'var(--blue)' : 'var(--border)'),
                  fontSize: 12, transition: 'all 150ms',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.marchesLies.includes(m.id)}
                  onChange={() => toggleMarche(m.id)}
                  style={{ accentColor: 'var(--blue)' }}
                />
                <span style={{ fontWeight: 600, color: 'var(--blue)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  {m.reference || '—'}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.nom}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button type="submit" className="btn btn-primary">&#x2713; Enregistrer le contact</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/contacts')}>Annuler</button>
          {saved && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>&#x2713; Contact ajouté</span>}
        </div>
      </form>
    </Layout>
  );
}
