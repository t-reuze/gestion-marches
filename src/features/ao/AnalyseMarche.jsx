import React, { useState, useMemo, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";

import Layout from "../../components/Layout";
import MarcheNavTabs from "../../components/MarcheNavTabs";
import { marches, getAnalyseConfig } from "../../data/mockData";
import {
  scanAnnuaire, compileQT, compileRSE, compileBPU, compileChiffrage, download,
} from "../../utils/analyseFolder";
import StandardisationBpuTab from "./StandardisationBpuTab";
import StandardisationQuestionnaireTab from "./StandardisationQuestionnaireTab";
import QualityControlTab from "./QualityControlTab";

// PALETTE & HELPERS

const PALETTE = ["#2563eb","#16a34a","#dc2626","#9333ea","#f59e0b","#0891b2","#db2777","#0d9488"];

const scoreColor = v => {
  if (v == null) return "#94a3b8";
  if (v >= 4.5) return "#16a34a";
  if (v >= 3.5) return "#2563eb";
  if (v >= 2.5) return "#f59e0b";
  return "#dc2626";
};

const scoreBg = v => {
  if (v == null) return { background:"#f1f5f9", color:"#94a3b8", border:"1px solid #e2e8f0" };
  if (v >= 4.5) return { background:"#f0fdf4", color:"#166534", border:"1px solid #bbf7d0" };
  if (v >= 3.5) return { background:"#eff6ff", color:"#1d4ed8", border:"1px solid #bfdbfe" };
  if (v >= 2.5) return { background:"#fffbeb", color:"#b45309", border:"1px solid #fde68a" };
  return { background:"#fef2f2", color:"#b91c1c", border:"1px solid #fecaca" };
};

const recoBadge = r => {
  if (!r) return null;
  if (r.includes("Recommand")) return { bg:"#f0fdf4", text:"#166534", border:"#86efac" };
  if (r.includes("Alternatif") || r.includes("consid")) return { bg:"#eff6ff", text:"#1d4ed8", border:"#93c5fd" };
  if (r.includes("Acceptable")) return { bg:"#fffbeb", text:"#b45309", border:"#fcd34d" };
  if (r.includes("Non") || r.includes("cart")) return { bg:"#fef2f2", text:"#b91c1c", border:"#fca5a5" };
  return { bg:"#f8fafc", text:"#1e293b", border:"#e2e8f0" };
};

function sectionIcon(name) {
  const n = name.toLowerCase();
  if (n.includes("techn") || n.includes("physique")) return "\u{1F52C}";
  if (n.includes("clinique")) return "\u{1F3E5}";
  if (n.includes("financ")) return "\u{1F4B0}";
  if (n.includes("tco")) return "\u{1F4CA}";
  if (n.includes("rse")) return "\u{1F331}";
  return "\u{1F4CB}";
}

function sectionAxe(name) {
  const n = name.toLowerCase();
  if (n.includes("techn") || n.includes("physique")) return "Technique";
  if (n.includes("clinique")) return "Clinique";
  if (n.includes("financ") || n.includes("tco")) return "Financier";
  if (n.includes("rse")) return "RSE";
  return name.split(" ")[0];
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"10px 14px" }}>
      <p style={{ color:"#94a3b8", fontSize:11, marginBottom:4, fontFamily:"monospace" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color:"#f1f5f9", fontSize:13, fontWeight:600 }}>
          {p.value?.toFixed ? p.value.toFixed(3) : p.value}{" "}
          <span style={{ color:"#64748b", fontWeight:400 }}>/5</span>
        </p>
      ))}
    </div>
  );
};

// PARSER

function findSheet(wb, candidates) {
  for (const c of candidates) {
    if (wb.Sheets[c]) return wb.Sheets[c];
  }
  const prefix = candidates[0].split("_")[0].toLowerCase();
  const found = wb.SheetNames.find(n => n.toLowerCase().startsWith(prefix));
  return found ? wb.Sheets[found] : null;
}

function makeQKey(axe, critere, sousCritere, question) {
  return [axe, critere, sousCritere, question].join("|||");
}

function parseAnalyseExcel(wb) {
  const toRows = ws =>
    ws ? XLSX.utils.sheet_to_json(ws, { header:1, defval:"" }) : [];

  // Offres
  const rawOffres = toRows(findSheet(wb, ["Offres"]));
  const titre = String(rawOffres[0]?.[0] || "");
  const marcheParts = titre.split("—").map(s => s.trim());
  const marche = {
    reference: marcheParts[0] || "",
    lot:       marcheParts[1] || "",
    acheteur:  "Unicancer",
  };
  const offres = rawOffres.slice(2).filter(r => r[0]).map(r => ({
    id:          String(r[0]).trim(),
    fournisseur: String(r[1]).trim(),
    equipement:  String(r[2]).trim(),
    variante:    String(r[3]).trim(),
    statut:      String(r[6] || r[4] || "").trim(),
  }));
  const fournisseurs = [...new Set(offres.map(o => o.fournisseur))];
  const colors = Object.fromEntries(fournisseurs.map((f, i) => [f, PALETTE[i % PALETTE.length]]));

  // Notation_Synthese
  const rawNote = toRows(findSheet(wb, ["Notation_Synthèse","Notation_Synthese","Notation_Synthése"]));
  const noteHdr = rawNote[1] || [];
  const noteEquipements = noteHdr.slice(2, -1).filter(Boolean).map(String);
  const sections = rawNote.slice(2, -1)
    .filter(r => r[0] && !String(r[0]).toUpperCase().includes("TOTAL"))
    .map(r => {
      const name  = String(r[0]).trim();
      const poids = parseFloat(String(r[1]).replace("%","")) || 0;
      const scoreParOffre = {};
      noteEquipements.forEach((eq, i) => {
        const partial = parseFloat(r[2 + i]) || 0;
        scoreParOffre[eq] = poids > 0
          ? parseFloat((partial / (poids / 100)).toFixed(3))
          : 0;
      });
      return { name, poids, icon: sectionIcon(name), axe: sectionAxe(name), scoreParOffre };
    });
  const totalRow = rawNote[rawNote.length - 1] || [];
  const totalScores = {};
  noteEquipements.forEach((eq, i) => { totalScores[eq] = parseFloat(totalRow[2 + i]) || 0; });

  // Classement_Final
  const rawClass = toRows(findSheet(wb, ["Classement_Final"]));
  const classement = rawClass.slice(2).filter(r => r[1]).map(r => ({
    rang:           parseInt(r[0]) || 99,
    fournisseur:    String(r[1]).trim(),
    equipement:     String(r[2]).trim(),
    variante:       String(r[3]).trim(),
    scoreTotal:     parseFloat(r[4]) || 0,
    scoreTech:      parseFloat(r[5]) || null,
    scoreFin:       parseFloat(r[6]) || null,
    recommandation: String(r[7] || "").trim() || null,
  })).sort((a, b) => a.rang - b.rang);

  // Criteres_Detailles
  const rawCrit = toRows(findSheet(wb, ["Critères_Détaillés","Criteres_Detailles"]));
  const critHdr = rawCrit[0] || [];
  const critEquipements = [];
  for (let i = 5; i < critHdr.length; i += 2) {
    const h = String(critHdr[i] || "");
    const name = h.includes("\n") ? h.split("\n")[1].trim() : h.replace(/^Réponse\s*/u,"").trim();
    if (name) critEquipements.push(name);
  }
  const criteres = rawCrit.slice(1).filter(r => r[3]).map(r => {
    const notes = {}, reponses = {};
    critEquipements.forEach((eq, i) => {
      const resp    = r[5 + i * 2];
      const noteVal = r[6 + i * 2];
      if (resp !== "" && resp != null) reponses[eq] = String(resp).slice(0, 600);
      if (noteVal !== "" && noteVal != null) {
        const n = parseFloat(noteVal);
        if (!isNaN(n)) notes[eq] = n;
      }
    });
    const axe         = String(r[0]).trim();
    const critere     = String(r[1]).trim();
    const sousCritere = String(r[2]).trim();
    const question    = String(r[3]).trim();
    return {
      axe, critere, sousCritere, question,
      methodologie: r[4] ? String(r[4]).trim().slice(0, 160) : null,
      notes, reponses,
      qKey: makeQKey(axe, critere, sousCritere, question),
    };
  }).filter(c => Object.keys(c.notes).length > 0 || Object.keys(c.reponses).length > 0);

  // Prix_TCO
  const rawTCO = toRows(findSheet(wb, ["Prix_TCO"]));
  const tcoHdr = rawTCO[1] || [];
  const tcoEquipements = tcoHdr.slice(1, -1).filter(Boolean).map(String);
  const prixTCO = rawTCO.slice(2).filter(r => r[0]).map(r => {
    const values = {};
    tcoEquipements.forEach((eq, i) => { values[eq] = r[1 + i]; });
    return { indicateur: String(r[0]).trim(), values };
  });

  if (!offres.length) throw new Error("Feuille Offres vide ou non trouvée");
  if (!sections.length) throw new Error("Feuille Notation_Synthèse vide ou non trouvée");

  return { marche, offres, fournisseurs, colors, classement, sections, criteres, prixTCO, totalScores, noteEquipements };
}

