import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Cell
} from "recharts";

import Layout from "../components/Layout";
import MarcheNavTabs from "../components/MarcheNavTabs";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const FOURNISSEUR_COLORS = {
  ELEMENT: "#2563eb",
  ILLUMINA: "#16a34a",
  "LIFE TECH": "#dc2626",
  "Oxford Nano": "#9333ea",
};

const OFFRES = [
  { id: "OFF-001", fournisseur: "ELEMENT", equipement: "AVITI24" },
  { id: "OFF-002", fournisseur: "ELEMENT", equipement: "AVITI" },
  { id: "OFF-003", fournisseur: "ELEMENT", equipement: "AVITI24 upgrade", ecarte: true },
  { id: "OFF-004", fournisseur: "ILLUMINA", equipement: "NextSeq 2000" },
  { id: "OFF-005", fournisseur: "ILLUMINA", equipement: "NextSeq 1000" },
  { id: "OFF-006", fournisseur: "ILLUMINA", equipement: "MiSeq i100 +" },
  { id: "OFF-007", fournisseur: "ILLUMINA", equipement: "MiSeq i100" },
  { id: "OFF-008", fournisseur: "ILLUMINA", equipement: "NovaSeq X" },
  { id: "OFF-009", fournisseur: "ILLUMINA", equipement: "NovaSeq X +" },
  { id: "OFF-010", fournisseur: "LIFE TECH", equipement: "Genexus DX" },
  { id: "OFF-011", fournisseur: "LIFE TECH", equipement: "Genexus RUO" },
  { id: "OFF-012", fournisseur: "Oxford Nano", equipement: "PromethION 24" },
  { id: "OFF-013", fournisseur: "Oxford Nano", equipement: "PromethION 2 Integrated" },
  { id: "OFF-014", fournisseur: "Oxford Nano", equipement: "GridION" },
];

const CLASSEMENT = [
  { rang: 1, equipement: "MiSeq i100 +", fournisseur: "ILLUMINA", score: 4.119, recommandation: "Recommande" },
  { rang: 2, equipement: "MiSeq i100", fournisseur: "ILLUMINA", score: 4.119, recommandation: "A considerer" },
  { rang: 3, equipement: "GridION", fournisseur: "Oxford Nano", score: 4.079, recommandation: "A considerer" },
  { rang: 4, equipement: "AVITI24", fournisseur: "ELEMENT", score: 4.061, recommandation: null },
  { rang: 5, equipement: "PromethION 2 Integrated", fournisseur: "Oxford Nano", score: 4.058, recommandation: null },
  { rang: 6, equipement: "AVITI", fournisseur: "ELEMENT", score: 4.051, recommandation: null },
  { rang: 7, equipement: "PromethION 24", fournisseur: "Oxford Nano", score: 4.037, recommandation: null },
  { rang: 8, equipement: "AVITI24 upgrade", fournisseur: "ELEMENT", score: 3.884, recommandation: null },
  { rang: 9, equipement: "NextSeq 2000", fournisseur: "ILLUMINA", score: 3.877, recommandation: null },
  { rang: 10, equipement: "NextSeq 1000", fournisseur: "ILLUMINA", score: 3.877, recommandation: null },
  { rang: 11, equipement: "NovaSeq X +", fournisseur: "ILLUMINA", score: 3.844, recommandation: null },
  { rang: 12, equipement: "NovaSeq X", fournisseur: "ILLUMINA", score: 3.819, recommandation: null },
  { rang: 13, equipement: "Genexus DX", fournisseur: "LIFE TECH", score: 3.303, recommandation: null },
  { rang: 14, equipement: "Genexus RUO", fournisseur: "LIFE TECH", score: 3.303, recommandation: null },
];

