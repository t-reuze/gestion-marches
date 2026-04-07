import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import KpiCard from '../../components/KpiCard';
import { marches, STATUT_CONFIG, formatDate } from '../../data/mockData';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

function parseBudget(s) {
  return parseInt(String(s || '').replace(/[\s €KkMm,.]/g, '')) || 0;
}

function formatBudget(n) {
  if (!n) return '—';
  if (n >= 1000000) return (n / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M€';
  if (n >= 1000) return (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k€';
  return n.toLocaleString('fr-FR') + ' €';
}

function pct(a, b) {
  if (!b || !a) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}

export default function ErpKpi() {
  const { id } = useParams();
  const { getMeta, setMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);
  const meta = getMeta(id || '');

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    budgetEngage:  meta.budgetEngage  || '',
    budgetDepense: meta.budgetDepense || '',
    notes:         meta.notesErp      || '',
  });

  if (!marche) return (
    <Layout title="Marché introuvable">
      <div className="empty-state"><div className="empty-title">Marché introuvable</div></div>
    </Layout>
  );

  const merged = { ...marche, ...meta };
  const budgetEstime  = parseBudget(merged.budgetEstime);
  const budgetEngage  = parseBudget(form.budgetEngage);
  const budgetDepense = parseBudget(form.budgetDepense);
  const pctEngage     = pct(budgetEngage,  budgetEstime);
  const pctDepense    = pct(budgetDepense, budgetEstime);

  function save() {
    setMeta(id, { budgetEngage: form.budgetEngage, budgetDepense: form.budgetDepense, notesErp: form.notes });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const today = new Date().toISOString().slice(0, 10);
  const dates = [
    { label: 'Ouverture',               date: merged.dateOuverture,          color: '#3B82F6' },
    { label: 'Limite dépôt', date: merged.dateLimiteDepot,        color: '#F59E0B' },
    { label: 'Attribution prévue', date: merged.dateAttributionPrevue,  color: '#10B981' },
  ].filter(d => d.date);

  const title = marche.reference + ' — ' + marche.nom;

  return (
    <Layout title={title} sub="— ERP · KPI">
      <MarcheNavTabs />

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Progression" value={(merged.progression || 0) + '%'} color={STATUT_CONFIG[merged.statut]?.color || '#3B82F6'} sub={STATUT_CONFIG[merged.statut]?.label || merged.statut} />
        <KpiCard label="Budget estimé" value={merged.budgetEstime || '—'} color="#8B5CF6" sub="estimation initiale" />
        <KpiCard label="Offres reçues" value={merged.nbOffresRecues || 0} color="#10B981" sub={(merged.nbLots || 0) + ' lot' + ((merged.nbLots || 0) !== 1 ? 's' : '')} />
        <KpiCard label="Responsable" value={merged.responsable || '—'} color="#1A4FA8" sub={merged.service || 'Référent marché'} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Suivi budgétaire</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>✓ Enregistré</span>}
            <button className={'btn btn-sm ' + (editing ? 'btn-primary' : 'btn-outline')} onClick={() => editing ? save() : setEditing(true)}>
              {editing ? '✓ Sauvegarder' : 'Modifier'}
            </button>
            {editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Annuler</button>}
          </div>
        </div>
        <div className="card-body">
          {editing ? (
            <div className="info-grid">
              <div className="info-field">
                <label className="info-field-label">Budget engagé</label>
                <input className="info-field-input" type="text" value={form.budgetEngage} placeholder="ex : 250 000 €" onChange={e => setForm(f => ({ ...f, budgetEngage: e.target.value }))} />
              </div>
              <div className="info-field">
                <label className="info-field-label">Budget dépensé</label>
                <input className="info-field-input" type="text" value={form.budgetDepense} placeholder="ex : 120 000 €" onChange={e => setForm(f => ({ ...f, budgetDepense: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Estimé',    value: budgetEstime,  color: '#64748B', p: null },
                { label: 'Engagé',    value: budgetEngage,  color: '#8B5CF6', p: pctEngage },
                { label: 'Dépensé', value: budgetDepense, color: '#10B981', p: pctDepense },
              ].map(b => (
                <div key={b.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-alt)', borderRadius: 8, border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontWeight: 800, fontSize: 15, color: b.color }}>{b.value ? formatBudget(b.value) : '—'}</div>
                  {b.p != null && b.value > 0 && <div style={{ fontSize: 10, color: b.color, marginTop: 3 }}>{b.p} % du budget</div>}
                </div>
              ))}
            </div>
          )}
          {budgetEstime > 0 && !editing && (budgetEngage > 0 || budgetDepense > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {budgetEngage > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: '#8B5CF6', fontWeight: 600 }}>Engagé / Estimé</span>
                    <span style={{ fontFamily: 'DM Mono,monospace', color: '#8B5CF6', fontWeight: 700 }}>{pctEngage} %</span>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width: pctEngage + '%', background: '#8B5CF6' }} /></div>
                </div>
              )}
              {budgetDepense > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>Dépensé / Estimé</span>
                    <span style={{ fontFamily: 'DM Mono,monospace', color: '#10B981', fontWeight: 700 }}>{pctDepense} %</span>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width: pctDepense + '%', background: '#10B981' }} /></div>
                </div>
              )}
            </div>
          )}
          {budgetEstime === 0 && !editing && (
            <div className="info-box blue" style={{ fontSize: 12 }}>Aucun budget estimé renseigné. Utilisez le Reporting pour saisir les données financières.</div>
          )}
        </div>
      </div>

      {dates.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Calendrier</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', position: 'relative', padding: '0 16px' }}>
              <div style={{ position: 'absolute', top: 15, left: 32, right: 32, height: 2, background: 'var(--border)', zIndex: 0 }} />
              {dates.map((d, i) => {
                const isPast = d.date <= today;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, gap: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isPast ? d.color : 'var(--bg-main)', border: '2.5px solid ' + d.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPast ? <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: d.color, textAlign: 'center' }}>{d.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace', textAlign: 'center' }}>{formatDate(d.date)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">Notes ERP</span></div>
        <div className="card-body">
          <textarea rows={4} style={{ width: '100%', resize: 'vertical', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-main)' }}
            placeholder="Numéros de commande, références SAP/Oracle, notes de suivi financier…"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            onBlur={() => setMeta(id, { notesErp: form.notes })} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sauvegarde automatique à la perte du focus.</div>
        </div>
      </div>
    </Layout>
  );
}