// FOLDER PICKER ZONE

function FolderPickerZone({ onScan, scanning, scanProgress, dirPath, warning, nbFournisseurs }) {
  const supportsApi = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  return (
    <div className="card" style={{ marginBottom:16 }}>
      <div className="card-header"><span className="card-title">Dossier de l&apos;AO</span></div>
      <div className="card-body">
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <button className="btn btn-outline" onClick={() => onScan('pick')} disabled={!supportsApi || scanning}>
            Sélectionner le dossier…
          </button>
          {dirPath && (
            <>
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:2 }}>Dossier :</div>
                <code style={{ background:"var(--bg)", border:"1px solid var(--border)", padding:"4px 10px", borderRadius:5, fontSize:12 }}>{dirPath}</code>
              </div>
              <button className="btn btn-primary" onClick={() => onScan('scan')} disabled={scanning}>
                {scanning ? scanProgress : 'Analyser'}
              </button>
            </>
          )}
          {nbFournisseurs > 0 && !scanning && (
            <span style={{ fontSize:12, color:"#15803d", fontWeight:600, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:6, padding:"3px 10px" }}>
              ✓ {nbFournisseurs} fournisseur{nbFournisseurs > 1 ? 's' : ''} détecté{nbFournisseurs > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!supportsApi && (
          <div style={{ marginTop:8, fontSize:12, color:"#d97706" }}>
            Navigateur non compatible — Chrome ou Edge requis.
          </div>
        )}
        {warning && <div style={{ marginTop:8, fontSize:12, color:"#d97706" }}>Avertissement : {warning}</div>}
      </div>
    </div>
  );
}

// OVERVIEW TAB

