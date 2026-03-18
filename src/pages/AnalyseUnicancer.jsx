import { useState } from 'react';
import Layout from '../components/Layout';
import KpiCard from '../components/KpiCard';

const STEPS = [
  { num: 1, title: 'Se placer dans le dossier', cmd: 'cd analyse-unicancer', icon: '💻' },
  { num: 2, title: 'Installer les dépendances', cmd: 'pip install -r requirements.txt', icon: '📦' },
  { num: 3, title: "Lancer l'application", cmd: 'streamlit run completion_tracabilite.py', icon: '🚀' },
];

const FEATURES = [
  { icon: '📁', title: 'Dossier source', desc: 'Sélection du répertoire des réponses fournisseurs' },
  { icon: '📊', title: 'Annuaire documents', desc: 'Détection automatique des 14 documents par fournisseur' },
  { icon: '📋', title: 'Compilation QT', desc: 'Compilation des Questionnaires Techniques (Lots 1, 2, 3)' },
  { icon: '📥', title: 'Export Excel', desc: "Export de l'annuaire et des compilations formatés" },
  { icon: '👥', title: 'Contacts', desc: 'Gestion des contacts fournisseurs' },
  { icon: '🔍', title: 'Détail QT', desc: 'Statut de complétion des QT par fournisseur et par lot' },
];

export default function AnalyseUnicancer() {
  const [copied, setCopied] = useState(null);

  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Layout title="AO Recrutement Personnel 2026" sub="— Analyse des offres Unicancer">

      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1B3A5C 0%, #2A5C8A 100%)',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <span style={{ fontSize: 36 }}>📋</span>
        <div>
          <div style={{ color: '#E87722', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Unicancer</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Traçabilité &amp; Compilation — AO Recrutement de Personnel 2026</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>Interface Streamlit de traçabilité des documents fournisseurs et compilation des QT</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <KpiCard label="Lots" value="3" color="#1A4FA8" icon="📦" sub="MAD · Recrutement · Freelance" />
        <KpiCard label="Documents suivis" value="14" color="#10B981" icon="📄" sub="par fournisseur" />
        <KpiCard label="Technologie" value="Streamlit" color="#E87722" icon="🐍" sub="Python · openpyxl · xlrd" />
      </div>

      {/* Lancement */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">🚀 Lancer l'application</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Depuis un terminal à la racine du projet :
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {STEPS.map(s => (
              <div key={s.num} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border)',
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#1A4FA8', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{s.num}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 180, flexShrink: 0 }}>
                  {s.icon} {s.title}
                </span>
                <code style={{
                  flex: 1, background: '#0f172a', color: '#7dd3fc',
                  padding: '4px 10px', borderRadius: 5, fontSize: 12,
                  fontFamily: 'DM Mono, monospace',
                }}>{s.cmd}</code>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => copy(s.cmd, s.num)}
                  style={{ flexShrink: 0 }}
                >
                  {copied === s.num ? '✅ Copié' : '📋 Copier'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => window.open('http://localhost:8501', '_blank')}
            >
              🌐 Ouvrir l'application
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              L'application doit être démarrée au préalable (localhost:8501)
            </span>
          </div>
        </div>
      </div>

      {/* Fonctionnalités */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⚙️ Fonctionnalités</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 14px',
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </Layout>
  );
}
