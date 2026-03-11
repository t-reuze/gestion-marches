import { useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";

import Layout from "../components/Layout";
import MarcheNavTabs from "../components/MarcheNavTabs";
import { marches } from "../data/mockData";

// ─── PALETTE & HELPERS ────────────────────────────────────────────────────────

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
  if (n.includes("techn") || n.includes("physique")) return "🔬";
  if (n.includes("clinique")) return "🏥";
  if (n.includes("financ")) return "💰";
  if (n.includes("tco")) return "📊";
  if (n.includes("rse")) return "🌱";
  if (n.includes("logistique") || n.includes("implantation")) return "📦";
  if (n.includes("maintenance") || n.includes("sla")) return "🔧";
  if (n.includes("formation")) return "🎓";
  if (n.includes("cyber") || n.includes("afib") || n.includes("curité")) return "🔒";
  if (n.includes("partenariat") || n.includes("scientif")) return "🔭";
  return "📋";
}

function sectionAxe(name) {
  const n = name.toLowerCase();
  if (n.includes("techn") || n.includes("physique")) return "Technique";
  if (n.includes("clinique")) return "Clinique";
  if (n.includes("financ")) return "Financier";
  if (n.includes("tco")) return "TCO";
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

// ─── PARSER ───────────────────────────────────────────────────────────────────

function findSheet(wb, candidates) {
  for (const c of candidates) {
    if (wb.Sheets[c]) return wb.Sheets[c];
  }
  // fuzzy: find first sheet whose name starts with the first candidate prefix
  const prefix = candidates[0].split("_")[0].toLowerCase();
  const found = wb.SheetNames.find(n => n.toLowerCase().startsWith(prefix));
  return found ? wb.Sheets[found] : null;
}

function parseAnalyseExcel(wb, fileName) {
  const toRows = ws =>
    ws ? XLSX.utils.sheet_to_json(ws, { header:1, defval:"" }) : [];

  // ── Offres ──────────────────────────────────────────────────────────────────
  const rawOffres = toRows(findSheet(wb, ["Offres"]));
  const titre = String(rawOffres[0]?.[0] || "");
  const marcheParts = titre.split("—").map(s => s.trim());
  const marche = {
    reference: marcheParts[0] || "",
    lot:       marcheParts[1] || "",
    acheteur:  "Unicancer",
  };
  // Row 1 = headers, Row 2+ = data
  const offres = rawOffres.slice(2).filter(r => r[0]).map(r => ({
    id:          String(r[0]).trim(),
    fournisseur: String(r[1]).trim(),
    equipement:  String(r[2]).trim(),
    variante:    String(r[3]).trim(),
    statut:      String(r[6] || r[4] || "").trim(),
  }));
  const fournisseurs = [...new Set(offres.map(o => o.fournisseur))];
  const colors = Object.fromEntries(fournisseurs.map((f, i) => [f, PALETTE[i % PALETTE.length]]));

  // ── Notation_Synthèse ───────────────────────────────────────────────────────
  const rawNote = toRows(findSheet(wb, ["Notation_Synthèse","Notation_Synthese"]));
  // Row 0: title, Row 1: headers, Row 2..N-2: sections, Last: TOTAL
  const noteHdr = rawNote[1] || [];
  const noteEquipements = noteHdr.slice(2, -1).filter(Boolean).map(String);
  const sections = rawNote.slice(2, -1).filter(r => r[0] && !String(r[0]).toUpperCase().includes("TOTAL")).map(r => {
    const name    = String(r[0]).trim();
    const poids   = parseFloat(String(r[1]).replace("%","")) || 0;
    const scoreParOffre = {};
    noteEquipements.forEach((eq, i) => {
      const partial = parseFloat(r[2 + i]) || 0;
      scoreParOffre[eq] = poids > 0
        ? parseFloat((partial / (poids / 100)).toFixed(3))
        : 0;
    });
    return { name, poids, icon: sectionIcon(name), axe: sectionAxe(name), scoreParOffre };
  });
  // Total scores from last row
  const totalRow = rawNote[rawNote.length - 1] || [];
  const totalScores = {};
  noteEquipements.forEach((eq, i) => {
    totalScores[eq] = parseFloat(totalRow[2 + i]) || 0;
  });

  // ── Classement_Final ────────────────────────────────────────────────────────
  const rawClass = toRows(findSheet(wb, ["Classement_Final"]));
  const classement = rawClass.slice(2).filter(r => r[1]).map(r => ({
    rang:         parseInt(r[0]) || 99,
    fournisseur:  String(r[1]).trim(),
    equipement:   String(r[2]).trim(),
    variante:     String(r[3]).trim(),
    scoreTotal:   parseFloat(r[4]) || 0,
    scoreTech:    parseFloat(r[5]) || null,
    scoreFin:     parseFloat(r[6]) || null,
    recommandation: String(r[7] || "").trim() || null,
  })).sort((a, b) => a.rang - b.rang);

  // ── Critères_Détaillés ─────────────────────────────────────────────────────
  const rawCrit = toRows(findSheet(wb, ["Critères_Détaillés","Criteres_Detailles"]));
  const critHdr = rawCrit[0] || [];
  // Extract equipement names from 'Réponse\nNAME' or 'Note\nNAME' headers starting at col 5
  const critEquipements = [];
  for (let i = 5; i < critHdr.length; i += 2) {
    const h = String(critHdr[i] || "");
    const name = h.includes("\n") ? h.split("\n")[1].trim() : h.replace(/^[Rr][ée]ponse\s*/,"").trim();
    if (name) critEquipements.push(name);
  }
  const criteres = rawCrit.slice(1).filter(r => r[3]).map(r => {
    const notes = {}, reponses = {};
    critEquipements.forEach((eq, i) => {
      const resp = r[5 + i * 2];
      const noteVal = r[6 + i * 2];
      if (resp !== "" && resp != null) reponses[eq] = String(resp).slice(0, 300);
      if (noteVal !== "" && noteVal != null) {
        const n = parseFloat(noteVal);
        if (!isNaN(n)) notes[eq] = n;
      }
    });
    return {
      axe:          String(r[0]).trim(),
      critere:      String(r[1]).trim(),
      sousCritere:  String(r[2]).trim(),
      question:     String(r[3]).trim(),
      methodologie: r[4] ? String(r[4]).trim().slice(0, 120) : null,
      notes,
      reponses,
    };
  }).filter(c => Object.keys(c.notes).length > 0);

  // ── Prix_TCO ────────────────────────────────────────────────────────────────
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

  return { fileName, marche, offres, fournisseurs, colors, classement, sections, criteres, prixTCO, totalScores, noteEquipements };
}

// ─── IMPORT ZONE ──────────────────────────────────────────────────────────────

function ImportZone({ onImport, error }) {
  const inputRef = useRef(null);
  const [isDrag, setIsDrag] = useState(false);

  function processFile(file) {
    if (!file?.name.match(/\.xlsx?$/i)) { onImport(null, "Fichier .xlsx requis"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type:"array" });
        onImport(parseAnalyseExcel(wb, file.name), null);
      } catch (err) { onImport(null, "Erreur de parsing : " + err.message); }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div style={{ maxWidth:560, margin:"60px auto", textAlign:"center" }}>
      <div
        onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={e => { e.preventDefault(); setIsDrag(false); processFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDrag ? "var(--color-primary)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-xl)",
          padding: "48px 32px",
          cursor: "pointer",
          background: isDrag ? "var(--color-primary-bg)" : "var(--surface)",
          transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
        <p style={{ fontWeight:700, fontSize:16, color:"var(--text-primary)", marginBottom:6 }}>
          Importer un fichier d'analyse
        </p>
        <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>
          Glisser-déposer ou cliquer pour sélectionner un fichier .xlsx
        </p>
        <button className="btn btn-primary" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
          Choisir un fichier
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e => processFile(e.target.files[0])} />
      </div>
      {error && (
        <div className="info-box red" style={{ marginTop:16, textAlign:"left" }}>
          {error}
        </div>
      )}
      <div style={{ marginTop:20, padding:"14px 16px", background:"var(--surface-subtle)", borderRadius:"var(--radius-md)", textAlign:"left" }}>
        <p style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", marginBottom:8 }}>
          Format attendu — feuilles obligatoires :
        </p>
        {["Offres","Notation_Synthèse","Classement_Final","Critères_Détaillés"].map(s => (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <span style={{ fontSize:10, color:"#16a34a" }}>✓</span>
            <span style={{ fontSize:12, fontFamily:"monospace", color:"var(--text-secondary)" }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  const { classement, sections, offres, colors, fournisseurs } = data;
  const top5eq = classement.slice(0, 5).map(c => c.equipement);

  const radarData = sections.map(s => {
    const row = { axe: s.name.length > 14 ? s.name.slice(0,14) + "…" : s.name, fullName: s.name };
    Object.entries(s.scoreParOffre).forEach(([eq, v]) => { row[eq] = v; });
    return row;
  });

  return (
    <div>
      {/* Classement */}
      <h3 style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", marginBottom:16 }}>
        Classement final — Score global /5
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
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":item.rang}
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

      {/* Sections grid */}
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

      {/* Radar */}
      <h3 style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", marginBottom:12 }}>
        Radar — Top 5 offres
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
    </div>
  );
}

// ─── SECTION TAB ──────────────────────────────────────────────────────────────

function SectionTab({ section, data }) {
  const [view, setView] = useState("graphique");
  const { offres, colors, criteres } = data;

  const offresNotes = offres
    .filter(o => section.scoreParOffre[o.equipement] != null)
    .map(o => ({ equipement:o.equipement, fournisseur:o.fournisseur, score:section.scoreParOffre[o.equipement], color:colors[o.fournisseur]||"#64748b" }))
    .sort((a,b)=>(b.score||0)-(a.score||0));

  const sectionCriteres = criteres.filter(c => c.axe === section.axe);

  const critMoyData = sectionCriteres.slice(0, 30).map(c => {
    const vals = Object.values(c.notes).filter(v => v != null);
    const moy = vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : 0;
    const short = c.question.length > 50 ? c.question.slice(0,50)+"…" : c.question;
    return { question:short, questionFull:c.question, moyenne:moy, methodologie:c.methodologie };
  });

  const moyenne = useMemo(() => {
    const vals = offresNotes.map(o=>o.score).filter(v=>v!=null);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : "-";
  }, [offresNotes]);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
        {[
          { label:"Moyenne section", value:moyenne, sub:"sur 5", valueColor:scoreColor(parseFloat(moyenne)) },
          { label:"Meilleure offre", value:offresNotes[0]?.equipement||"—", sub:offresNotes[0]?.fournisseur||"", valueColor:colors[offresNotes[0]?.fournisseur]||"var(--text-primary)" },
          { label:"Critères évalués", value:sectionCriteres.length, sub:offresNotes.length+" offres notées", valueColor:"var(--text-primary)" },
        ].map((kpi, i) => (
          <div key={i} style={{ background:"var(--surface-subtle)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-lg)", padding:"14px 18px" }}>
            <p style={{ color:"var(--text-muted)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{kpi.label}</p>
            <p style={{ fontSize: i===0 ? 30:15, fontWeight:800, color:kpi.valueColor, lineHeight:1.1 }}>{kpi.value}</p>
            <p style={{ color:"var(--text-muted)", fontSize:11, marginTop:4 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="tabs" style={{ marginBottom:20 }}>
        {[["graphique","Scores offres"],["critères","Critères"],["tableau","Tableau détaillé"]].map(([v,label]) => (
          <div key={v} className={"tab"+(view===v?" active":"")} onClick={()=>setView(v)}>{label}</div>
        ))}
      </div>

      {/* Bar chart scores */}
      {view === "graphique" && (
        <div>
          <p style={{ color:"var(--text-muted)", fontSize:12, marginBottom:12 }}>Score /5 par offre — section {section.name} (poids {section.poids}%)</p>
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
          {/* Légende fournisseurs */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:16, paddingTop:12, borderTop:"1px solid var(--color-border-subtle)" }}>
            {data.fournisseurs.map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:data.colors[f] }} />
                <span style={{ fontSize:11, color:"var(--text-tertiary)", fontWeight:600 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar chart critères moyennes */}
      {view === "critères" && (
        critMoyData.length === 0 ? (
          <p style={{ color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>
            Aucun critère détaillé disponible pour cette section (axe : {section.axe}).
          </p>
        ) : (
          <div>
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
        )
      )}

      {/* Tableau détaillé */}
      {view === "tableau" && (
        sectionCriteres.length === 0 ? (
          <p style={{ color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>
            Aucun critère détaillé disponible pour la section "{section.name}" (axe attendu : {section.axe}).
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth:180 }}>Critère / Question</th>
                  {offresNotes.map(o => (
                    <th key={o.equipement} className="td-center" style={{ color:o.color, fontSize:11, whiteSpace:"nowrap" }}>
                      {o.equipement}
                    </th>
                  ))}
                  <th className="td-center" style={{ background:"#f0f4ff", minWidth:60 }}>Moy.</th>
                </tr>
              </thead>
              <tbody>
                {sectionCriteres.map((c, i) => {
                  const notesVals = offresNotes.map(o=>c.notes[o.equipement]).filter(v=>v!=null);
                  const moy = notesVals.length ? (notesVals.reduce((a,b)=>a+b,0)/notesVals.length) : null;
                  return (
                    <tr key={i}>
                      <td>
                        {c.sousCritere && <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:2 }}>{c.sousCritere}</div>}
                        <div style={{ fontWeight:500, fontSize:12, color:"var(--text-primary)" }}>{c.question}</div>
                        {c.methodologie && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2, fontStyle:"italic" }}>{c.methodologie}</div>}
                      </td>
                      {offresNotes.map(o => {
                        const n = c.notes[o.equipement];
                        return (
                          <td key={o.equipement} className="td-center">
                            {n != null ? (
                              <span className="score-chip" style={{ ...scoreBg(n), fontWeight:700, fontSize:12 }}>{n}</span>
                            ) : <span style={{ color:"#cbd5e1",fontSize:11 }}>—</span>}
                          </td>
                        );
                      })}
                      <td className="td-center" style={{ background:"#f0f4ff" }}>
                        {moy != null && <span style={{ fontWeight:800, fontSize:12, color:scoreColor(moy) }}>{moy.toFixed(2)}</span>}
                      </td>
                    </tr>
                  );
                })}
                {/* Score section row */}
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
        )
      )}
    </div>
  );
}

// ─── TCO TAB ──────────────────────────────────────────────────────────────────

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

  // Prix équipement row for chart
  const prixRow = prixTCO.find(r => r.indicateur.toLowerCase().includes("prix unitaire") || r.indicateur.toLowerCase().includes("prix"));
  const chartData = prixRow ? equipements.map(eq => ({
    equipement: eq,
    prix: parseFloat(prixRow.values[eq]) || 0,
    color: colors[offres.find(o=>o.equipement===eq)?.fournisseur] || "#64748b",
  })).sort((a,b)=>a.prix-b.prix) : [];

  return (
    <div>
      {chartData.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <p style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)", marginBottom:12 }}>
            Comparaison — {prixRow?.indicateur}
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

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function AnalyseMarche() {
  const { id } = useParams();
  const marche = marches.find(m => m.id === id);

  const [analysisData, setAnalysisData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gm-analyse-" + id) || "null"); }
    catch { return null; }
  });
  const [activeTab, setActiveTab] = useState("__overview__");
  const [importErr, setImportErr] = useState("");

  function handleImport(data, err) {
    if (err) { setImportErr(err); return; }
    setAnalysisData(data);
    setActiveTab("__overview__");
    try { localStorage.setItem("gm-analyse-" + id, JSON.stringify(data)); } catch {}
  }

  const layoutTitle = analysisData
    ? (analysisData.marche.reference + " — " + analysisData.marche.lot)
    : (marche ? marche.reference + " — " + marche.nom : "Analyse des offres");

  if (!analysisData) return (
    <Layout title={layoutTitle} sub="— Analyse des offres">
      <MarcheNavTabs />
      <ImportZone onImport={handleImport} error={importErr} />
    </Layout>
  );

  const tabs = [
    { id:"__overview__", label:"Vue d'ensemble", icon:"🏠" },
    ...analysisData.sections.map(s => ({ id:s.name, label:s.name.split(" ")[0], icon:s.icon })),
    { id:"__tco__", label:"Finances", icon:"💰" },
  ];

  const sectionMoyennes = analysisData.sections.reduce((acc, s) => {
    const vals = Object.values(s.scoreParOffre).filter(v=>v!=null);
    acc[s.name] = vals.length ? parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : null;
    return acc;
  }, {});

  return (
    <Layout title={layoutTitle} sub="— Analyse des offres"
      actions={
        <button className="btn btn-outline btn-sm" onClick={() => {
          if (window.confirm("Supprimer les données importées ?")) {
            setAnalysisData(null);
            localStorage.removeItem("gm-analyse-" + id);
          }
        }}>
          ↺ Changer de fichier
        </button>
      }
    >
      <MarcheNavTabs />

      {/* Section tabs */}
      <div style={{ display:"flex", gap:0, overflowX:"auto", borderBottom:"1px solid var(--color-border)", marginBottom:24 }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const moy = (tab.id !== "__overview__" && tab.id !== "__tco__") ? sectionMoyennes[tab.id] : null;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding:"10px 16px", border:"none", cursor:"pointer", background:"transparent",
              color: isActive ? "var(--color-primary)" : "var(--text-tertiary)",
              fontWeight: isActive ? 700 : 500, fontSize:13,
              display:"flex", flexDirection:"column", alignItems:"center", gap:2, minWidth:90,
              borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
              transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0,
            }}>
              <span>{tab.icon} {tab.label}</span>
              {moy != null && (
                <span style={{ fontSize:10, fontWeight:800, color: isActive ? scoreColor(moy) : "var(--text-muted)" }}>
                  {moy.toFixed(2)}/5
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "__overview__" && <OverviewTab data={analysisData} />}
      {activeTab === "__tco__" && <TCOTab data={analysisData} />}
      {analysisData.sections.map(s =>
        activeTab === s.name ? <SectionTab key={s.name} section={s} data={analysisData} /> : null
      )}
    </Layout>
  );
}