function OverviewTab({ data }) {
  const { classement, sections, offres, colors } = data;
  const top5eq = classement.slice(0, 5).map(c => c.equipement);

  const radarData = sections.map(s => {
    const row = { axe: s.name.length > 14 ? s.name.slice(0,14) + "…" : s.name, fullName: s.name };
    Object.entries(s.scoreParOffre).forEach(([eq, v]) => { row[eq] = v; });
    return row;
  });

  return (
    <div>
      <h3 style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", marginBottom:16 }}>
        Classement final &mdash; Score global /5
      </h3>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:32 }}>
        {classement.map((item, i) => {
          const b = recoBadge(item.recommandation);
          const pct = Math.min((item.scoreTotal / 5) * 100, 100).toFixed(1);
          const col = colors[item.fournisseur] || "#64748b";
          return (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
              background: i === 0 ? "var(--surface-subtle)" : "#fff",
              borderRadius:"var(--radius-lg)",
              border: i === 0 ? "2px solid #16a34a" : "1px solid var(--color-border)",
            }}>
              <span style={{ fontWeight:900, fontSize:18, width:28, textAlign:"center",
                color: i===0?"#16a34a":i===1?"#2563eb":i===2?"#9333ea":"#94a3b8" }}>
                {i===0?"\u{1F947}":i===1?"\u{1F948}":i===2?"\u{1F949}":item.rang}
              </span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>{item.equipement}</span>
                  {item.variante && <span style={{ fontSize:10, color:"var(--text-muted)", background:"var(--surface-subtle)", padding:"2px 6px", borderRadius:4 }}>{item.variante}</span>}
                  <span style={{ fontSize:11, color:col, fontWeight:700 }}>{item.fournisseur}</span>
                  {b && item.recommandation && (
                    <span style={{ background:b.bg, color:b.text, border:"1px solid "+b.border, fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:6 }}>
                      {item.recommandation.replace(/[✅⭐⚠️❌]\s?/g,"").trim()}
                    </span>
                  )}
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width:pct+"%", background:scoreColor(item.scoreTotal) }} />
                </div>
              </div>
              <span style={{ fontWeight:900, fontSize:18, color:scoreColor(item.scoreTotal), minWidth:40, textAlign:"right" }}>
                {item.scoreTotal.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", marginBottom:16 }}>
        Scores moyens par section
      </h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:12, marginBottom:32 }}>
        {sections.map(s => {
          const vals = Object.values(s.scoreParOffre).filter(v => v != null);
          const moy = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
          const best = Object.entries(s.scoreParOffre).sort(([,a],[,b])=>b-a)[0];
          return (
            <div key={s.name} style={{ background:"var(--surface-subtle)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-lg)", padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <p style={{ fontSize:11, color:"var(--text-secondary)", fontWeight:700, marginBottom:2 }}>{s.icon} {s.name}</p>
                  <p style={{ fontSize:10, color:"var(--text-muted)" }}>Poids {s.poids}%</p>
                </div>
                <span style={{ fontSize:22, fontWeight:900, color:scoreColor(moy) }}>{moy.toFixed(2)}</span>
              </div>
              <div className="progress" style={{ marginBottom:6 }}>
                <div className="progress-fill" style={{ width:((moy/5)*100)+"%", background:scoreColor(moy) }} />
              </div>
              <p style={{ fontSize:10, color:"var(--text-muted)" }}>
                Meilleur : <span style={{ fontWeight:700, color:"var(--text-primary)" }}>{best?.[0]}</span>
                <span> ({best?.[1]?.toFixed(2)})</span>
              </p>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", marginBottom:12 }}>
        Radar &mdash; Top 5 offres
      </h3>
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={radarData} margin={{ top:10, right:30, bottom:10, left:30 }}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis dataKey="axe" tick={{ fontSize:11, fill:"#475569", fontWeight:600 }} />
          {top5eq.map((eq, i) => {
            const offre = offres.find(o => o.equipement === eq);
            const col = colors[offre?.fournisseur] || PALETTE[i];
            return (
              <Radar key={eq} name={eq} dataKey={eq} stroke={col} fill={col} fillOpacity={0.07} strokeWidth={2} dot={{ r:3 }} />
            );
          })}
          <Legend formatter={v => <span style={{ fontSize:11, color:"#475569" }}>{v}</span>} />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <h3 style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", marginBottom:16, marginTop:32 }}>
        Histogrammes de préférences par section
      </h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(360px, 1fr))", gap:20, marginBottom:16 }}>
        {sections.map(s => {
          const barData = Object.entries(s.scoreParOffre)
            .filter(([, v]) => v != null)
            .sort(([, a], [, b]) => b - a)
            .map(([eq, v]) => {
              const offre = offres.find(o => o.equipement === eq);
              return { name: eq, score: parseFloat(v.toFixed(3)), color: colors[offre?.fournisseur] || "#64748b" };
            });
          if (!barData.length) return null;
          return (
            <div key={s.name} style={{ background:"var(--surface-subtle)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-lg)", padding:"16px 16px 8px 16px" }}>
              <p style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", marginBottom:10 }}>
                {s.icon} {s.name}
                <span style={{ fontWeight:400, color:"var(--text-muted)", marginLeft:6 }}>({s.poids}%)</span>
              </p>
              <ResponsiveContainer width="100%" height={Math.max(80, barData.length * 30)}>
                <BarChart layout="vertical" data={barData} margin={{ top:0, right:50, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize:10, fill:"#94a3b8" }} tickCount={6} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"#475569" }} width={100} />
                  <Tooltip formatter={(v) => [v.toFixed(3), "Score /5"]} />
                  <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// NOTE SLIDER

function NoteSlider({ value, onChange, vendorColor }) {
  const isSkip   = value === "skip";
  const hasNote  = value !== null && value !== undefined && !isSkip;
  const bg       = hasNote ? scoreBg(value) : null;

  if (isSkip) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{
          fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:8,
          background:"#f1f5f9", color:"#64748b", border:"1px solid #cbd5e1",
        }}>Non noté</span>
        <button onClick={() => onChange(null)} style={{
          fontSize:10, color:"var(--color-primary)", background:"none",
          border:"none", cursor:"pointer", textDecoration:"underline",
        }}>Remettre</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", minWidth:42 }}>Note :</span>
        <span style={{ fontWeight:900, fontSize:20, minWidth:36, color: hasNote ? bg.color : "#cbd5e1" }}>
          {hasNote ? value.toFixed(1) : "—"}
        </span>
        <span style={{ fontSize:11, color:"var(--text-muted)" }}>/5</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {hasNote && (
            <button onClick={() => onChange(null)} style={{
              fontSize:10, color:"var(--text-muted)", background:"none",
              border:"none", cursor:"pointer", textDecoration:"underline",
            }}>Effacer</button>
          )}
          <button onClick={() => onChange("skip")} style={{
            fontSize:10, color:"#64748b", background:"#f1f5f9",
            border:"1px solid #cbd5e1", borderRadius:6, cursor:"pointer", padding:"2px 8px",
          }}>Non noté</button>
        </div>
      </div>
      <input
        type="range" min="0" max="5" step="0.5"
        value={hasNote ? value : 0}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width:"100%", cursor:"pointer",
          opacity: hasNote ? 1 : 0.35,
          accentColor: vendorColor || "var(--color-primary)",
        }}
      />
      <div style={{ display:"flex", justifyContent:"space-between", padding:"0 1px" }}>
        {[0,1,2,3,4,5].map(v => (
          <span key={v} style={{ fontSize:9, color:"var(--text-muted)" }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

// STEP NOTATION VIEW

function StepNotationView({ criteres, offresNotes, section, onSetNote }) {
  // Group by critère
  const critGroups = useMemo(() => {
    const g = {};
    for (const c of criteres) {
      const key = c.critere || "Général";
      if (!g[key]) g[key] = [];
      g[key].push(c);
    }
    return g;
  }, [criteres]);

  const critNames = Object.keys(critGroups);
  const [selectedCrit, setSelectedCrit] = useState(() => critNames[0] || "");
  const [qIdx, setQIdx]                 = useState(0);
  const [expanded, setExpanded]         = useState({});

  const currentGroup = critGroups[selectedCrit] || [];
  const safeIdx      = Math.min(qIdx, currentGroup.length - 1);
  const q            = currentGroup[safeIdx];

  function selectCrit(name) { setSelectedCrit(name); setQIdx(0); setExpanded({}); }
  function goTo(i)           { setQIdx(i); setExpanded({}); }

  if (!q) return (
    <p style={{ color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>Aucun critère disponible.</p>
  );

  const total      = currentGroup.length;
  const notedGroup = currentGroup.filter(c => Object.values(c.notes).some(v => typeof v === "number")).length;
  const notedTotal = criteres.filter(c => Object.values(c.notes).some(v => typeof v === "number")).length;
  const pct        = ((safeIdx + 1) / total * 100).toFixed(1);
  const TRUNC      = 320;

  // Jump window
  const winSize  = 9;
  const half     = Math.floor(winSize / 2);
  const winStart = Math.max(0, Math.min(safeIdx - half, total - winSize));
  const winEnd   = Math.min(total, winStart + winSize);
  const jumpIdxs = Array.from({ length: winEnd - winStart }, (_, i) => winStart + i);

  return (
    <div>
      {/* ── Critère selector ── */}
      <div style={{ marginBottom:16 }}>
        <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase",
          letterSpacing:1, marginBottom:8 }}>
          Catégories &mdash; {notedTotal}/{criteres.length} questions notées au total
        </p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {critNames.map(name => {
            const grp     = critGroups[name];
            const noted   = grp.filter(c => Object.values(c.notes).some(v => typeof v === "number")).length;
            const isActive = name === selectedCrit;
            const allNoted = noted === grp.length;
            return (
              <button key={name} onClick={() => selectCrit(name)} style={{
                padding:"6px 14px", borderRadius:"var(--radius-lg)", cursor:"pointer",
                border: isActive ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: isActive ? "var(--color-primary-bg)" : allNoted ? "#f0fdf4" : "var(--surface-subtle)",
                color: isActive ? "var(--color-primary)" : allNoted ? "#166534" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500, fontSize:12,
                display:"flex", alignItems:"center", gap:6,
              }}>
                <span>{name}</span>
                <span style={{
                  fontSize:10, padding:"1px 7px", borderRadius:10,
                  background: isActive ? "var(--color-primary)" : allNoted ? "#bbf7d0" : "var(--color-border)",
                  color: isActive ? "#fff" : allNoted ? "#166534" : "var(--text-muted)",
                  fontWeight:700,
                }}>{noted}/{grp.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, flexWrap:"wrap", gap:4 }}>
          <span style={{ fontSize:12, color:"var(--text-secondary)" }}>
            <strong style={{ color:"var(--color-primary)" }}>{selectedCrit}</strong>
            {" — Question "}<strong>{safeIdx + 1}</strong>/{total}
            {" — "}<strong style={{ color:"#16a34a" }}>{notedGroup}</strong>
            <span style={{ color:"var(--text-muted)" }}> notées</span>
          </span>
          <span style={{ fontSize:11, color:"var(--text-muted)" }}>
            {section.name} · {section.poids}%
          </span>
        </div>
        <div style={{ height:5, background:"var(--color-border)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:pct+"%", background:"var(--color-primary)", borderRadius:3, transition:"width 0.25s" }} />
        </div>
      </div>

      {/* ── Sous-critère breadcrumb ── */}
      {q.sousCritere && (
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:"var(--text-secondary)",
            background:"var(--surface-subtle)", padding:"2px 10px", borderRadius:12,
            border:"1px solid var(--color-border)" }}>
            {selectedCrit}
          </span>
          <span style={{ color:"var(--text-muted)", fontSize:13 }}>›</span>
          <span style={{ fontSize:11, color:"var(--text-muted)", background:"var(--surface-subtle)",
            padding:"2px 10px", borderRadius:12, border:"1px solid var(--color-border)" }}>
            {q.sousCritere}
          </span>
        </div>
      )}

      {/* ── Question card ── */}
      <div style={{
        background:"var(--surface-subtle)", border:"2px solid var(--color-border)",
        borderRadius:"var(--radius-xl)", padding:"18px 22px", marginBottom:20,
      }}>
        <p style={{ fontSize:15, fontWeight:700, color:"var(--text-primary)", lineHeight:1.65, margin:"0 0 10px 0" }}>
          {q.question}
        </p>
        {q.methodologie && (
          <div style={{ padding:"8px 12px", background:"#eff6ff", borderRadius:"var(--radius-md)", borderLeft:"3px solid var(--color-primary)" }}>
            <p style={{ fontSize:11, color:"var(--color-primary)", margin:0, lineHeight:1.5 }}>
              → {q.methodologie}
            </p>
          </div>
        )}
      </div>

      {/* ── Vendor cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))", gap:14, marginBottom:24 }}>
        {offresNotes.map((o) => {
          const resp    = q.reponses[o.equipement];
          const note    = q.notes[o.equipement];
          const rKey    = q.qKey + "||" + o.equipement;
          const isExp   = !!expanded[rKey];
          const shortR  = resp && resp.length > TRUNC ? resp.slice(0, TRUNC) + "…" : resp;
          const hasNote = note != null;
          return (
            <div key={o.equipement} style={{
              border:`2px solid ${hasNote ? o.color : "var(--color-border)"}`,
              borderRadius:"var(--radius-lg)", padding:"14px 16px",
              background: hasNote ? o.color + "0d" : "#fff",
              display:"flex", flexDirection:"column", gap:12,
              transition:"border-color 0.2s, background 0.2s",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:o.color }}>{o.equipement}</div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:1 }}>{o.fournisseur}</div>
                </div>
                {o.score != null && (
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)",
                    background:"var(--surface-subtle)", padding:"2px 8px", borderRadius:6,
                    border:"1px solid var(--color-border)", flexShrink:0 }}>
                    moy. {o.score.toFixed(2)}/5
                  </span>
                )}
              </div>
              <div style={{ flex:1, minHeight:40 }}>
                {resp ? (
                  <>
                    <p style={{ fontSize:11, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>
                      {isExp ? resp : shortR}
                    </p>
                    {resp.length > TRUNC && (
                      <button
                        onClick={() => setExpanded(prev => ({ ...prev, [rKey]: !isExp }))}
                        style={{ fontSize:10, color:"var(--color-primary)", background:"none", border:"none",
                          cursor:"pointer", padding:"4px 0", textDecoration:"underline" }}>
                        {isExp ? "Voir moins" : "Voir plus"}
                      </button>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize:11, color:"#cbd5e1", fontStyle:"italic", margin:0 }}>Pas de réponse</p>
                )}
              </div>
              <NoteSlider
                value={note ?? null}
                onChange={val => onSetNote(q.qKey, o.equipement, val)}
                vendorColor={o.color}
              />
            </div>
          );
        })}
      </div>

      {/* ── Navigation ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px 0", borderTop:"1px solid var(--color-border)", gap:12 }}>
        <button
          className="btn btn-outline"
          onClick={() => goTo(Math.max(0, safeIdx - 1))}
          disabled={safeIdx === 0}
          style={{ minWidth:130 }}
        >
          ← Précédente
        </button>

        <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap", justifyContent:"center" }}>
          {winStart > 0 && <span style={{ fontSize:11, color:"var(--text-muted)" }}>…</span>}
          {jumpIdxs.map(idx => {
            const hasN  = Object.keys(currentGroup[idx].notes).length > 0;
            const isCur = idx === safeIdx;
            return (
              <button key={idx} onClick={() => goTo(idx)} style={{
                width:26, height:26, borderRadius:"50%",
                border: isCur ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: isCur ? "var(--color-primary)" : hasN ? "#dcfce7" : "var(--surface-subtle)",
                color: isCur ? "#fff" : hasN ? "#166534" : "var(--text-muted)",
                cursor:"pointer", fontSize:10, fontWeight: isCur ? 700 : 400,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>{idx + 1}</button>
            );
          })}
          {winEnd < total && <span style={{ fontSize:11, color:"var(--text-muted)" }}>…</span>}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            if (safeIdx < total - 1) {
              goTo(safeIdx + 1);
            } else {
              // Passer au critère suivant
              const nextIdx = critNames.indexOf(selectedCrit) + 1;
              if (nextIdx < critNames.length) selectCrit(critNames[nextIdx]);
            }
          }}
          disabled={safeIdx === total - 1 && critNames.indexOf(selectedCrit) === critNames.length - 1}
          style={{ minWidth:130 }}
        >
          {safeIdx < total - 1 ? "Suivante →" : "Catégorie suivante →"}
        </button>
      </div>
    </div>
  );
}

// SECTION TAB

function SectionTab({ section, data, onSetNote }) {
  const [view, setView] = useState("notation");
  const { offres, colors, criteres, fournisseurs } = data;

  const offresNotes = offres
    .filter(o => section.scoreParOffre[o.equipement] != null)
    .map(o => ({ equipement:o.equipement, fournisseur:o.fournisseur, score:section.scoreParOffre[o.equipement], color:colors[o.fournisseur]||"#64748b" }))
    .sort((a,b) => (b.score||0) - (a.score||0));

  const sectionCriteres = criteres.filter(c => c.axe === section.axe);
  const notedCriteres   = sectionCriteres.filter(c => Object.values(c.notes).some(v => typeof v === "number"));

  const critMoyData = notedCriteres.slice(0, 30).map(c => {
    const vals = Object.values(c.notes).filter(v => typeof v === "number");
    const moy  = vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : 0;
    const short = c.question.length > 50 ? c.question.slice(0,50)+"…" : c.question;
    return { question:short, questionFull:c.question, moyenne:moy, methodologie:c.methodologie };
  });

  const moyenne = useMemo(() => {
    const vals = offresNotes.map(o => o.score).filter(v => v != null);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : "-";
  }, [offresNotes]);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Moyenne section", value:moyenne, sub:"sur 5", vc:scoreColor(parseFloat(moyenne)) },
          { label:"Poids", value:section.poids+"%", sub:"du score total", vc:"var(--color-primary)" },
          { label:"Meilleure offre", value:offresNotes[0]?.equipement||"—", sub:offresNotes[0]?.fournisseur||"", vc:colors[offresNotes[0]?.fournisseur]||"var(--text-primary)" },
          { label:"Questions", value:sectionCriteres.length, sub:notedCriteres.length+" notées", vc:"var(--text-primary)" },
        ].map((kpi, i) => (
          <div key={i} style={{ background:"var(--surface-subtle)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-lg)", padding:"12px 14px" }}>
            <p style={{ color:"var(--text-muted)", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{kpi.label}</p>
            <p style={{ fontSize:i===0||i===1?24:14, fontWeight:800, color:kpi.vc, lineHeight:1.1 }}>{kpi.value}</p>
            <p style={{ color:"var(--text-muted)", fontSize:10, marginTop:3 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:20 }}>
        {[
          ["notation","Notation / Réponses"],
          ["graphique","Scores offres"],
          ["criteres","Graphique critères"],
          ["tableau","Tableau synthèse"],
        ].map(([v,label]) => (
          <div key={v} className={"tab"+(view===v?" active":"")} onClick={() => setView(v)}>{label}</div>
        ))}
      </div>

      {view === "notation" && (
        sectionCriteres.length === 0
          ? <p style={{ color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>Aucun critère disponible.</p>
          : <StepNotationView criteres={sectionCriteres} offresNotes={offresNotes} section={section} onSetNote={onSetNote} />
      )}

      {view === "graphique" && (
        <div>
          <p style={{ color:"var(--text-muted)", fontSize:12, marginBottom:12 }}>Score /5 par offre &mdash; {section.name} ({section.poids}%)</p>
          <ResponsiveContainer width="100%" height={offresNotes.length*44+40}>
            <BarChart data={offresNotes} layout="vertical" margin={{ left:20, right:70, top:4, bottom:4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0,5]} tickCount={6} tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="equipement" width={160} tick={{ fontSize:12, fill:"#334155", fontWeight:600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill:"#f1f5f9" }} />
              <Bar dataKey="score" radius={[0,6,6,0]} maxBarSize={28}
                label={{ position:"right", formatter:v=>v?.toFixed(3), fontSize:11, fill:"#64748b", fontWeight:700 }}>
                {offresNotes.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:16, paddingTop:12, borderTop:"1px solid var(--color-border-subtle)" }}>
            {fournisseurs.map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:colors[f] }} />
                <span style={{ fontSize:11, color:"var(--text-tertiary)", fontWeight:600 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "criteres" && (
        critMoyData.length === 0
          ? <p style={{ color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>Aucune note disponible.</p>
          : <div>
              <p style={{ color:"var(--text-muted)", fontSize:12, marginBottom:12 }}>Note moyenne par critère (toutes offres)</p>
              <ResponsiveContainer width="100%" height={critMoyData.length*46+40}>
                <BarChart data={critMoyData} layout="vertical" margin={{ left:20, right:60, top:4, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0,5]} tickCount={6} tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="question" width={300} tick={{ fontSize:10, fill:"#334155" }} axisLine={false} tickLine={false} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active||!payload?.length) return null;
                    const d = critMoyData.find(c=>c.question===label);
                    return (
                      <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", maxWidth:300 }}>
                        <p style={{ color:"#f1f5f9", fontSize:12, fontWeight:600, marginBottom:4 }}>{d?.questionFull}</p>
                        {d?.methodologie && <p style={{ color:"#94a3b8", fontSize:10, marginBottom:6 }}>{d.methodologie}</p>}
                        <p style={{ color:"#f1f5f9", fontSize:14, fontWeight:700 }}>{payload[0].value?.toFixed(2)} / 5</p>
                      </div>
                    );
                  }} cursor={{ fill:"#f1f5f9" }} />
                  <Bar dataKey="moyenne" radius={[0,6,6,0]} maxBarSize={28}
                    label={{ position:"right", formatter:v=>v?.toFixed(2), fontSize:11, fill:"#64748b", fontWeight:700 }}>
                    {critMoyData.map((e,i) => <Cell key={i} fill={scoreColor(e.moyenne)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
      )}

      {view === "tableau" && (
        notedCriteres.length === 0
          ? <p style={{ color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>Aucune note disponible.</p>
          : (() => {
              // Group by critère then sous-critère
              const groups = {};
              for (const c of notedCriteres) {
                const crit = c.critere || "Général";
                if (!groups[crit]) groups[crit] = {};
                const sub = c.sousCritere || "";
                if (!groups[crit][sub]) groups[crit][sub] = [];
                groups[crit][sub].push(c);
              }
              return (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ minWidth:200 }}>Critère / Question</th>
                        {offresNotes.map(o => (
                          <th key={o.equipement} className="td-center" style={{ color:o.color, fontSize:11, whiteSpace:"nowrap" }}>{o.equipement}</th>
                        ))}
                        <th className="td-center" style={{ background:"#f0f4ff", minWidth:60 }}>Moy.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groups).map(([crit, subGroups]) => (
                        <React.Fragment key={"crit-"+crit}>
                          <tr style={{ background:"#dbeafe" }}>
                            <td colSpan={offresNotes.length + 2} style={{ fontWeight:800, fontSize:13, color:"#1d4ed8", padding:"8px 14px", borderLeft:"4px solid #2563eb" }}>
                              {crit}
                            </td>
                          </tr>
                          {Object.entries(subGroups).map(([sub, rows]) => (
                            <React.Fragment key={"sub-"+sub}>
                              {sub && (
                                <tr style={{ background:"#eff6ff" }}>
                                  <td colSpan={offresNotes.length + 2} style={{ fontWeight:600, fontSize:11, color:"var(--text-secondary)", padding:"5px 14px 5px 28px", borderLeft:"4px solid #93c5fd" }}>
                                    {sub}
                                  </td>
                                </tr>
                              )}
                              {rows.map((c, i) => {
                                const nv  = offresNotes.map(o=>c.notes[o.equipement]).filter(v=>typeof v === "number");
                                const moy = nv.length ? nv.reduce((a,b)=>a+b,0)/nv.length : null;
                                return (
                                  <tr key={i}>
                                    <td style={{ paddingLeft: sub ? 28 : 14 }}>
                                      <div style={{ fontWeight:500, fontSize:12, color:"var(--text-primary)" }}>{c.question}</div>
                                      {c.methodologie && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2, fontStyle:"italic" }}>{c.methodologie}</div>}
                                    </td>
                                    {offresNotes.map(o => {
                                      const n = c.notes[o.equipement];
                                      return (
                                        <td key={o.equipement} className="td-center">
                                          {typeof n === "number"
                                            ? <span className="score-chip" style={{ ...scoreBg(n), fontWeight:700, fontSize:12 }}>{n}</span>
                                            : n === "skip"
                                              ? <span style={{ fontSize:10, color:"#94a3b8", background:"#f1f5f9", padding:"2px 6px", borderRadius:4 }}>N/A</span>
                                              : <span style={{ color:"#cbd5e1",fontSize:11 }}>&mdash;</span>
                                          }
                                        </td>
                                      );
                                    })}
                                    <td className="td-center" style={{ background:"#f0f4ff" }}>
                                      {moy != null && <span style={{ fontWeight:800, fontSize:12, color:scoreColor(moy) }}>{moy.toFixed(2)}</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                      <tr style={{ borderTop:"2px solid var(--color-border)", background:"var(--surface-subtle)" }}>
                        <td style={{ fontWeight:800, color:"var(--text-primary)", fontSize:13 }}>Score section /5</td>
                        {offresNotes.map(o => (
                          <td key={o.equipement} className="td-center">
                            <span style={{ fontWeight:800, fontSize:14, color:scoreColor(o.score) }}>{o.score?.toFixed(3)}</span>
                          </td>
                        ))}
                        <td className="td-center" style={{ background:"#e8edff" }}>
                          <span style={{ fontWeight:800, fontSize:14, color:"var(--color-primary)" }}>{moyenne}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()
      )}
    </div>
  );
}

// TCO TAB

function TCOTab({ data }) {
  const { prixTCO, offres, colors } = data;
  if (!prixTCO.length) return <p style={{ color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>Données financières non disponibles.</p>;

  const equipements = Object.keys(prixTCO[0].values).filter(eq => offres.find(o => o.equipement === eq));

  const formatVal = v => {
    if (v == null || v === "") return "—";
    if (typeof v === "number") {
      if (v > 10000) return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " €";
      if (v < 1 && v > 0) return (v * 100).toFixed(1) + " %";
      return v.toFixed ? v.toFixed(2) : String(v);
    }
    return String(v);
  };

  const prixRow = prixTCO.find(r => r.indicateur.toLowerCase().includes("prix unitaire") || r.indicateur.toLowerCase().includes("prix"));
  const chartData = prixRow ? equipements.map(eq => ({
    equipement: eq,
    prix: parseFloat(prixRow.values[eq]) || 0,
    color: colors[offres.find(o=>o.equipement===eq)?.fournisseur] || "#64748b",
  })).sort((a,b) => a.prix - b.prix) : [];

  return (
    <div>
      {chartData.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <p style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)", marginBottom:12 }}>
            Comparaison &mdash; {prixRow?.indicateur}
          </p>
          <ResponsiveContainer width="100%" height={chartData.length*44+40}>
            <BarChart data={chartData} layout="vertical" margin={{ left:20, right:100, top:4, bottom:4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => new Intl.NumberFormat("fr-FR",{notation:"compact"}).format(v)+" €"} />
              <YAxis type="category" dataKey="equipement" width={155} tick={{ fontSize:12, fill:"#334155", fontWeight:600 }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active||!payload?.length) return null;
                return (
                  <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"10px 14px" }}>
                    <p style={{ color:"#94a3b8", fontSize:11, marginBottom:4 }}>{label}</p>
                    <p style={{ color:"#f1f5f9", fontSize:13, fontWeight:700 }}>{formatVal(payload[0].value)}</p>
                  </div>
                );
              }} cursor={{ fill:"#f1f5f9" }} />
              <Bar dataKey="prix" radius={[0,6,6,0]} maxBarSize={28}
                label={{ position:"right", formatter:v=>new Intl.NumberFormat("fr-FR",{notation:"compact"}).format(v)+" €", fontSize:11, fill:"#64748b" }}>
                {chartData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth:220 }}>Indicateur</th>
              {equipements.map(eq => {
                const o = offres.find(o=>o.equipement===eq);
                return <th key={eq} className="td-center" style={{ color:colors[o?.fournisseur]||"var(--text-secondary)", fontSize:11, whiteSpace:"nowrap" }}>{eq}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {prixTCO.map((row, i) => (
              <tr key={i} style={{ background: i%2===0?"#fff":"var(--surface-subtle)" }}>
                <td style={{ fontWeight:600, fontSize:12 }}>{row.indicateur}</td>
                {equipements.map(eq => (
                  <td key={eq} className="td-center" style={{ fontFamily:"monospace", fontSize:12 }}>
                    {formatVal(row.values[eq])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Onglet Annuaire ──────────────────────────────────────────────────────────

function AnnuaireTab({ annuaire, edits, setCell, config }) {
  const { docLabels } = config;
  const rows = annuaire.map((row, i) => ({ ...row, ...(edits[i] || {}) }));

  if (!rows.length) return (
    <div className="empty-state">
      <div className="empty-title">Aucune donnée</div>
      <div className="empty-sub">Sélectionnez le dossier de l&apos;AO et cliquez sur Analyser.</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth:180 }}>Fournisseur</th>
              {docLabels.map(l => <th key={l} className="td-center" style={{ fontSize:10, padding:"6px 3px", minWidth:58 }}>{l}</th>)}
              <th className="td-center" style={{ fontSize:10, padding:"6px 6px", background:'#fee2e2' }}>PRÉNOM</th>
              <th className="td-center" style={{ fontSize:10, padding:"6px 6px", background:'#fee2e2' }}>NOM</th>
              <th className="td-center" style={{ fontSize:10, padding:"6px 6px", background:'#fee2e2' }}>TEL</th>
              <th className="td-center" style={{ fontSize:10, padding:"6px 6px", background:'#fee2e2' }}>MAIL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td style={{ fontWeight:600, fontSize:12 }}>{row['Nom fournisseur']}</td>
                {docLabels.map(col => {
                  const v = row[col] || '';
                  const vl = v.toLowerCase();
                  const isX = vl === 'x';
                  const isVide = vl === 'vide';
                  const isPartiel = vl.startsWith('partiel');
                  const isNonFourni = vl === 'non fourni';
                  const isLotCol = col.toLowerCase().includes('lot');
                  // Tooltip détaillé pour les lots
                  let tooltip;
                  if (isLotCol && row._lotStatus) {
                    const lotMatch = col.match(/lot\s*(\d+)/i);
                    if (lotMatch) {
                      const ls = row._lotStatus[parseInt(lotMatch[1], 10)];
                      if (ls) {
                        tooltip = `${ls.filledLines}/${ls.totalLines} lignes remplies`;
                        if (ls.missing?.length) tooltip += ` · Manquants : ${ls.missing.join(', ')}`;
                      }
                    }
                  }
                  if (!tooltip && isPartiel && col.includes('BPU') && row._bpuMissing) {
                    tooltip = 'Manquants : ' + Object.entries(row._bpuMissing).map(([l, cs]) => `Lot ${l} : ${cs.join(', ')}`).join(' | ');
                  }
                  // Couleurs sémantiques
                  let bg = '#f9fafb', color = '#9ca3af', border = '#e5e7eb', fw = 400;
                  if (isX) { bg = '#dcfce7'; color = '#15803d'; border = '#86efac'; fw = 700; }
                  else if (isPartiel) { bg = '#fef3c7'; color = '#92400e'; border = '#fcd34d'; fw = 600; }
                  else if (isVide) { bg = '#fee2e2'; color = '#b91c1c'; border = '#fca5a5'; fw = 600; }
                  else if (isNonFourni) { bg = '#fef2f2'; color = '#dc2626'; border = '#fecaca'; fw = 500; }
                  return (
                    <td key={col} className="td-center" style={{ padding:"3px 2px" }}>
                      <input value={v} onChange={e => setCell(ri, col, e.target.value)}
                        title={tooltip}
                        style={{ width: isPartiel ? 70 : 50, textAlign:"center",
                          border: `1px solid ${border}`, borderRadius:4, padding:"2px 4px", fontSize:11,
                          background: bg, color, fontWeight: fw }} />
                    </td>
                  );
                })}
                {['PRENOM', 'NOM', 'TEL', 'MAIL'].map(field => {
                  const v = row[field] || '';
                  const empty = !v;
                  return (
                    <td key={field} className="td-center" style={{ padding:'3px 4px' }}>
                      <input value={v} onChange={e => setCell(ri, field, e.target.value)}
                        style={{ width: field === 'MAIL' ? 180 : field === 'TEL' ? 110 : 90,
                          textAlign: 'left', fontSize: 11, padding: '2px 6px',
                          border: `1px solid ${empty ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 4,
                          background: empty ? '#fef2f2' : 'white',
                          color: empty ? '#b91c1c' : '#111827',
                          fontStyle: empty ? 'italic' : 'normal' }}
                        placeholder={empty ? 'non fourni' : ''} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Onglet Compilation QT ────────────────────────────────────────────────────

function CompilationQTTab({ qtData, config, onCompile, compiling }) {
  const { lots = [] } = config;
  const [lotsSelected, setLotsSelected] = useState(lots.map(l => l.num));
  const hasQT = Object.keys(qtData).length > 0;

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header"><span className="card-title">Lots à compiler</span></div>
        <div className="card-body" style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
          {lots.map(lot => (
            <label key={lot.num} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13 }}>
              <input type="checkbox" checked={lotsSelected.includes(lot.num)}
                onChange={e => setLotsSelected(s => e.target.checked ? [...s, lot.num].sort() : s.filter(l => l !== lot.num))} />
              {lot.label}
            </label>
          ))}
          <button className="btn btn-primary" style={{ marginLeft:8 }} onClick={() => onCompile(lotsSelected)}
            disabled={compiling || !lotsSelected.length}>
            {compiling ? 'Compilation\u2026' : 'Compiler les QT'}
          </button>
        </div>
      </div>

      {hasQT ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {Object.entries(qtData).map(([lot, { questions, supStatus }]) => (
            <div key={lot} className="card">
              <div className="card-header">
                <span className="card-title">LOT {lot}</span>
                <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:8 }}>{questions.length} questions</span>
              </div>
              <div className="card-body">
                {Object.entries(supStatus).map(([sup, { status, filled, total }]) => (
                  <div key={sup} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid var(--border)" }}>
                    <span style={{ fontWeight:500 }}>{sup}</span>
                    <span style={{ color: status === 'ok' ? '#15803d' : status === 'partial' ? '#d97706' : status === 'absent' ? '#dc2626' : '#64748b', fontWeight:600 }}>
                      {status === 'ok' ? 'Complet' : status === 'partial' ? 'Partiel' : status === 'absent' ? 'Absent' : 'Vide'}
                      {status !== 'absent' && <span style={{ fontWeight:400, fontSize:11, marginLeft:6, opacity:0.8 }}>({filled}/{total})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-title">Aucune compilation</div>
          <div className="empty-sub">Sélectionnez le dossier de l&apos;AO puis compilez.</div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet Comparatif (BPU / Chiffrage / RSE) ───────────────────────────────

function ComparatifTab({ data, title, emptyMsg }) {
  if (!data || !Object.keys(data).length) {
    if (data?.compiled) {
      // RSE format : { compiled, supNames }
      return (
        <div className="fade-in">
          <div className="table-container">
            <table>
              <thead><tr>{data.compiled[0].map((h, ci) => <th key={ci} style={{ fontSize:11, padding:"6px 8px" }}>{h}</th>)}</tr></thead>
              <tbody>
                {data.compiled.slice(1).map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => (
                    <td key={ci} style={{ fontSize:11, padding:"4px 8px", verticalAlign:"top", fontWeight:ci===0?600:400 }}>
                      {cell === '' ? '\u2014' : cell}
                    </td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return <div className="empty-state"><div className="empty-title">{emptyMsg}</div></div>;
  }

  return (
    <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {Object.entries(data).map(([lotName, { compiled, supNames }]) => {
        if (!compiled?.length) return null;
        const keyColCount = compiled[0].length - (supNames?.length || 0);
        return (
          <div key={lotName} className="card">
            <div className="card-header">
              <span className="card-title">{lotName}</span>
              <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:8 }}>{supNames?.length || 0} fournisseur{(supNames?.length || 0) > 1 ? 's' : ''}</span>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              <div className="table-container">
                <table>
                  <thead><tr>{compiled[0].map((h, ci) => (
                    <th key={ci} style={{ fontSize:11, padding:"6px 8px", textAlign:ci >= keyColCount ? "right" : "left" }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {compiled.slice(1).map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => {
                        const isPrice = ci >= keyColCount;
                        return (
                          <td key={ci} style={{ fontSize:12, textAlign:isPrice?"right":"left", padding:"4px 8px" }}>
                            {cell === '' ? '\u2014' : cell}
                          </td>
                        );
                      })}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// PAGE

export default function AnalyseMarche() {
  const { id } = useParams();
  const marche = marches.find(m => m.id === id);
  const config = getAnalyseConfig(id);

  // ── Dossier state ──
  const [dirHandle, setDirHandle] = useState(null);
  const [dirPath, setDirPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [dirWarning, setDirWarning] = useState('');

  // ── Annuaire ──
  const [annuaire, setAnnuaire] = useState([]);
  const [edits, setEdits] = useState({});

  // ── Compilations ──
  const [qtData, setQtData] = useState({});
  const [rseData, setRseData] = useState({});
  const [bpuData, setBpuData] = useState({});
  const [chiffrageData, setChiffrageData] = useState({});
  const [compilingQt, setCompilingQt] = useState(false);
  const [compilingRse, setCompilingRse] = useState(false);
  const [compilingBpu, setCompilingBpu] = useState(false);
  const [compilingChiffrage, setCompilingChiffrage] = useState(false);

  // ── Analyse xlsx (conservé pour compatibilité) ──
  const [analysisData, setAnalysisData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gm-analyse-" + id) || "null"); }
    catch { return null; }
  });
  const [localNotes, setLocalNotes] = useState({});

  const [activeTab, setActiveTab] = useState("__annuaire__");

  // ── Handlers ──
  async function handleFolderAction(action) {
    let root = dirHandle;
    if (action === 'pick') {
      try {
        root = await window.showDirectoryPicker();
        setDirHandle(root);
        setDirPath(root.name);
        setAnnuaire([]); setEdits({}); setDirWarning('');
      } catch (e) { if (e.name !== 'AbortError') console.error(e); return; }
    }
    if (!root) return;
    setScanning(true); setAnnuaire([]); setEdits({});
    try {
      const { rows, warning } = await scanAnnuaire(root, config, setScanProgress);
      setAnnuaire(rows);
      if (warning) setDirWarning(warning);
    } catch (e) { console.error(e); }
    setScanning(false); setScanProgress('');
  }

  async function handleCompileQT(selectedLots) {
    if (!dirHandle) return;
    setCompilingQt(true);
    try { setQtData(await compileQT(dirHandle, config, selectedLots)); }
    catch (e) { console.error(e); setDirWarning(e.message); }
    setCompilingQt(false);
  }

  async function handleCompileRSE() {
    if (!dirHandle) return;
    setCompilingRse(true);
    try { setRseData(await compileRSE(dirHandle)); }
    catch (e) { console.error(e); setDirWarning(e.message); }
    setCompilingRse(false);
  }

  async function handleCompileBPU() {
    if (!dirHandle) return;
    setCompilingBpu(true);
    try { setBpuData(await compileBPU(dirHandle, config)); }
    catch (e) { console.error(e); setDirWarning(e.message); }
    setCompilingBpu(false);
  }

  async function handleCompileChiffrage() {
    if (!dirHandle) return;
    setCompilingChiffrage(true);
    try { setChiffrageData(await compileChiffrage(dirHandle, config)); }
    catch (e) { console.error(e); setDirWarning(e.message); }
    setCompilingChiffrage(false);
  }

  const setCell = (ri, col, value) => setEdits(e => ({ ...e, [ri]: { ...(e[ri] || {}), [col]: value } }));

  const setNote = useCallback((qKey, equipement, value) => {
    setLocalNotes(prev => ({ ...prev, [qKey]: { ...(prev[qKey] || {}), [equipement]: value } }));
  }, []);

  const mergedData = useMemo(() => {
    if (!analysisData) return null;
    const hasOverrides = Object.keys(localNotes).length > 0;
    if (!hasOverrides) return analysisData;
    return {
      ...analysisData,
      criteres: analysisData.criteres.map(c => {
        const overrides = localNotes[c.qKey];
        if (!overrides) return c;
        const merged = { ...c.notes };
        for (const [eq, val] of Object.entries(overrides)) {
          if (val === "skip" || (val != null && val !== undefined)) merged[eq] = val;
          else delete merged[eq];
        }
        return { ...c, notes: merged };
      }),
    };
  }, [analysisData, localNotes]);

  const layoutTitle = marche ? marche.reference + " \u2014 " + marche.nom : "Analyse des offres";

  // ── Onglets ──
  const tabs = [
    { id:"__annuaire__", label:"Annuaire" },
    { id:"__bpu_std__", label:"BPU" },
    { id:"__qt_std__", label:"QT" },
    { id:"__rse_std__", label:"RSE" },
    { id:"__chiffrage__", label:"Chiffrage" },
    { id:"__qc__", label:"Contrôle qualité" },
  ];

  // Ajout des onglets d'analyse xlsx si des données ont été importées
  if (analysisData) {
    tabs.push({ id:"__overview__", label:"Vue d'ensemble" });
    analysisData.sections.forEach(s => tabs.push({ id:s.name, label:s.name }));
    tabs.push({ id:"__tco__", label:"Finances" });
  }

  return (
    <Layout title={layoutTitle} sub={"\u2014 Analyse des offres"}>
      <MarcheNavTabs />

      <FolderPickerZone
        onScan={handleFolderAction}
        scanning={scanning}
        scanProgress={scanProgress}
        dirPath={dirPath}
        warning={dirWarning}
        nbFournisseurs={annuaire.length}
      />

      <div className="tabs" style={{ marginBottom:16 }}>
        {tabs.map(tab => (
          <div key={tab.id} className={'tab' + (activeTab === tab.id ? ' active' : '')} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </div>
        ))}
      </div>

      {activeTab === "__annuaire__" && (
        <AnnuaireTab annuaire={annuaire} edits={edits} setCell={setCell} config={config} />
      )}

      {activeTab === "__bpu_std__" && (
        <StandardisationBpuTab dirHandle={dirHandle} marcheId={id} />
      )}

      {activeTab === "__qt_std__" && (
        <StandardisationQuestionnaireTab dirHandle={dirHandle} marcheId={id} subdir="QT" docType="QT" label="QT" />
      )}

      {activeTab === "__rse_std__" && (
        <StandardisationQuestionnaireTab dirHandle={dirHandle} marcheId={id} subdir="RSE" docType="RSE" label="RSE" />
      )}

      {activeTab === "__qc__" && (
        <QualityControlTab annuaire={annuaire} />
      )}

      {activeTab === "__chiffrage__" && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-body" style={{ display:"flex", gap:12, alignItems:"center" }}>
              <button className="btn btn-primary" onClick={handleCompileChiffrage} disabled={compilingChiffrage || !dirHandle}>
                {compilingChiffrage ? 'Compilation\u2026' : 'Compiler le Chiffrage'}
              </button>
            </div>
          </div>
          <ComparatifTab data={chiffrageData} title="Chiffrage" emptyMsg="Aucune donn\u00e9e Chiffrage" />
        </div>
      )}

      {activeTab === "__overview__" && mergedData && <OverviewTab data={mergedData} />}
      {activeTab === "__tco__" && mergedData && <TCOTab data={mergedData} />}
      {analysisData && analysisData.sections.map(s =>
        activeTab === s.name
          ? <SectionTab key={s.name} section={s} data={mergedData} onSetNote={setNote} />
          : null
      )}
    </Layout>
  );
}
