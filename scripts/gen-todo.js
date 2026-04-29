const XLSX = require("xlsx");
const wb = XLSX.utils.book_new();

// TIM
const tim = [
  ["TIM \u2014 Analyse des offres, Documents, Workflow"],
  [""],
  ["N\u00b0", "T\u00e2che", "Description", "Priorit\u00e9", "Complexit\u00e9", "Statut", "Notes"],
  [1, "Annuaire 36 types de pi\u00e8ces", "D\u00e9tection auto 36 types documents avec DOC_RULES", "P0", "\u00c9lev\u00e9e", "FAIT", "CQ 92% acc\u00e9l\u00e9rateurs, 94% cyber"],
  [2, "CQ rapport PDF diagnostic", "Import r\u00e9f Excel, comparaison, rapport PDF diagnostic", "P0", "\u00c9lev\u00e9e", "FAIT", "2 formats support\u00e9s"],
  [3, "Espace d\u00e9p\u00f4t documents", "File manager int\u00e9gr\u00e9, IndexedDB, progression temps r\u00e9el", "P0", "\u00c9lev\u00e9e", "FAIT", "Auto-descente wrappers"],
  [4, "Templates documents", "G\u00e9n\u00e9ration Excel/PDF, s\u00e9lection + envoi ZIP par mail", "P1", "Moyenne", "FAIT", "Socle + sp\u00e9cifiques"],
  [5, "Drag & drop import AO", "Zone de d\u00e9p\u00f4t dans l'analyse", "P2", "Faible", "FAIT", ""],
  [6, "Barre progression analyse", "Spinner + message pendant le scan", "P2", "Faible", "FAIT", ""],
  [7, "Groupes colonnes toggle annuaire", "Boutons Lots/Offre/RSE/Admin/Contacts", "P2", "Faible", "FAIT", ""],
  [8, "Export Excel annuaire", "Export complet toutes colonnes", "P2", "Faible", "FAIT", ""],
  [9, "D\u00e9tection BPU par lot", "Exclut TVA template, d\u00e9tecte lots par feuille", "P1", "Moyenne", "FAIT", ""],
  [10, "D\u00e9tection compl\u00e9ments fournisseurs", "Dossiers compl\u00e9ment XX rattach\u00e9s", "P1", "Moyenne", "FAIT", ""],
  [11, "AE/ATTRI1 par lot", "D\u00e9tection par lot + g\u00e9n\u00e9rique", "P1", "Moyenne", "FAIT", ""],
  [12, "Comparateur BPU visuel", "C\u00f4te-\u00e0-c\u00f4te prix fournisseur \u00d7 lot, moins-disant, \u00e9carts %", "P0", "\u00c9lev\u00e9e", "\u00c0 FAIRE", "Feature cl\u00e9 commissions"],
  [13, "Workflow multi-user notation", "Export/import JSON session pour 2 acheteurs", "P1", "Moyenne", "\u00c0 FAIRE", "En attendant backend"],
  [14, "D\u00e9tection documents IA", "Contenu PDF, ZIP, noms crypt\u00e9s via API Claude", "P2", "\u00c9lev\u00e9e", "\u00c0 FAIRE", ""],
  [15, "Renommer/supprimer fichiers", "Actions contextuelles file manager", "P1", "Faible", "\u00c0 FAIRE", ""],
  [16, "M\u00e9tadonn\u00e9es lazy loading", "Taille/date au scroll", "P2", "Faible", "\u00c0 FAIRE", ""],
  [17, "Recherche arborescence", "Filtre temps r\u00e9el file manager", "P2", "Faible", "\u00c0 FAIRE", ""],
  [18, "Suivi retours fournisseurs", "Workflow envoy\u00e9 \u2192 re\u00e7u \u2192 v\u00e9rifi\u00e9", "P1", "Moyenne", "\u00c0 FAIRE", ""],
  [19, "Templates perso uploadables", "Upload propres templates", "P2", "Moyenne", "\u00c0 FAIRE", ""],
  [20, "Colonnes annuaire redim + tri", "Drag redimensionner, clic trier", "P2", "Moyenne", "\u00c0 FAIRE", ""],
  [21, "Virtualisation annuaire", "react-window", "P3", "Moyenne", "\u00c0 FAIRE", "Performance"],
  [22, "Clean-up code mort", "SuiviPiecesTab + console.log", "P1", "Faible", "\u00c0 FAIRE", ""],
];
const wsTim = XLSX.utils.aoa_to_sheet(tim);
wsTim["!cols"] = [{wch:4},{wch:36},{wch:58},{wch:8},{wch:10},{wch:10},{wch:35}];
XLSX.utils.book_append_sheet(wb, wsTim, "Tim \u2014 Analyse & Docs");