const SECTIONS = {
  "Implantation / Logistique": {
    icon: "📦",
    scoreParOffre: { "AVITI24": 4.625, "AVITI": 4.625, "NextSeq 2000": 4.625, "NextSeq 1000": 4.625, "MiSeq i100 +": 4.875, "MiSeq i100": 4.875, "NovaSeq X": 4.125, "NovaSeq X +": 4.125, "Genexus DX": 4.75, "Genexus RUO": 4.75, "PromethION 24": 4.125, "PromethION 2 Integrated": 4.25, "GridION": 4.375 },
    criteres: [
      { question: "Délai de livraison (à partir du BC)", methodologie: "OK : 15j / 1 mois / 3 mois", notes: { "AVITI24": 3, "AVITI": 3, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 4, "Genexus RUO": 4, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 4.0 },
      { question: "Durée d'installation (montage vers Acceptance)", methodologie: "REX utilisateurs : Illumina/ON 1j si ok", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 4, "Genexus RUO": 4, "PromethION 24": 5, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 4.54 },
      { question: "Poids élément le plus lourd (kg)", methodologie: "5 tous sauf si > 500 kg", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 5, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 4.85 },
      { question: "Plage de température opérationnelle (°C)", methodologie: "OK : limite 22°C", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 5, "NovaSeq X +": 5, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 3, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 4.85 },
      { question: "Intensité requise (A)", methodologie: "10 - 20 A", notes: { "AVITI24": 4, "AVITI": 4, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 4, "MiSeq i100": 4, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 5, "PromethION 2 Integrated": 4, "GridION": 5 }, moyenne: 4.31 },
      { question: "Puissance requise (W)", methodologie: "2 000 W - 10 000 W", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 5, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 4.85 },
      { question: "Charge maximale (kVa)", methodologie: "3 - 5 kVA", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 1, "PromethION 2 Integrated": 1, "GridION": 1 }, moyenne: 4.0 },
      { question: "Poids total équipement (kg)", methodologie: "5 tous sauf si > 500 kg", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 5, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 4.85 },
    ]
  },
  "Technique / Équipement": {
    icon: "🔬",
    scoreParOffre: { "AVITI24": 4.364, "AVITI": 4.3, "NextSeq 2000": 4.05, "NextSeq 1000": 4.05, "MiSeq i100 +": 4.65, "MiSeq i100": 4.65, "NovaSeq X": 4.5, "NovaSeq X +": 4.65, "Genexus DX": 4.25, "Genexus RUO": 4.25, "PromethION 24": 3.75, "PromethION 2 Integrated": 3.75, "GridION": 3.75 },
    criteres: [
      { question: "Long-read / Multi-omique", methodologie: "5 multiomic (element) et vraie méthyl (ON) / 4 les autres", notes: { "AVITI24": 5, "AVITI": 4, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 4, "MiSeq i100": 4, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 4, "Genexus RUO": 4, "PromethION 24": 5, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 4.31 },
      { question: "Délai entre deux flow-cell", methodologie: "Element sans délai -> 5 / NovaSeq petit délai -> 4 / les autres -> 3", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 3, "NextSeq 1000": 3, "MiSeq i100 +": 3, "MiSeq i100": 3, "NovaSeq X": 3, "NovaSeq X +": 5, "Genexus DX": 3, "Genexus RUO": 3, "PromethION 24": 3, "PromethION 2 Integrated": 3, "GridION": 3 }, moyenne: 3.46 },
      { question: "Run time (h) par flow cell", methodologie: "Element : 3 / Life Tech : 5 / les autres : 4", notes: { "AVITI24": 3, "AVITI": 3, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 4, "MiSeq i100": 4, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 4.0 },
      { question: "Nombre de reads par run", methodologie: "Critère différenciant", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 4, "MiSeq i100": 4, "NovaSeq X": 5, "NovaSeq X +": 5, "Genexus DX": 4, "Genexus RUO": 4, "PromethION 24": 4, "PromethION 2 Integrated": 3, "GridION": 3 }, moyenne: 4.15 },
      { question: "Qualité des données (Q30 %)", methodologie: "Benchmark qualité", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 5, "NovaSeq X +": 5, "Genexus DX": 4, "Genexus RUO": 4, "PromethION 24": 3, "PromethION 2 Integrated": 3, "GridION": 3 }, moyenne: 4.23 },
    ]
  },
  "SLA / Maintenance": {
    icon: "🔧",
    scoreParOffre: { "AVITI24": 3.727, "AVITI": 3.727, "NextSeq 2000": 4.727, "NextSeq 1000": 4.727, "MiSeq i100 +": 4.909, "MiSeq i100": 4.909, "NovaSeq X": 4.182, "NovaSeq X +": 4.182, "Genexus DX": 3.0, "Genexus RUO": 3.0, "PromethION 24": 4.091, "PromethION 2 Integrated": 4.091, "GridION": 4.091 },
    criteres: [
      { question: "Localisation et nb de personnes SAV/techniques", methodologie: "Element : 1 FR -> 3 / Illumina : présence FR -> 5", notes: { "AVITI24": 3, "AVITI": 3, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 5, "NovaSeq X +": 5, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 3, "PromethION 2 Integrated": 3, "GridION": 3 }, moyenne: 4.23 },
      { question: "Plage horaire d'ouverture centre d'appel", methodologie: "Element : -1 pour démarrage à 10h", notes: { "AVITI24": 4, "AVITI": 4, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 5, "NovaSeq X +": 5, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 5, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 4.85 },
      { question: "Plage horaire d'intervention", methodologie: "OK", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 5, "NovaSeq X +": 5, "Genexus DX": 5, "Genexus RUO": 5, "PromethION 24": 5, "PromethION 2 Integrated": 5, "GridION": 5 }, moyenne: 5.0 },
      { question: "Délai de prise en charge téléphonique (h)", methodologie: "Délai le plus court = meilleure note", notes: { "AVITI24": 3, "AVITI": 3, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 3, "Genexus RUO": 3, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 3.92 },
      { question: "Délai d'intervention sur site (h)", methodologie: "Délai le plus court = meilleure note", notes: { "AVITI24": 3, "AVITI": 3, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 3, "Genexus RUO": 3, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 3.92 },
      { question: "Prise en charge matériel défectueux", methodologie: "Remplacement fourni ?", notes: { "AVITI24": 3, "AVITI": 3, "NextSeq 2000": 5, "NextSeq 1000": 5, "MiSeq i100 +": 5, "MiSeq i100": 5, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 1, "Genexus RUO": 1, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 3.77 },
      { question: "Mises à jour logicielle incluses", methodologie: "Oui/Non différenciant", notes: { "AVITI24": 4, "AVITI": 4, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 4, "MiSeq i100": 4, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 3, "Genexus RUO": 3, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 3.92 },
    ]
  },
  "Formation": {
    icon: "🎓",
    scoreParOffre: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 4, "MiSeq i100": 4, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 3, "Genexus RUO": 3, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 },
    criteres: [
      { question: "Détail des programmes de formation", methodologie: "Personnels maintenance inclus aux formations labo -> différenciant", notes: { "AVITI24": 5, "AVITI": 5, "NextSeq 2000": 4, "NextSeq 1000": 4, "MiSeq i100 +": 4, "MiSeq i100": 4, "NovaSeq X": 4, "NovaSeq X +": 4, "Genexus DX": 3, "Genexus RUO": 3, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 4.07 },
    ]
  },
  "Clinique": {
    icon: "🏥",
    scoreParOffre: { "AVITI24": 4, "AVITI": 4, "NextSeq 2000": 3, "NextSeq 1000": 3, "MiSeq i100 +": 3, "MiSeq i100": 3, "NovaSeq X": 3, "NovaSeq X +": 3, "Genexus DX": 2, "Genexus RUO": 2, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 },
    criteres: [
      { question: "Applications cliniques couvertes", methodologie: "Breadth des applications disponibles", notes: { "AVITI24": 4, "AVITI": 4, "NextSeq 2000": 3, "NextSeq 1000": 3, "MiSeq i100 +": 3, "MiSeq i100": 3, "NovaSeq X": 3, "NovaSeq X +": 3, "Genexus DX": 2, "Genexus RUO": 2, "PromethION 24": 4, "PromethION 2 Integrated": 4, "GridION": 4 }, moyenne: 3.31 },
    ]
  },
  "AFIB / Cybersécurité": {
    icon: "🔒",
    scoreParOffre: { "AVITI24": 2.652, "AVITI": 2.652, "NextSeq 2000": 2.86, "NextSeq 1000": 2.86, "MiSeq i100 +": 3.279, "MiSeq i100": 3.279, "NovaSeq X": 3.105, "NovaSeq X +": 3.105, "Genexus DX": 2.815, "Genexus RUO": 2.815, "PromethION 24": 4.257, "PromethION 2 Integrated": 4.257, "GridION": 4.257 },
    criteres: [
      { question: "Q1 — Accès au dispositif médical", methodologie: null, notes: { "AVITI24": 1, "AVITI": 1, "NextSeq 2000": 0.5, "NextSeq 1000": 0.5, "MiSeq i100 +": 1, "MiSeq i100": 1, "NovaSeq X": 0.5, "NovaSeq X +": 0.5, "Genexus DX": 1, "Genexus RUO": 1, "PromethION 24": 1, "PromethION 2 Integrated": 1, "GridION": 1 }, moyenne: 0.86 },
      { question: "Q2 — Méthode d'authentification supportée", methodologie: null, notes: { "AVITI24": 1, "AVITI": 1, "NextSeq 2000": 1, "NextSeq 1000": 1, "MiSeq i100 +": 1, "MiSeq i100": 1, "NovaSeq X": 1, "NovaSeq X +": 1, "Genexus DX": 1, "Genexus RUO": 1, "PromethION 24": 1, "PromethION 2 Integrated": 1, "GridION": 1 }, moyenne: 1.0 },
      { question: "Q3 — Mécanisme SSO implémentable", methodologie: null, notes: { "AVITI24": 1, "AVITI": 1, "PromethION 24": 1, "PromethION 2 Integrated": 1, "GridION": 1 }, moyenne: 1.0 },
    ]
  }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const scoreColor = (v) => {
  if (v === null || v === undefined) return "#94a3b8";
  if (v >= 4.5) return "#16a34a";
  if (v >= 3.5) return "#2563eb";
  if (v >= 2.5) return "#f59e0b";
  return "#dc2626";
};

const scoreBg = (v) => {
  if (v === null || v === undefined) return { background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0" };
  if (v >= 4.5) return { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" };
  if (v >= 3.5) return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
  if (v >= 2.5) return { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" };
  return { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" };
};

const recoBadge = (r) => {
  if (!r) return null;
  if (r === "Recommande") return { bg: "#f0fdf4", text: "#166534", border: "#86efac", label: "Recommandé" };
  if (r === "A considerer") return { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", label: "À considérer" };
  return { bg: "#f8fafc", text: "#1e293b", border: "#e2e8f0", label: r };
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, fontFamily: "monospace" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>
          {p.value?.toFixed ? p.value.toFixed(2) : p.value}{" "}
          <span style={{ color: "#64748b", fontWeight: 400 }}>/5</span>
        </p>
      ))}
    </div>
  );
};

// ─── SECTION CONTENT ──────────────────────────────────────────────────────────

function SectionContent({ name, data }) {
  const [view, setView] = useState("graphique");

  const offresNotes = OFFRES
    .filter(o => !o.ecarte && data.scoreParOffre[o.equipement] !== undefined)
    .map(o => ({
      equipement: o.equipement,
      fournisseur: o.fournisseur,
      score: data.scoreParOffre[o.equipement],
      color: FOURNISSEUR_COLORS[o.fournisseur] || "#64748b"
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const moyenne = useMemo(() => {
    const vals = offresNotes.map(o => o.score).filter(v => v !== null && v !== undefined);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "-";
  }, [offresNotes]);

  const meilleure = offresNotes[0];

  const criteresMoyenneData = data.criteres.map(c => ({
    question: c.question.length > 40 ? c.question.slice(0, 40) + "…" : c.question,
    questionFull: c.question,
    moyenne: c.moyenne,
    methodologie: c.methodologie
  }));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--surface-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Moyenne section</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: scoreColor(parseFloat(moyenne)), lineHeight: 1 }}>{moyenne}</p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>sur 5</p>
        </div>
        <div style={{ background: "var(--surface-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Meilleure offre</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{meilleure?.equipement}</p>
          <p style={{ color: FOURNISSEUR_COLORS[meilleure?.fournisseur] || "#64748b", fontSize: 12, marginTop: 4, fontWeight: 600 }}>{meilleure?.fournisseur}</p>
        </div>
        <div style={{ background: "var(--surface-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Critères évalués</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{data.criteres.length}</p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>{offresNotes.length} offres notées</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[["graphique", "Scores offres"], ["critères", "Moyennes critères"], ["tableau", "Tableau détaillé"]].map(([v, label]) => (
          <div key={v} className={"tab" + (view === v ? " active" : "")} onClick={() => setView(v)}>
            {label}
          </div>
        ))}
      </div>

      {view === "graphique" && (
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 12 }}>Score de chaque offre — triées par résultat décroissant</p>
          <ResponsiveContainer width="100%" height={offresNotes.length * 42 + 40}>
            <BarChart data={offresNotes} layout="vertical" margin={{ left: 20, right: 60, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="equipement" width={155} tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={28} label={{ position: "right", formatter: v => v?.toFixed(2), fontSize: 11, fill: "#64748b", fontWeight: 700 }}>
                {offresNotes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--color-border-subtle)" }}>
            {Object.entries(FOURNISSEUR_COLORS).map(([f, c]) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "critères" && (
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 12 }}>Note moyenne de chaque critère (toutes offres confondues)</p>
          <ResponsiveContainer width="100%" height={criteresMoyenneData.length * 48 + 40}>
            <BarChart data={criteresMoyenneData} layout="vertical" margin={{ left: 20, right: 60, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="question" width={270} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = criteresMoyenneData.find(c => c.question === label);
                return (
                  <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", maxWidth: 280 }}>
                    <p style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{d?.questionFull}</p>
                    <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>{d?.methodologie || "—"}</p>
                    <p style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 700 }}>{payload[0].value?.toFixed(2)} / 5</p>
                  </div>
                );
              }} cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="moyenne" radius={[0, 6, 6, 0]} maxBarSize={30} label={{ position: "right", formatter: v => v?.toFixed(2), fontSize: 11, fill: "#64748b", fontWeight: 700 }}>
                {criteresMoyenneData.map((entry, i) => <Cell key={i} fill={scoreColor(entry.moyenne)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === "tableau" && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Critère</th>
                {offresNotes.map(o => (
                  <th key={o.equipement} className="td-center" style={{ color: FOURNISSEUR_COLORS[o.fournisseur], whiteSpace: "nowrap", fontSize: 11 }}>
                    {o.equipement}
                  </th>
                ))}
                <th className="td-center" style={{ background: "#f0f4ff" }}>Moy.</th>
              </tr>
            </thead>
            <tbody>
              {data.criteres.map((c, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{c.question}</div>
                    {c.methodologie && <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, fontStyle: "italic" }}>{c.methodologie.slice(0, 80)}</div>}
                  </td>
                  {offresNotes.map(o => {
                    const note = c.notes[o.equipement];
                    return (
                      <td key={o.equipement} className="td-center">
                        {note !== undefined && note !== null ? (
                          <span className="score-chip" style={{ ...scoreBg(note), fontWeight: 700, fontSize: 12 }}>
                            {note}
                          </span>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="td-center" style={{ background: "#f0f4ff" }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: scoreColor(c.moyenne) }}>{c.moyenne?.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--color-border)", background: "var(--surface-subtle)" }}>
                <td style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 13 }}>Score section</td>
                {offresNotes.map(o => (
                  <td key={o.equipement} className="td-center">
                    <span style={{ fontWeight: 800, fontSize: 14, color: scoreColor(o.score) }}>
                      {o.score !== null && o.score !== undefined ? o.score.toFixed(3) : "—"}
                    </span>
                  </td>
                ))}
                <td className="td-center" style={{ background: "#e8edff" }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#2563eb" }}>{moyenne}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────

function OverviewContent() {
  const radarData = Object.entries(SECTIONS).map(([name, data]) => {
    const vals = Object.values(data.scoreParOffre).filter(v => v !== null && v !== undefined);
    const moy = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return { axe: name.split(" / ")[0].substring(0, 12), full: name, moyenne: parseFloat(moy.toFixed(2)), ...Object.fromEntries(Object.entries(data.scoreParOffre).filter(([_, v]) => v !== null)) };
  });

  const top5 = CLASSEMENT.slice(0, 5).map(c => c.equipement);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>
          Classement final — Score global /5
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CLASSEMENT.slice(0, 10).map((item, i) => {
            const b = recoBadge(item.recommandation);
            const pct = ((item.score / 5) * 100).toFixed(1);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: i < 3 ? "var(--surface-subtle)" : "#fff", borderRadius: "var(--radius-lg)", border: i === 0 ? "2px solid #16a34a" : "1px solid var(--color-border)" }}>
                <span style={{ fontWeight: 900, fontSize: 18, color: i === 0 ? "#16a34a" : i === 1 ? "#2563eb" : i === 2 ? "#9333ea" : "#94a3b8", width: 28, textAlign: "center" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : item.rang}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{item.equipement}</span>
                    <span style={{ fontSize: 11, color: FOURNISSEUR_COLORS[item.fournisseur], fontWeight: 600 }}>{item.fournisseur}</span>
                    {b && (
                      <span style={{ background: b.bg, color: b.text, border: "1px solid " + b.border, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
                        {b.label}
                      </span>
                    )}
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: pct + "%", background: scoreColor(item.score) }} />
                  </div>
                </div>
                <span style={{ fontWeight: 900, fontSize: 18, color: scoreColor(item.score), minWidth: 40, textAlign: "right" }}>{item.score}</span>
              </div>
            );
          })}
        </div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Scores moyens par section</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 32 }}>
        {Object.entries(SECTIONS).map(([name, data]) => {
          const vals = Object.values(data.scoreParOffre).filter(v => v !== null && v !== undefined);
          const moy = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          const best = Object.entries(data.scoreParOffre).filter(([_, v]) => v !== null).sort(([,a],[,b]) => b-a)[0];
          return (
            <div key={name} style={{ background: "var(--surface-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{data.icon} {name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{data.criteres.length} critères</p>
                </div>
                <span style={{ fontSize: 26, fontWeight: 900, color: scoreColor(moy) }}>{moy.toFixed(2)}</span>
              </div>
              <div className="progress" style={{ marginBottom: 8 }}>
                <div className="progress-fill" style={{ width: ((moy / 5) * 100) + "%", background: scoreColor(moy) }} />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Meilleure : <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{best?.[0]}</span>
                <span style={{ color: "var(--text-muted)" }}> ({best?.[1]?.toFixed(2)})</span>
              </p>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>Radar — Top 5 offres</h3>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis dataKey="axe" tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }} />
          {top5.map((eq, i) => {
            const offre = OFFRES.find(o => o.equipement === eq);
            return (
              <Radar key={eq} name={eq} dataKey={eq} stroke={FOURNISSEUR_COLORS[offre?.fournisseur] || "#64748b"} fill={FOURNISSEUR_COLORS[offre?.fournisseur] || "#64748b"} fillOpacity={0.08} strokeWidth={2} dot={{ r: 3 }} />
            );
          })}
          <Legend formatter={(val) => <span style={{ fontSize: 12, color: "#475569" }}>{val}</span>} />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function AnalyseMarche() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("__overview__");

  const tabs = [
    { id: "__overview__", label: "Vue d'ensemble", icon: "🏠" },
    ...Object.entries(SECTIONS).map(([name, data]) => ({
      id: name, label: name.split(" / ")[0], icon: data.icon, full: name
    }))
  ];

  const sectionMoyennes = useMemo(() =>
    Object.entries(SECTIONS).reduce((acc, [name, data]) => {
      const vals = Object.values(data.scoreParOffre).filter(v => v !== null && v !== undefined);
      acc[name] = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      return acc;
    }, {}), []);

  return (
    <Layout title="PPE044 — Séquenceurs Haut Débit" sub="— Analyse des offres">
      <MarcheNavTabs />

      <div style={{ display: "flex", gap: 2, overflowX: "auto", borderBottom: "1px solid var(--color-border)", marginBottom: 24 }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const moy = tab.id !== "__overview__" ? sectionMoyennes[tab.id] : null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 16px", border: "none", cursor: "pointer", background: "transparent",
                color: isActive ? "var(--color-primary)" : "var(--text-tertiary)",
                fontWeight: isActive ? 700 : 500, fontSize: 13,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 100,
                borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <span>{tab.icon} {tab.label}</span>
              {moy !== null && (
                <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? scoreColor(moy) : "var(--text-muted)" }}>
                  {moy.toFixed(2)}/5
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "__overview__"
        ? <OverviewContent />
        : <SectionContent name={activeTab} data={SECTIONS[activeTab]} />
      }
    </Layout>
  );
}
