import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
Chart.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import KpiCard from '../../components/KpiCard';
import StatusBadge from '../../components/StatusBadge';
import { marches, STATUT_CONFIG, formatDate } from '../../data/mockData';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

function parseBudget(s) { return parseInt(String(s).replace(/[\s€]/g, '')) || 0; }
function formatBudget(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€';
  return n.toLocaleString('fr-FR') + ' €';
}

const STATUTS = ['ouvert', 'analyse', 'attribution', 'reporting', 'cloture'];
const STATUT_LABELS = { ouvert: 'Ouvert', analyse: 'En analyse', attribution: 'Attribution', reporting: 'Reporting', cloture: 'Clôturé' };

const EMPTY_FORM = { statut: '', responsable: '', service: '', nbLots: '', nbOffresRecues: '', budgetEstime: '', dateLimiteDepot: '', dateAttributionPrevue: '', progression: '', tags: '' };

export default function Reporting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMeta, setMeta } = useMarcheMeta();
  const barRef   = useRef(null);
  const barChart = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const marche   = id ? marches.find(m => m.id === id) : null;
  const isGlobal = !marche;

  function mergeMarche(m) {
    const meta = getMeta(m.id);
    return {
      ...m, ...meta,
      referent: meta.referent || m.responsable || '',
      tags: meta.tags ? (Array.isArray(meta.tags) ? meta.tags : meta.tags.split(',').map(t => t.trim()).filter(Boolean)) : m.tags,
    };
  }

  const marchesMerged = marches.map(mergeMarche);
  const total       = marchesMerged.length;
  const actifs      = marchesMerged.filter(m => m.statut !== 'cloture').length;
  const offres      = marchesMerged.reduce((s, m) => s + (Number(m.nbOffresRecues) || 0), 0);
  const budgetTotal = marchesMerged.reduce((s, m) => s + parseBudget(m.budgetEstime), 0);
  const chartData   = [...marchesMerged].sort((a, b) => b.progression - a.progression);

  useEffect(() => {
    if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
    if (!barRef.current) return;
    barChart.current = new Chart(barRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: chartData.map(m => m.nom),
        datasets: [{
          label: 'Progression (%)',
          data: chartData.map(m => m.progression || 0),
          backgroundColor: chartData.map(m => (STATUT_CONFIG[m.statut]?.color || '#3B82F6') + 'BB'),
          borderColor:     chartData.map(m =>  STATUT_CONFIG[m.statut]?.color || '#3B82F6'),
          borderWidth: 1, borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 100, ticks: { callback: v => v + '%' } },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });
    return () => { if (barChart.current) { barChart.current.destroy(); barChart.current = null; } };
  }, [JSON.stringify(chartData.map(m => [m.nom, m.progression, m.statut]))]);

  function startEdit(m) {
    const meta = getMeta(m.id);
    const merged = mergeMarche(m);
    setForm({
      statut:              merged.statut              || '',
      responsable:         merged.responsable         || '',
      service:             merged.service             || '',
      nbLots:              merged.nbLots              != null ? String(merged.nbLots) : '',
      nbOffresRecues:      merged.nbOffresRecues      != null ? String(merged.nbOffresRecues) : '',
      budgetEstime:        merged.budgetEstime        || '',
      dateLimiteDepot:     merged.dateLimiteDepot     || '',
      dateAttributionPrevue: merged.dateAttributionPrevue || '',
      progression:         merged.progression         != null ? String(merged.progression) : '',
      tags:                Array.isArray(merged.tags) ? merged.tags.join(', ') : (merged.tags || ''),
    });
    setEditingId(m.id);
  }

  function saveEdit(marcheId) {
    const fields = {
      statut:              form.statut || undefined,
      responsable:         form.responsable || '',
      service:             form.service || '',
      nbLots:              form.nbLots !== '' ? Number(form.nbLots) : 0,
      nbOffresRecues:      form.nbOffresRecues !== '' ? Number(form.nbOffresRecues) : 0,
      budgetEstime:        form.budgetEstime || '',
      dateLimiteDepot:     form.dateLimiteDepot || '',
      dateAttributionPrevue: form.dateAttributionPrevue || '',
      progression:         form.progression !== '' ? Number(form.progression) : 0,
      tags:                form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    setMeta(marcheId, fields);
    setEditingId(null);
  }

  const title = marche ? marche.reference + ' — ' + marche.nom : 'Reporting global';
  const sub   = marche ? '— Suivi et bilan' : '— Synthèse de tous les marchés';

  return (
    <Layout title={title} sub={sub}>
      <MarcheNavTabs />

      <div className="kpi-grid">
        <KpiCard label="Total marchés"  value={total}                         color="#1A4FA8" icon="&#x1F4CB;" sub={actifs + ' actif' + (actifs > 1 ? 's' : '')} />
        <KpiCard label="Offres reçues"  value={offres}                        color="#10B981" icon="&#x1F4E5;" sub={'cumulées tous marchés'} />
        <KpiCard label="En analyse"           value={marchesMerged.filter(m => m.statut === 'analyse').length} color="#F59E0B" icon="&#x1F50D;" sub={"marchés en cours d'éval."} />
        <KpiCard label="Budget total"         value={budgetTotal > 0 ? formatBudget(budgetTotal) : '—'} color="#8B5CF6" icon="&#x1F4B6;" sub={'estimation cumulée'} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">&#x1F4CA; Progression des marchés</span></div>
        <div className="card-body" style={{ height: 300 }}><canvas ref={barRef} /></div>
      </div>

      <div className="section-title">Tableau de synthèse</div>
      <div className="table-container" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Marché</th>
              <th>Responsable</th>
              <th>Service</th>
              <th>Statut</th>
              <th className="td-center">Offres</th>
              <th className="td-center">Lots</th>
              <th>Budget estimé</th>
              <th>Progression</th>
              <th>Dates clés</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {marchesMerged.map(m => {
              const isEditing = editingId === m.id;
              return (
                <>
                  <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => !isEditing && navigate('/marche/' + m.id + '/notation')}>
                    <td><span style={{ fontWeight: 700, color: 'var(--blue)', fontFamily: 'DM Mono,monospace', fontSize: 11 }}>{m.reference}</span></td>
                    <td><div style={{ fontWeight: 600, fontSize: 12 }}>{m.nom}</div></td>
                    <td style={{ fontSize: 11 }}>{m.referent || m.responsable || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.service || '—'}</td>
                    <td><StatusBadge statut={m.statut} /></td>
                    <td className="td-center td-mono">{m.nbOffresRecues || 0}</td>
                    <td className="td-center td-mono">{m.nbLots || 0}</td>
                    <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{m.budgetEstime || '—'}</td>
                    <td style={{ width: 140 }}>
                      {(m.progression > 0) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: m.progression + '%', background: STATUT_CONFIG[m.statut]?.color || '#3B82F6' }} />
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-muted)', width: 32 }}>{m.progression}%</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                      {m.dateLimiteDepot     && <div>Dépôt : {formatDate(m.dateLimiteDepot)}</div>}
                      {m.dateAttributionPrevue && <div>Attribution : {formatDate(m.dateAttributionPrevue)}</div>}
                      {!m.dateLimiteDepot && !m.dateAttributionPrevue && '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className={'btn btn-sm ' + (isEditing ? 'btn-primary' : 'btn-outline')}
                        style={{ fontSize: 11 }}
                        onClick={() => isEditing ? setEditingId(null) : startEdit(m)}
                      >{isEditing ? 'Fermer' : '&#x270F;&#xFE0F; Éditer'}</button>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr key={m.id + '-edit'}>
                      <td colSpan={11} style={{ padding: 0 }}>
                        <div className="edit-meta-panel">
                          <div className="edit-meta-grid">
                            <div className="edit-meta-field">
                              <label>Statut</label>
                              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                                {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
                              </select>
                            </div>
                            <div className="edit-meta-field">
                              <label>Référent</label>
                              <input type="text" value={form.responsable} placeholder="Nom du référent" onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field">
                              <label>Service</label>
                              <input type="text" value={form.service} placeholder="Service / pôle" onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field">
                              <label>Nb lots</label>
                              <input type="number" min="0" value={form.nbLots} onChange={e => setForm(f => ({ ...f, nbLots: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field">
                              <label>Offres reçues</label>
                              <input type="number" min="0" value={form.nbOffresRecues} onChange={e => setForm(f => ({ ...f, nbOffresRecues: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field">
                              <label>Budget estimé</label>
                              <input type="text" value={form.budgetEstime} placeholder="ex: 5 000 000 €" onChange={e => setForm(f => ({ ...f, budgetEstime: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field">
                              <label>Date limite dépôt</label>
                              <input type="date" value={form.dateLimiteDepot} onChange={e => setForm(f => ({ ...f, dateLimiteDepot: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field">
                              <label>Date attribution prévue</label>
                              <input type="date" value={form.dateAttributionPrevue} onChange={e => setForm(f => ({ ...f, dateAttributionPrevue: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field">
                              <label>Progression ({form.progression || 0}%)</label>
                              <input type="range" min="0" max="100" step="5" value={form.progression || 0} onChange={e => setForm(f => ({ ...f, progression: e.target.value }))} />
                            </div>
                            <div className="edit-meta-field edit-meta-field--wide">
                              <label>Tags (séparés par des virgules)</label>
                              <input type="text" value={form.tags} placeholder="ex: Imagerie, Multi-lots, Prioritaire" onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                            </div>
                          </div>
                          <div className="edit-meta-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(m.id)}>&#x2713; Sauvegarder</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Annuler</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
