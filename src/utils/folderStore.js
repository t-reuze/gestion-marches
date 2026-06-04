/**
 * folderStore.js
 * Stockage persistant des handles de dossiers par marché via IndexedDB.
 * Permet de retrouver le dossier lié à un marché entre les sessions.
 */

const DB_NAME = 'gm-folder-store';
const STORE_NAME = 'handles';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Sauvegarde le handle d'un dossier pour un marché
 */
export async function saveFolderHandle(marcheId, handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, marcheId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Récupère le handle d'un dossier pour un marché
 */
export async function getFolderHandle(marcheId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(marcheId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Supprime le handle d'un dossier pour un marché
 */
export async function removeFolderHandle(marcheId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(marcheId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Vérifie si on a encore la permission d'accéder au dossier
 */
export async function verifyPermission(handle) {
  if (!handle) return false;
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    const req = await handle.requestPermission({ mode: 'readwrite' });
    return req === 'granted';
  } catch {
    return false;
  }
}

/**
 * Compte le nombre total d'entrées (fichiers + dossiers) à plat — rapide, sans lire les métadonnées
 */
export async function countEntries(handle, onCount = null) {
  let count = 0;
  for await (const [name, entry] of handle.entries()) {
    if (name.startsWith('.') || name.startsWith('~')) continue;
    count++;
    if (count % 50 === 0 && onCount) {
      onCount(count);
      await new Promise(r => setTimeout(r, 0));
    }
    if (entry.kind === 'directory') {
      count += await countEntries(entry, onCount);
    }
  }
  return count;
}

/**
 * Liste récursive des fichiers d'un dossier avec structure arborescente
 * @param {FileSystemDirectoryHandle} handle
 * @param {string} path
 * @param {function} onProgress - callback({ scanned, total, currentName })
 * @param {{ scanned: number }} counter - compteur partagé entre les appels récursifs
 * @param {number} total - total estimé d'entrées
 */
// Micro-pause pour laisser le navigateur re-render
const yieldToUI = () => new Promise(r => setTimeout(r, 0));

export async function listFolderTree(handle, path = '', onProgress = null, counter = null, total = 0) {
  const items = [];
  for await (const [name, entry] of handle.entries()) {
    if (name.startsWith('.') || name.startsWith('~')) continue;
    const fullPath = path ? path + '/' + name : name;
    if (counter) {
      counter.scanned++;
      if (onProgress) onProgress({ scanned: counter.scanned, total, currentName: name });
      if (counter.scanned % 20 === 0) await yieldToUI();
    }
    if (entry.kind === 'directory') {
      const children = await listFolderTree(entry, fullPath, onProgress, counter, total);
      items.push({ name, path: fullPath, kind: 'directory', handle: entry, children });
    } else {
      // PAS de getFile() ici — trop lent sur OneDrive. On récupère les métadonnées plus tard.
      items.push({
        name, path: fullPath, kind: 'file', handle: entry,
        size: 0, lastModified: 0, _metaLoaded: false,
        ext: (name.match(/\.[^.]+$/) || [''])[0].toLowerCase(),
      });
    }
  }
  return items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, 'fr');
  });
}

/**
 * Charge les métadonnées (taille, date) d'un fichier à la demande
 */
export async function loadFileMeta(item) {
  if (item._metaLoaded || item.kind !== 'file') return item;
  try {
    const file = await item.handle.getFile();
    item.size = file.size;
    item.lastModified = file.lastModified;
    item._metaLoaded = true;
  } catch {}
  return item;
}

/**
 * Liste avec progression automatique — wrapper qui compte d'abord puis liste
 */
export async function listFolderTreeWithProgress(handle, onProgress) {
  // Phase 1 : compter avec progression
  if (onProgress) onProgress({ phase: 'count', scanned: 0, total: 0, currentName: 'Comptage des fichiers...' });
  const total = await countEntries(handle, (n) => {
    if (onProgress) onProgress({ phase: 'count', scanned: 0, total: n, currentName: n + ' elements trouves...' });
  });
  if (onProgress) onProgress({ phase: 'load', scanned: 0, total, currentName: 'Demarrage du chargement...' });

  // Phase 2 : lister avec progression
  const counter = { scanned: 0 };
  const tree = await listFolderTree(handle, '', (p) => {
    if (onProgress) onProgress({ phase: 'load', ...p });
  }, counter, total);
  return tree;
}

/**
 * Upload un fichier dans un dossier
 */
export async function uploadFile(dirHandle, file, subPath) {
  let target = dirHandle;
  if (subPath) {
    const parts = subPath.split('/').filter(Boolean);
    for (const part of parts) {
      target = await target.getDirectoryHandle(part, { create: true });
    }
  }
  const fileHandle = await target.getFileHandle(file.name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return true;
}

/**
 * Crée un sous-dossier
 */
export async function createSubfolder(dirHandle, name, subPath) {
  let target = dirHandle;
  if (subPath) {
    const parts = subPath.split('/').filter(Boolean);
    for (const part of parts) {
      target = await target.getDirectoryHandle(part, { create: true });
    }
  }
  await target.getDirectoryHandle(name, { create: true });
  return true;
}

/**
 * Supprime un fichier ou dossier
 * @param {FileSystemDirectoryHandle} parentHandle - dossier parent
 * @param {string} name - nom de l'entrée à supprimer
 * @param {boolean} recursive - supprimer récursivement si dossier
 */
export async function deleteEntry(parentHandle, name, recursive = false) {
  await parentHandle.removeEntry(name, { recursive });
  return true;
}

/**
 * Renomme un fichier (copie + suppression car l'API ne supporte pas le rename natif)
 * @param {FileSystemDirectoryHandle} parentHandle - dossier parent
 * @param {string} oldName - ancien nom
 * @param {string} newName - nouveau nom
 */
export async function renameEntry(parentHandle, oldName, newName) {
  // Lire l'ancien fichier
  const oldHandle = await parentHandle.getFileHandle(oldName);
  const file = await oldHandle.getFile();
  const buf = await file.arrayBuffer();

  // Créer le nouveau fichier
  const newHandle = await parentHandle.getFileHandle(newName, { create: true });
  const writable = await newHandle.createWritable();
  await writable.write(buf);
  await writable.close();

  // Supprimer l'ancien
  await parentHandle.removeEntry(oldName);
  return true;
}

/**
 * Renomme un dossier (pas supporté nativement — copie récursive)
 */
export async function renameFolder(parentHandle, oldName, newName) {
  // Créer le nouveau dossier
  const newDir = await parentHandle.getDirectoryHandle(newName, { create: true });
  const oldDir = await parentHandle.getDirectoryHandle(oldName);

  // Copier récursivement
  async function copyDir(src, dst) {
    for await (const [name, entry] of src.entries()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const buf = await file.arrayBuffer();
        const newFile = await dst.getFileHandle(name, { create: true });
        const w = await newFile.createWritable();
        await w.write(buf);
        await w.close();
      } else {
        const newSub = await dst.getDirectoryHandle(name, { create: true });
        await copyDir(entry, newSub);
      }
    }
  }
  await copyDir(oldDir, newDir);

  // Supprimer l'ancien
  await parentHandle.removeEntry(oldName, { recursive: true });
  return true;
}
