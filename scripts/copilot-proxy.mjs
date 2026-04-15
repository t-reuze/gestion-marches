/**
 * Proxy local pour le chatbot Assistant UNICANCER.
 * Connecte le widget React à l'API Claude (Anthropic).
 *
 * Usage : node scripts/copilot-proxy.mjs
 * Port : 3001
 * Requiert : ANTHROPIC_API_KEY dans l'environnement
 */

import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

// ── Charger le contexte du SaaS ──────────────────────────────

function loadContext() {
  const files = [
    { path: '../src/data/mockData.js', label: 'Données marchés et formations' },
    { path: '../src/data/clccContacts.js', label: 'Contacts CLCC (491 contacts, 19 centres)' },
    { path: '../src/App.jsx', label: 'Routes de l\'application' },
    { path: '../src/components/MarcheNavTabs.jsx', label: 'Onglets par marché' },
  ];

  let context = '';
  for (const f of files) {
    try {
      const content = readFileSync(resolve(__dirname, f.path), 'utf-8');
      // Truncate large files to key parts
      const truncated = content.length > 8000 ? content.slice(0, 8000) + '\n// ... (tronqué)' : content;
      context += `\n\n=== ${f.label} (${f.path}) ===\n${truncated}`;
    } catch { /* skip missing files */ }
  }
  return context;
}

const CODE_CONTEXT = loadContext();

const SYSTEM = `Tu es l'assistant intégré de la plateforme "Gestion des Marchés" d'UNICANCER.
Tu aides les utilisateurs (acheteurs, ingénieurs biomédicaux, pharmaciens, chefs de service) à utiliser l'outil.

RÈGLES :
- Réponds en français, de façon concise et structurée
- RÉFLÉCHIS avant de répondre — comprends ce que l'utilisateur veut vraiment
- Guide pas à pas avec des étapes numérotées quand c'est pertinent
- Si la question est vague, pose UNE question de clarification courte
- Si tu ne sais pas, dis-le honnêtement
- Utilise le vouvoiement
- Ne donne JAMAIS d'informations médicales ou juridiques
- Tes réponses doivent être courtes (max 200 mots) sauf si l'utilisateur demande du détail

STRUCTURE DE L'APPLICATION :
- 4 sections navbar : Marchés (tableau de bord), Formations, Reporting, Contacts
- Sidebar gauche : marchés groupés par secteur (Investissements, Pharma, Logistique, R&D)
- Chaque marché a des onglets : Analyse (AO), Notation, Réponses fournisseurs, Informations, Reporting, Interlocuteurs, ERP·KPI
- Contacts = annuaire des 19 CLCC avec 491 contacts classés par fonction
- Les emails sont cliquables (mailto: → ouvre Outlook)
- Les téléphones sont cliquables (tel: → appel Teams)
- Export Excel disponible pour contacts et reporting
- Mailing groupé par fonction disponible dans Contacts

DONNÉES CLÉS :
- 19 CLCC (Gustave Roussy, Curie, Léon Bérard, Paoli-Calmettes, etc.)
- 27 fonctions (Acheteur, DRH, DSI, Ingénieur Biomédical, Physicien Médical, etc.)
- 491 contacts importés depuis le listing Excel du 31 mars 2026
- Marchés organisés en 4 secteurs
- Statuts : Ouvert, En analyse, Attribution, En cours, Clôturé

CONTEXTE TECHNIQUE (pour répondre aux questions précises) :
${CODE_CONTEXT}`;

// ── Serveur Express ──────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée' });
  }

  const { messages, pageContext } = req.body;

  const systemWithContext = SYSTEM + (pageContext ? `\n\nPAGE ACTUELLE : ${pageContext}` : '');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemWithContext,
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu générer de réponse.';
    res.json({ answer: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514',
  });
});

app.listen(PORT, () => {
  console.log(`\n  Assistant UNICANCER — proxy Claude`);
  console.log(`  http://localhost:${PORT}/api/chat`);
  console.log(`  API key: ${process.env.ANTHROPIC_API_KEY ? '✓ configurée' : '✗ manquante'}\n`);
});