// GASPAR
const gaspar = [
  ["GASPAR \u2014 Reporting, Sourcing, Pr\u00e9sentations"],
  [""],
  ["N\u00b0", "T\u00e2che", "Description", "Priorit\u00e9", "Complexit\u00e9", "Statut", "Notes"],
  [1, "Int\u00e9grer BDD march\u00e9s compl\u00e8te", "Importer base fournie par l'acheteuse", "P0", "\u00c9lev\u00e9e", "\u00c0 FAIRE", "Donn\u00e9es acheteuse"],
  [2, "Espace d\u00e9p\u00f4t donn\u00e9es reporting", "Upload Excel/CSV dans l'app", "P0", "Moyenne", "\u00c0 FAIRE", "Alternative \u00e0 mockData"],
  [3, "\u00c9tendre reporting tous march\u00e9s", "Supprimer d\u00e9pendance APP_ID_TO_MARCHE", "P0", "Moyenne", "\u00c0 FAIRE", ""],
  [4, "KPI par march\u00e9", "Avancement, budget, d\u00e9lais, taux r\u00e9ponse", "P1", "Moyenne", "\u00c0 FAIRE", ""],
  [5, "G\u00e9n\u00e9rateur PPT comit\u00e9s strat\u00e9giques", "PowerPoint bilan fin march\u00e9 avec templates service", "P0", "\u00c9lev\u00e9e", "\u00c0 FAIRE", "Templates existants"],
  [6, "API Claude pour PPT", "R\u00e9daction auto commentaires et analyses", "P2", "\u00c9lev\u00e9e", "\u00c0 FAIRE", "Enrichit le PPT"],
  [7, "Export graphiques HD", "PNG/SVG pour insertion PPT/Word", "P2", "Faible", "\u00c0 FAIRE", ""],
  [8, "Tableau comparatif march\u00e9s", "Vue consolid\u00e9e gains, \u00e9conomies, perf fournisseurs", "P1", "Moyenne", "\u00c0 FAIRE", "Comit\u00e9s strat"],
  [9, "Historique reporting N vs N-1", "Tendances multi-ann\u00e9es", "P2", "Moyenne", "\u00c0 FAIRE", ""],
  [10, "Indicateurs achats responsables", "% RSE, score DD, labels", "P3", "Faible", "\u00c0 FAIRE", ""],
  [11, "D\u00e9velopper partie Sourcing", "Benchmark, veille, base fournisseurs qualifi\u00e9s", "P1", "\u00c9lev\u00e9e", "\u00c0 FAIRE", "\u00c0 d\u00e9finir avec Gaspar"],
  [12, "Fiches fournisseurs enrichies", "Historique participation, notes, volumes", "P1", "Moyenne", "\u00c0 FAIRE", ""],
  [13, "Questionnaire pr\u00e9-qualification", "Formulaire en ligne avant AO", "P2", "Moyenne", "\u00c0 FAIRE", ""],
  [14, "Cartographie fournisseurs", "Vue g\u00e9o par secteur/sp\u00e9cialit\u00e9", "P3", "Moyenne", "\u00c0 FAIRE", ""],
  [15, "Frise workflow auto-avancement", "Curseur progresse selon \u00e9tapes compl\u00e9t\u00e9es", "P1", "Moyenne", "EN COURS", "Frise faite"],
  [16, "Enlever march\u00e9s pharma", "Nettoyer mockData", "P2", "Faible", "\u00c0 FAIRE", ""],
];
const wsGaspar = XLSX.utils.aoa_to_sheet(gaspar);
wsGaspar["!cols"] = [{wch:4},{wch:36},{wch:58},{wch:8},{wch:10},{wch:10},{wch:35}];
XLSX.utils.book_append_sheet(wb, wsGaspar, "Gaspar \u2014 Reporting & Sourcing");

