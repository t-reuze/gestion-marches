import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import MarcheNavTabs from '../components/MarcheNavTabs';
import StatusBadge from '../components/StatusBadge';
import { marches } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const STATUTS = ['ouvert', 'analyse', 'attribution', 'reporting', 'cloture'];
const STATUT_LABELS = { ouvert: 'Ouvert', analyse: 'En analyse', attribution: 'Attribution', reporting: 'Reporting', cloture: 'Clôturé' };

export default function MarcheInfos() {
  const { id } = useParams();
  const { getMeta, setMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);

  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    statut: '', referent: '', service: '', nbLots: '', nbOffresRecues: '',
    budgetEstime: '', dateLimiteDepot: '', dateAttributionPrevue: '', progression: '', tags: '',
  });

  useEffect(() => {
    if (!marche) return;
    const meta = getMeta(id);
    const merged = { ...marche, ...meta };
    setForm({
      statut:              merged.statut              || marche.statut || '',
      referent:            meta.referent              || '',
      service:             merged.service             || '',
      nbLots:              merged.nbLots              > 0 ? String(merged.nbLots) : '',
      nbOffresRecues:      merged.nbOffresRecues      > 0 ? String(merged.nbOffresRecues) : '',
      budgetEstime:        merged.budgetEstime        || '',
      dateLimiteDepot:     merged.dateLimiteDepot     || '',
      dateAttributionPrevue: merged.dateAttributionPrevue || '',
      progression:         merged.progression         > 0 ? String(merged.progression) : '0',
      tags:                Array.isArray(merged.tags) && merged.tags.length
                             ? merged.tags.join(', ')
                             : (merged.tags || ''),
    });
  }, [id]);

  if (!marche) return <Layout title="Marché introuvable"><div className="empty-state"><div className="empty-title">Marché introuvable</div></div></Layout>;

  function handleSave(e) {
    e.preventDefault();
    setMeta(id, {
      statut:              form.statut || undefined,
      referent:            form.referent.trim(),
      service:             form.service.trim(),
      nbLots:              form.nbLots !== '' ? Number(form.nbLots) : 0,
      nbOffresRecues:      form.nbOffresRecues !== '' ? Number(form.nbOffresRecues) : 0,
      budgetEstime:        form.budgetEstime.trim(),
      dateLimiteDepot:     form.dateLimiteDepot,
      dateAttributionPrevue: form.dateAttributionPrevue,
      progression:         form.progression !== '' ? Number(form.progression) : 0,
      tags:                form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function field(label, key, type = 'text', opts = {}) {
    return (
      <div className="info-field">
        <label className="info-field-label">{label}</label>
        <input
          type={type}
          className="info-field-input"
          value={form[key]}
          placeholder={opts.placeholder || ''}
          min={opts.min}
          max={opts.max}
          step={opts.step}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      </div>
    );
  }

  const meta = getMeta(id);
  const statut = meta.statut || marche.statut;

  return (
    <Layout title={marche.nom} sub="— Informations du marché">
      <MarcheNavTabs />

      <form onSubmit={handleSave}>
        {/* En-tête réf */}
        <div className="info-header-bar">
          <div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{marche.reference}</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{marche.nom}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{marche.description}</div>
          </div>
          <StatusBadge statut={statut} />
        </div>

        {/* Section Responsabilités */}
        <div className="info-section">
          <div className="info-section-title">&#x1F464; Responsabilités</div>
          <div className="info-grid">
            {field('Référent marché', 'referent', 'text', { placeholder: 'Nom du référent' })}
            {field('Service / pôle', 'service', 'text', { placeholder: 'Ex : Radiothérapie' })}
          </div>
        </div>

        {/* Section Statut & Avancement */}
        <div className="info-section">
          <div className="info-section-title">&#x1F4CA; Statut & Avancement</div>
          <div className="info-grid">
            <div className="info-field">
              <label className="info-field-label">Statut</label>
              <select className="info-field-input" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="info-field">
              <label className="info-field-label">Progression ({form.progression || 0}%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range" min="0" max="100" step="5"
                  value={form.progression || 0}
                  style={{ flex: 1, accentColor: 'var(--blue)' }}
                  onChange={e => setForm(f => ({ ...f, progression: e.target.value }))}
                />
                <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 13, width: 38 }}>{form.progression || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Offres */}
        <div className="info-section">
          <div className="info-section-title">&#x1F4E6; Lots & Offres</div>
          <div className="info-grid">
            {field('Nombre de lots', 'nbLots', 'number', { min: '0', placeholder: '0' })}
            {field('Offres reçues', 'nbOffresRecues', 'number', { min: '0', placeholder: '0' })}
          </div>
        </div>

        {/* Section Finances & Dates */}
        <div className="info-section">
          <div className="info-section-title">&#x1F4B6; Finances & Calendrier</div>
          <div className="info-grid">
            {field('Budget estimé', 'budgetEstime', 'text', { placeholder: 'ex : 5 000 000 €' })}
            {field('Date limite de dépôt', 'dateLimiteDepot', 'date')}
            {field('Date d’attribution prévue', 'dateAttributionPrevue', 'date')}
          </div>
        </div>

        {/* Section Tags */}
        <div className="info-section">
          <div className="info-section-title">&#x1F3F7; Tags</div>
          <div className="info-field info-field--full">
            <label className="info-field-label">Mots-clés (séparés par des virgules)</label>
            <input
              type="text" className="info-field-input"
              value={form.tags}
              placeholder="ex : Imagerie, Multi-lots, Prioritaire"
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
            {form.tags && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button type="submit" className="btn btn-primary">&#x2713; Sauvegarder les informations</button>
          {saved && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>&#x2713; Enregistré</span>}
        </div>
      </form>
    </Layout>
  );
}
