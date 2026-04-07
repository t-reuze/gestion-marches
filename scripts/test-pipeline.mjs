/**
 * Test du pipeline d'analyse contre un dossier réel.
 * Usage: node scripts/test-pipeline.mjs "<chemin dossier>"
 *
 * Simule l'API File System Access avec des handles fs natifs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] || 'C:/Users/t-reuze/OneDrive - UNICANCER/Bureau/Interface Unicancer Analyse des offres/AO_Recrutement_Standardisés';

// Adapter fs → FileSystemDirectoryHandle-like
function makeDirHandle(dirPath) {
  return {
    kind: 'directory',
    name: path.basename(dirPath),
    async *entries() {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      for (const it of items) {
        const full = path.join(dirPath, it.name);
        if (it.isDirectory()) yield [it.name, makeDirHandle(full)];
        else yield [it.name, makeFileHandle(full, it.name)];
      }
    },
  };
}
function makeFileHandle(filePath, name) {
  return {
    kind: 'file', name,
    async getFile() {
      const buf = await fs.readFile(filePath);
      return {
        async arrayBuffer() {
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        },
      };
    },
  };
}

// Charge les modules pipeline
const pipelinePath = path.resolve(__dirname, '../src/utils/analysePipeline/index.js');
const { processBpuFolder, processQuestionnaireFolder } = await import('file://' + pipelinePath.replace(/\\/g, '/'));

const root = makeDirHandle(ROOT);

console.log('━━━ TEST BPU ━━━');
try {
  const bpu = await processBpuFolder(root, 'test', m => process.stdout.write(`\r${m}`.padEnd(80)));
  console.log('\n');
  for (const r of bpu) {
    const lots = Object.entries(r.lots).map(([n, l]) => {
      const s = l.meta.stats || {};
      return `Lot${n}=${s.filled || 0}/${s.total || 0}`;
    }).join(' ');
    const conf = (r.meta.overallConfidence * 100).toFixed(0);
    console.log(`  ${r.fournisseur.padEnd(35)} conf=${conf}% ${lots}`);
  }
} catch (e) { console.error('BPU ERR:', e.message); }

console.log('\n━━━ TEST QT ━━━');
try {
  const qt = await processQuestionnaireFolder(root, 'QT', 'QT', 'test', m => process.stdout.write(`\r${m}`.padEnd(80)));
  console.log('\n');
  for (const r of qt) {
    const sects = Object.values(r.sections || {});
    const totalQ = sects.reduce((s, x) => s + (x.stats?.total || 0), 0);
    const ans = sects.reduce((s, x) => s + (x.stats?.answered || 0), 0);
    const conf = (r.meta.overallConfidence * 100).toFixed(0);
    console.log(`  ${r.fournisseur.padEnd(35)} conf=${conf}% ${ans}/${totalQ} questions répondues  (${sects.length} sections)`);
  }
} catch (e) { console.error('QT ERR:', e.message); }

console.log('\n━━━ TEST RSE ━━━');
try {
  const rse = await processQuestionnaireFolder(root, 'RSE', 'RSE', 'test', m => process.stdout.write(`\r${m}`.padEnd(80)));
  console.log('\n');
  for (const r of rse) {
    const sects = Object.values(r.sections || {});
    const totalQ = sects.reduce((s, x) => s + (x.stats?.total || 0), 0);
    const ans = sects.reduce((s, x) => s + (x.stats?.answered || 0), 0);
    const conf = (r.meta.overallConfidence * 100).toFixed(0);
    console.log(`  ${r.fournisseur.padEnd(35)} conf=${conf}% ${ans}/${totalQ}  (${sects.length} sections)`);
  }
} catch (e) { console.error('RSE ERR:', e.message); }
