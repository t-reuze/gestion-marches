import { useState } from 'react';
import Layout from '../../components/Layout';
import { marches, formations } from '../../data/mockData';

function extractContacts() {
  const contacts = new Map();

  marches.forEach(m => {
    if (m.responsable) {
      m.responsable.split('/').map(n => n.trim()).filter(Boolean).forEach(name => {
        if (!contacts.has(name)) contacts.set(name, { nom: name, marches: [], formations: [] });
        contacts.get(name).marches.push(m.nom);
      });
    }
  });

  formations.forEach(f => {
    if (f.contact) {
      f.contact.split('/').map(n => n.trim()).filter(Boolean).forEach(name => {
        if (!contacts.has(name)) contacts.set(name, { nom: name, marches: [], formations: [] });
        contacts.get(name).formations.push(f.nom);
      });
    }
    if (f.responsablePedagogique) {
      f.responsablePedagogique.split('/').map(n => n.trim()).filter(Boolean).forEach(name => {
        if (!contacts.has(name)) contacts.set(name, { nom: name, marches: [], formations: [] });
        if (!contacts.get(name).formations.includes(f.nom)) {
          contacts.get(name).formations.push(f.nom);
        }
      });
    }
  });

  return Array.from(contacts.values()).sort((a, b) => a.nom.localeCompare(b.nom));
}

export default function ContactsAnnuaire() {
  const [search, setSearch] = useState('');
  const contacts = extractContacts();
  const filtered = search.trim()
    ? contacts.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  return (
    <Layout title="Contacts" sub="Annuaire global des interlocuteurs">
      <div className="card" style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Rechercher un contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 13, background: 'var(--surface-raised)',
          }}
        />
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Marchés</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Formations</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.nom} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.nom}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                  {c.marches.length ? c.marches.join(', ') : '—'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                  {c.formations.length ? c.formations.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
