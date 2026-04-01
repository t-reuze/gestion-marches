import Layout from '../../components/Layout';

export default function ContactsAnnuaire() {
  return (
    <Layout title="Contacts" sub="Annuaire global">
      <div className="empty-state">
        <div className="empty-icon">👥</div>
        <div className="empty-title">Annuaire des contacts</div>
        <div className="empty-sub">
          Tous les interlocuteurs — marchés et formations.<br />
          En cours de développement (Phase 2).
        </div>
      </div>
    </Layout>
  );
}
