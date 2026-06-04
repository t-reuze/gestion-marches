import { normalizeText, MANUAL_ALIASES } from '../src/utils/bddBuilder/matchClcc.js';

const inputs = ['CH PERPIGNAN', 'CENTRE HOSPITALIER R.BOULIN', 'CENTRE HOSPITALIER DE TROYES', 'CHRU - GH PELLEGRIN', 'CENTRE HOSPITALIER', 'APHM', 'CHRU - HOPITAL BRABOIS ADULTES'];

for (const i of inputs) {
  const norm = normalizeText(i);
  let firstHit = null;
  for (const [alias, target] of Object.entries(MANUAL_ALIASES)) {
    if (norm.includes(alias)) { firstHit = { alias, target }; break; }
  }
  console.log(`"${i}" → norm="${norm}" → ${firstHit ? `match alias "${firstHit.alias}" → ${firstHit.target}` : 'NO ALIAS MATCH'}`);
}
