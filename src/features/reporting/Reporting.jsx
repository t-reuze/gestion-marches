import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

import Layout from '../../components/Layout';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import KpiCard from '../../components/KpiCard';
import StatusBadge from '../../components/StatusBadge';
import ReportingDashboard from '../../components/reporting/ReportingDashboard';
import ReportingMaintenance from '../../components/reporting/ReportingMaintenance';
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
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState('ca');

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

      <div className="tabs" style={{ marginBottom: 20 }}>
        <div className={'tab' + (activeTab === 'ca' ? ' active' : '')} onClick={() => setActiveTab('ca')}>CA</div>
        <div className={'tab' + (activeTab === 'maintenance' ? ' active' : '')} onClick={() => setActiveTab('maintenance')}>Maintenance et Équipement</div>
      </div>

      {activeTab === 'ca' && (
        <ReportingDashboard marcheId={id} />
      )}

      {activeTab === 'maintenance' && (
        <ReportingMaintenance marcheId={id} />
      )}

    </Layout>
  );
}