// TOM
const tom = [
  ["TOM \u2014 Contacts, Mailing, Communication"],
  [""],
  ["N\u00b0", "T\u00e2che", "Description", "Priorit\u00e9", "Complexit\u00e9", "Statut", "Notes"],
  [1, "Ajout/\u00e9dition contacts fournisseurs", "Formulaire ajouter/modifier contacts par march\u00e9", "P0", "Faible", "\u00c0 FAIRE", "Page existe d\u00e9j\u00e0"],
  [2, "Associer interlocuteurs \u2194 contacts", "Synchroniser interlocuteurs march\u00e9s avec page contacts", "P0", "Moyenne", "\u00c0 FAIRE", ""],
  [3, "Export carnet d'adresses", "vCard + Excel contacts fournisseurs", "P1", "Faible", "\u00c0 FAIRE", ""],
  [4, "Mailing int\u00e9gr\u00e9", "Envoyer mails depuis l'app (Outlook/Graph API)", "P0", "\u00c9lev\u00e9e", "\u00c0 FAIRE", "Int\u00e9gration Graph API"],
  [5, "Espace groupe de travail", "Communication GT : mailing group\u00e9, lien Teams", "P1", "\u00c9lev\u00e9e", "\u00c0 FAIRE", ""],
  [6, "Notifications enrichies", "Deadlines, t\u00e2ches, messages GT", "P1", "Moyenne", "PARTIEL", "Bell existe, \u00e0 enrichir"],
  [7, "Templates mails", "Relance fournisseur, convocation GT, envoi docs", "P1", "Moyenne", "\u00c0 FAIRE", ""],
  [8, "Historique \u00e9changes", "Log mails envoy\u00e9s par march\u00e9/fournisseur", "P2", "Moyenne", "\u00c0 FAIRE", ""],
  [9, "Import contacts Outlook", "Sync ou import fichier contacts", "P2", "Moyenne", "\u00c0 FAIRE", ""],
  [10, "Annuaire CLCC enrichi", "Organigrammes, contacts sp\u00e9cialis\u00e9s", "P3", "Faible", "\u00c0 FAIRE", ""],
];
const wsTom = XLSX.utils.aoa_to_sheet(tom);
wsTom["!cols"] = [{wch:4},{wch:36},{wch:58},{wch:8},{wch:10},{wch:10},{wch:35}];
XLSX.utils.book_append_sheet(wb, wsTom, "Tom \u2014 Contacts & Mailing");

