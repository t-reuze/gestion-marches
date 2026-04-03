import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import KpiCard from '../../components/KpiCard';
import { marches, STATUT_CONFIG, formatDate } from '../../data/mockData';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

function parseBudget(s) {
  return parseInt(String(s || '').replace(/[\s\u00a0\u20acKkMm,.]/g, '')) || 0;
}

function formatBudget(n) {
  if (!n) return '\u2014';
  if (n >= 1000000) return (n / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + '\u00a0M\u20ac';
  if (n >= 1000) return (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '\u00a0k\u20ac';
  return n.toLocaleString('fr-FR') + '\u00a0\u20ac';
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
    <Layout title="March\u00e9 introuvable">
      <div className="empty-state"><div className="empty-title">March\u00e9 introuvable</div></div>
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
    { label: 'Limite d\u00e9p\u00f4t', date: merged.dateLimiteDepot,        color: '#F59E0B' },
    { label: 'Attribution pr\u00e9vue', date: merged.dateAttributionPrevue,  color: '#10B981' },
  ].filter(d => d.date);

  const title = marche.reference + ' \u2014 ' + marche.nom;

  return (
    <Layout title={title} sub="\u2014 ERP \u00b7 KPI">
      <MarcheNavTabs />

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Progression" value={(merged.progression || 0) + '%'} color={STATUT_CONFIG[merged.statut]?.color || '#3B82F6'} icon="&#x1F4C8;" sub={STATUT_CONFIG[merged.statut]?.label || merged.statut} />
        <KpiCard label="Budget estim\u00e9" value={merged.budgetEstime || '\u2014'} color="#8B5CF6" icon="&#x1F4B0;" sub="estimation initiale" />
        <KpiCard label="Offres re\u00e7ues" value={merged.nbOffresRecues || 0} color="#10B981" icon="&#x1F4E5;" sub={(merged.nbLots || 0) + ' lot' + ((merged.nbLots || 0) !== 1 ? 's' : '')} />
        <KpiCard label="Responsable" value={merged.responsable || '\u2014'} color="#1A4FA8" icon="&#x1F464;" sub={merged.service || 'R\u00e9f\u00e9rent march\u00e9'} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">&#x1F4B0; Suivi budg\u00e9taire</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>&#x2713; Enregistr\u00e9</span>}
            <button className={'btn btn-sm ' + (editing ? 'btn-primary' : 'btn-outline')} onClick={() => editing ? save() : setEditing(true)}>
              {editing ? '&#x2713; Sauvegarder' : '&#x270F;&#xFE0F; Modifier'}
            </button>
            {editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Annuler</button>}
          </div>
        </div>
        <div className="card-body">
          {editing ? (
            <div className="info-grid">
              <div className="info-field">
                <label className="info-field-label">Budget engag\u00e9</label>
                <input className="info-field-input" type="text" value={form.budgetEngage} placeholder="ex\u00a0: 250\u00a0000\u00a0\u20ac" onChange={e => setForm(f => ({ ...f, budgetEngage: e.target.value }))} />
              </div>
              <div className="info-field">
                <label className="info-field-label">Budget d\u00e9pens\u00e9</label>
                <input className="info-field-input" type="text" value={form.budgetDepense} placeholder="ex\u00a0: 120\u00a0000\u00a0\u20ac" onChange={e => setForm(f => ({ ...f, budgetDepense: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Estim\u00e9',    value: budgetEstime,  color: '#64748B', p: null },
                { label: 'Engag\u00e9',    value: budgetEngage,  color: '#8B5CF6', p: pctEngage },
                { label: 'D\u00e9pens\u00e9', value: budgetDepense, color: '#10B981', p: pctDepense },
              ].map(b => (
                <div key={b.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-alt)', borderRadius: 8, border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontWeight: 800, fontSize: 15, color: b.color }}>{b.value ? formatBudget(b.value) : '\u2014'}</div>
                  {b.p != null && b.value > 0 && <div style={{ fontSize: 10, color: b.color, marginTop: 3 }}>{b.p}\u00a0% du budget</div>}
                </div>
              ))}
            </div>
          )}
          {budgetEstime > 0 && !editing && (budgetEngage > 0 || budgetDepense > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {budgetEngage > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: '#8B5CF6', fontWeight: 600 }}>Engag\u00e9 / Estim\u00e9</span>
                    <span style={{ fontFamily: 'DM Mono,monospace', color: '#8B5CF6', fontWeight: 700 }}>{pctEngage}\u00a0%</span>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width: pctEngage + '%', background: '#8B5CF6' }} /></div>
                </div>
              )}
              {budgetDepense > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>D\u00e9pens\u00e9 / Estim\u00e9</span>
                    <span style={{ fontFamily: 'DM Mono,monospace', color: '#10B981', fontWeight: 700 }}>{pctDepense}\u00a0%</span>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width: pctDepense + '%', background: '#10B981' }} /></div>
                </div>
              )}
            </div>
          )}
          {budgetEstime === 0 && !editing && (
            <div className="info-box blue" style={{ fontSize: 12 }}>Aucun budget estim\u00e9 renseign\u00e9. Utilisez le Reporting pour saisir les donn\u00e9es financi\u00e8res.</div>
          )}
        </div>
      </div>

      {dates.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">&#x1F4C5; Calendrier</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', position: 'relative', padding: '0 16px' }}>
              <div style={{ position: 'absolute', top: 15, left: 32, right: 32, height: 2, background: 'var(--border)', zIndex: 0 }} />
              {dates.map((d, i) => {
                const isPast = d.date <= today;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, gap: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isPast ? d.color : 'var(--bg-main)', border: '2.5px solid ' + d.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPast ? <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>&#x2713;</span> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />}
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
        <div className="card-header"><span className="card-title">&#x1F4DD; Notes ERP</span></div>
        <div className="card-body">
          <textarea rows={4} style={{ width: '100%', resize: 'vertical', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-main)' }}
            placeholder="Num\u00e9ros de commande, r\u00e9f\u00e9rences SAP/Oracle, notes de suivi financier\u2026"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            onBlur={() => setMeta(id, { notesErp: form.notes })} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sauvegarde automatique \u00e0 la perte du focus.</div>
        </div>
      </div>
    </Layout>
  );
}
