import { getAccessToken } from './msalConfig';

const GRAPH_URL = 'https://graph.microsoft.com/v1.0';

// ══════════════════════════════════════════════════════════════
// Microsoft Graph API — Sync contacts vers Outlook 365
// ══════════════════════════════════════════════════════════════

async function graphFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Non connecté à Microsoft 365');

  const res = await fetch(GRAPH_URL + path, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erreur Graph API ' + res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Dossier contacts ──────────────────────────────────────────

async function findOrCreateFolder(folderName) {
  // Chercher si le dossier existe
  const { value: folders } = await graphFetch('/me/contactFolders');
  const existing = folders.find(f => f.displayName === folderName);
  if (existing) return existing.id;

  // Créer le dossier
  const created = await graphFetch('/me/contactFolders', {
    method: 'POST',
    body: JSON.stringify({ displayName: folderName }),
  });
  return created.id;
}

// ── Conversion contact SaaS → format Outlook ─────────────────

function toOutlookContact(contact, clccNom, marchesNoms) {
  const nameParts = contact.nom.split(/\s+/);
  const givenName = nameParts[0] || '';
  const surname = nameParts.slice(1).join(' ') || '';

  const result = {
    givenName,
    surname,
    displayName: contact.nom,
    jobTitle: contact.fonction || '',
    companyName: clccNom,
    department: contact.service || '',
    categories: ['UNICANCER', clccNom],
  };

  if (contact.email) {
    result.emailAddresses = [{ address: contact.email, name: contact.nom }];
  }

  if (contact.telephone) {
    result.businessPhones = [contact.telephone];
  }

  // Marchés liés dans les notes
  if (marchesNoms && marchesNoms.length > 0) {
    result.personalNotes = 'Marchés liés : ' + marchesNoms.join(', ');
  }

  return result;
}

// ── Sync d'un CLCC complet ────────────────────────────────────

export async function syncClccToOutlook(clcc, contacts, marches) {
  const folderName = 'UNICANCER — ' + clcc.nom;
  const folderId = await findOrCreateFolder(folderName);

  // Récupérer les contacts existants dans ce dossier
  const { value: existing } = await graphFetch(
    '/me/contactFolders/' + folderId + '/contacts?$select=id,displayName'
  );
  const existingMap = new Map(existing.map(c => [c.displayName, c.id]));

  const results = { created: 0, updated: 0, errors: [] };

  for (const contact of contacts) {
    const marchesNoms = (contact.marchesLies || [])
      .map(mid => marches.find(m => m.id === mid)?.nom)
      .filter(Boolean);

    const outlookData = toOutlookContact(contact, clcc.nom, marchesNoms);

    try {
      if (existingMap.has(contact.nom)) {
        // Mettre à jour
        await graphFetch(
          '/me/contactFolders/' + folderId + '/contacts/' + existingMap.get(contact.nom),
          { method: 'PATCH', body: JSON.stringify(outlookData) }
        );
        results.updated++;
      } else {
        // Créer
        await graphFetch(
          '/me/contactFolders/' + folderId + '/contacts',
          { method: 'POST', body: JSON.stringify(outlookData) }
        );
        results.created++;
      }
    } catch (err) {
      results.errors.push({ contact: contact.nom, error: err.message });
    }
  }

  return results;
}

// ── Sync de tout l'annuaire ──────────────────────────────────

export async function syncAllToOutlook(clccs, allMeta, marches) {
  const results = { total: 0, created: 0, updated: 0, errors: [] };

  for (const clcc of clccs) {
    const meta = allMeta['clcc-' + clcc.id] || {};
    const contacts = meta.contacts || [];
    if (contacts.length === 0) continue;

    const r = await syncClccToOutlook(clcc, contacts, marches);
    results.total += contacts.length;
    results.created += r.created;
    results.updated += r.updated;
    results.errors.push(...r.errors);
  }

  return results;
}

// ── Export VCF (fonctionne sans Microsoft 365) ────────────────

export function exportContactsVCF(clccs, allMeta, marches) {
  const lines = [];

  for (const clcc of clccs) {
    const meta = allMeta['clcc-' + clcc.id] || {};
    const contacts = meta.contacts || [];

    for (const ct of contacts) {
      const nameParts = ct.nom.split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const firstName = nameParts[0] || '';

      const marchesNoms = (ct.marchesLies || [])
        .map(mid => marches.find(m => m.id === mid)?.nom)
        .filter(Boolean);

      lines.push('BEGIN:VCARD');
      lines.push('VERSION:3.0');
      lines.push('N:' + lastName + ';' + firstName + ';;;');
      lines.push('FN:' + ct.nom);
      lines.push('ORG:' + clcc.nom);
      if (ct.fonction) lines.push('TITLE:' + ct.fonction);
      if (ct.service) lines.push('X-DEPARTMENT:' + ct.service);
      if (ct.email) lines.push('EMAIL;TYPE=WORK:' + ct.email);
      if (ct.telephone) lines.push('TEL;TYPE=WORK:' + ct.telephone);
      lines.push('CATEGORIES:UNICANCER,' + clcc.nom);
      if (ct.fonction) lines.push('NOTE:Fonction: ' + ct.fonction + (marchesNoms.length > 0 ? '\\nMarchés: ' + marchesNoms.join(', ') : ''));
      lines.push('END:VCARD');
      lines.push('');
    }
  }

  if (lines.length === 0) return false;

  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'contacts_unicancer_' + new Date().toISOString().slice(0, 10) + '.vcf';
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}