// TRANSVERSE
const trans = [
  ["TRANSVERSE \u2014 Backend, UX, Infra, Formations, Matwin"],
  [""],
  ["N\u00b0", "T\u00e2che", "Description", "Priorit\u00e9", "Complexit\u00e9", "Resp.", "Statut", "Notes"],
  [1, "Auth Azure AD", "SSO Unicancer, multi-user, r\u00f4les", "P0", "\u00c9lev\u00e9e", "\u00c9quipe", "\u00c0 FAIRE", "D\u00e9bloque multi-user"],
  [2, "Base de donn\u00e9es Azure", "Remplacer mockData + localStorage", "P0", "\u00c9lev\u00e9e", "\u00c9quipe", "\u00c0 FAIRE", "D\u00e9pend Auth"],
  [3, "D\u00e9ploiement Azure", "H\u00e9bergement s\u00e9curis\u00e9 Unicancer", "P0", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [4, "CI/CD pipeline", "Build + tests auto sur PR", "P1", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", "GitHub Actions"],
  [5, "Collab temps r\u00e9el notation", "WebSocket multi-user", "P1", "\u00c9lev\u00e9e", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [6, "Profil \u00e9tendu", "R\u00e9cap march\u00e9s affect\u00e9s, deadlines, avatar", "P1", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [7, "Mode sombre/clair", "Toggle th\u00e8me", "P3", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [8, "Responsive mobile", "Sidebar, tableaux adapt\u00e9s", "P2", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [9, "Formations d\u00e9velopp\u00e9es", "Mod\u00e8le \u00e9co, inscriptions, QUALIOPI", "P2", "\u00c9lev\u00e9e", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [10, "Lien Forms inscriptions", "Microsoft Forms sync auto", "P2", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [11, "Communication GT formation", "Espace comm interne", "P2", "Moyenne", "Tom", "\u00c0 FAIRE", ""],
  [12, "Espace Matwin", "Section d\u00e9di\u00e9e (second temps)", "P3", "\u00c9lev\u00e9e", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [13, "Chatbot Copilot interne", "Questions sur donn\u00e9es SaaS", "P3", "\u00c9lev\u00e9e", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [14, "API Claude analyses", "G\u00e9n\u00e9ration commentaires, tendances", "P3", "\u00c9lev\u00e9e", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [15, "RDV Luc ERP/KPI", "Clarifier besoin, ERP supprim\u00e9", "P1", "\u2014", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [16, "Tests pipeline analyse", "DOC_RULES, BPU, CQ", "P2", "Moyenne", "Tim", "\u00c0 FAIRE", ""],
  [17, "Tests React", "Dashboard, Annuaire, Templates", "P2", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [18, "Code splitting", "Lazy load, r\u00e9duire bundle 3.7MB", "P2", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [19, "Vue Gantt calendrier", "Timeline march\u00e9s + jalons", "P2", "Moyenne", "\u00c9quipe", "\u00c0 FAIRE", ""],
  [20, "Progression auto workflow", "Curseur avance selon \u00e9tapes", "P1", "Moyenne", "Gaspar", "EN COURS", ""],
];
const wsTrans = XLSX.utils.aoa_to_sheet(trans);
wsTrans["!cols"] = [{wch:4},{wch:34},{wch:48},{wch:8},{wch:10},{wch:8},{wch:10},{wch:30}];
XLSX.utils.book_append_sheet(wb, wsTrans, "Transverse");

// RESUME
const resume = [
  ["R\u00c9SUM\u00c9 \u2014 TODO SaaS Gestion des March\u00e9s Unicancer"],
  ["G\u00e9n\u00e9r\u00e9 le " + new Date().toLocaleDateString("fr-FR")],
  [""],
  ["Personne", "Total", "Faites", "\u00c0 faire", "P0", "P1", "P2", "P3"],
  ["Tim (Analyse & Docs)", 22, 11, 11, 1, 4, 5, 1],
  ["Gaspar (Reporting & Sourcing)", 16, 0, 16, 3, 4, 5, 4],
  ["Tom (Contacts & Mailing)", 10, 0, 10, 2, 4, 3, 1],
  ["Transverse (\u00e9quipe)", 20, 0, 20, 3, 4, 8, 5],
  [""],
  ["TOTAL", 68, 11, 57, 9, 16, 21, 11],
];
const wsResume = XLSX.utils.aoa_to_sheet(resume);
wsResume["!cols"] = [{wch:28},{wch:8},{wch:8},{wch:10},{wch:6},{wch:6},{wch:6},{wch:6}];
XLSX.utils.book_append_sheet(wb, wsResume, "R\u00e9sum\u00e9");

XLSX.writeFile(wb, "C:/Users/t-reuze/Desktop/TODO_SaaS_v2.xlsx");
console.log("OK - fichier sur le bureau");
