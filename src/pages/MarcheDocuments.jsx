import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import MarcheNavTabs from '../components/MarcheNavTabs';
import { marches } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';
import {
  saveFolderHandle, getFolderHandle, removeFolderHandle,
  verifyPermission, listFolderTreeWithProgress, uploadFile, createSubfolder,
  loadFileMeta, deleteEntry, renameEntry, renameFolder,
} from '../utils/folderStore';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EXT_COLORS = {
  '.pdf': { bg: '#fef2f2', color: '#b91c1c' },
  '.xlsx': { bg: '#ecfdf5', color: '#047857' },
  '.xls': { bg: '#ecfdf5', color: '#047857' },
  '.docx': { bg: '#eff6ff', color: '#1d4ed8' },
  '.doc': { bg: '#eff6ff', color: '#1d4ed8' },
  '.pptx': { bg: '#fef3c7', color: '#92400e' },
  '.zip': { bg: '#f3f4f6', color: '#374151' },
  '.7z': { bg: '#f3f4f6', color: '#374151' },
};

function FileIcon({ ext }) {
  const c = EXT_COLORS[ext] || { bg: '#f9fafb', color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 6, fontSize: 9, fontWeight: 700,
      background: c.bg, color: c.color, fontFamily: 'monospace', flexShrink: 0,
    }}>
      {ext.replace('.', '').toUpperCase().slice(0, 4)}
    </span>
  );
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function FileTree({ items, level = 0, onDownload, onDelete, onRename, expandedDirs, toggleDir, dragOverPath, onDragOver, onDragLeave, onDrop }) {
  return items.map(item => {
    if (item.kind === 'directory') {
      const isOpen = expandedDirs[item.path] !== false;
      const isDragOver = dragOverPath === item.path;
      return (
        <div key={item.path}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', paddingLeft: 12 + level * 20,
              cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
              background: isDragOver ? '#dbeafe' : (level === 0 ? '#f9fafb' : 'transparent'),
              borderBottom: '1px solid #f3f4f6',
              transition: 'background .1s',
            }}
            onClick={() => toggleDir(item.path)}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(item.path); }}
            onDragLeave={() => onDragLeave()}
            onDrop={e => onDrop(e, item.path, item.handle)}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s', flexShrink: 0 }}>
              <polyline points="6,4 10,8 6,12"/>
            </svg>
            <FolderIcon />
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {item.children.length} element{item.children.length > 1 ? 's' : ''}
            </span>
            <button onClick={e => { e.stopPropagation(); onRename(item); }} title="Renommer"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af', opacity: 0.5 }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(item); }} title="Supprimer"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#dc2626', opacity: 0.5 }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
          {isOpen && item.children.length > 0 && (
            <FileTree items={item.children} level={level + 1}
              onDownload={onDownload} onDelete={onDelete} onRename={onRename}
              expandedDirs={expandedDirs} toggleDir={toggleDir}
              dragOverPath={dragOverPath} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} />
          )}
        </div>
      );
    }

    return (
      <div key={item.path} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 12px', paddingLeft: 12 + level * 20,
        fontSize: 12, borderBottom: '1px solid #f9fafb',
        cursor: 'default',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
        onMouseLeave={e => e.currentTarget.style.background = ''}
      >
        <FileIcon ext={item.ext} />
        <span style={{ flex: 1, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </span>
        {item._metaLoaded && <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{formatSize(item.size)}</span>}
        {item._metaLoaded && <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0 }}>{formatDate(item.lastModified)}</span>}
        <button onClick={() => onRename(item)} title="Renommer"
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af', opacity: 0.5 }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
        <button onClick={() => onDelete(item)} title="Supprimer"
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#dc2626', opacity: 0.5 }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
        <button onClick={() => onDownload(item)} title="Telecharger"
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#6b7280' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    );
  });
}

export default function MarcheDocuments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const marche = marches.find(m => m.id === id);
  const meta = getMeta(id);
  const nom = meta.nom || marche?.nom || id;

  const [dirHandle, setDirHandle] = useState(null);
  const [dirName, setDirName] = useState('');
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [dragOverPath, setDragOverPath] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [progress, setProgress] = useState(null); // { scanned, total, currentName }

  // Stats
  const countFiles = (items) => items.reduce((s, i) => s + (i.kind === 'file' ? 1 : countFiles(i.children || [])), 0);
  const countDirs = (items) => items.reduce((s, i) => s + (i.kind === 'directory' ? 1 + countDirs(i.children || []) : 0), 0);

  // Charger le handle persisté
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const handle = await getFolderHandle(id);
        if (handle) {
          // On set le handle même sans permission — l'utilisateur verra le bouton "Recharger"
          setDirHandle(handle);
          setDirName(handle.name);
          // Tenter de vérifier la permission (peut échouer si pas de geste utilisateur)
          try {
            const perm = await handle.queryPermission({ mode: 'readwrite' });
            if (perm === 'granted') {
              const t = await listFolderTreeWithProgress(handle, setProgress);
              setTree(t);
              setProgress(null);
            }
            // Si 'prompt', on ne demande PAS automatiquement — l'utilisateur cliquera "Recharger"
          } catch {}
        }
      } catch (e) {
        // silently ignore restore errors
      }
      setLoading(false);
    })();
  }, [id]);

  const handlePickFolder = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await saveFolderHandle(id, handle);
      setDirHandle(handle);
      setDirName(handle.name);
      setLoading(true);
      setProgress({ scanned: 0, total: 0, currentName: 'Lecture du dossier...' });
      try {
        const t = await listFolderTreeWithProgress(handle, setProgress);
        setTree(t);
        setProgress(null);
      } catch (e) {
        console.error('Erreur lecture dossier:', e);
        setTree([]);
        setProgress(null);
      }
      setLoading(false);
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }, [id]);

  // Re-demander la permission si le handle existe mais le tree est vide
  const handleReauthorize = useCallback(async () => {
    if (!dirHandle) return;
    try {
      const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        setLoading(true);
        const t = await listFolderTreeWithProgress(dirHandle, setProgress);
        setTree(t);
        setProgress(null);
        setLoading(false);
      }
    } catch (e) {
      console.error('Reauthorize error:', e);
    }
  }, [dirHandle]);

  const handleUnlink = useCallback(async () => {
    await removeFolderHandle(id);
    setDirHandle(null);
    setDirName('');
    setTree([]);
  }, [id]);

  const refreshTree = useCallback(async () => {
    if (!dirHandle) return;
    setLoading(true);
    const t = await listFolderTreeWithProgress(dirHandle, setProgress);
    setTree(t);
    setProgress(null);
    setLoading(false);
  }, [dirHandle]);

  const handleDownload = useCallback(async (item) => {
    const file = await item.handle.getFile();
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = item.name; a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Résoudre le dossier parent à partir du path
  const getParentHandle = useCallback(async (itemPath) => {
    const parts = itemPath.split('/');
    parts.pop(); // enlever le nom du fichier/dossier
    let h = dirHandle;
    for (const p of parts) {
      h = await h.getDirectoryHandle(p);
    }
    return h;
  }, [dirHandle]);

  const handleDelete = useCallback(async (item) => {
    const msg = item.kind === 'directory'
      ? `Supprimer le dossier "${item.name}" et tout son contenu ?`
      : `Supprimer "${item.name}" ?`;
    if (!window.confirm(msg)) return;
    try {
      const parent = await getParentHandle(item.path);
      await deleteEntry(parent, item.name, item.kind === 'directory');
      await refreshTree();
    } catch (e) {
      alert('Erreur suppression : ' + e.message);
    }
  }, [getParentHandle, refreshTree]);

  const handleRename = useCallback(async (item) => {
    const newName = window.prompt('Nouveau nom :', item.name);
    if (!newName || newName === item.name) return;
    try {
      const parent = await getParentHandle(item.path);
      if (item.kind === 'directory') {
        await renameFolder(parent, item.name, newName);
      } else {
        await renameEntry(parent, item.name, newName);
      }
      await refreshTree();
    } catch (e) {
      alert('Erreur renommage : ' + e.message);
    }
  }, [getParentHandle, refreshTree]);

  const handleUpload = useCallback(async (files, targetPath, targetHandle) => {
    const target = targetHandle || dirHandle;
    for (const file of files) {
      await uploadFile(target, file, '');
    }
    await refreshTree();
  }, [dirHandle, refreshTree]);

  const handleRootDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length && dirHandle) {
      await handleUpload(files);
    }
  }, [dirHandle, handleUpload]);

  const handleSubDrop = useCallback(async (e, path, handle) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);
    const files = [...e.dataTransfer.files];
    if (files.length && handle) {
      for (const file of files) {
        await uploadFile(handle, file, '');
      }
      await refreshTree();
    }
  }, [refreshTree]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !dirHandle) return;
    await createSubfolder(dirHandle, newFolderName.trim(), '');
    setNewFolderName('');
    setShowNewFolder(false);
    await refreshTree();
  }, [dirHandle, newFolderName, refreshTree]);

  const toggleDir = (path) => setExpandedDirs(prev => ({ ...prev, [path]: prev[path] === false ? true : false }));

  const supportsApi = 'showDirectoryPicker' in window;

  return (
    <Layout title={nom} sub="— Documents">
      <MarcheNavTabs />

      {!supportsApi ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#d97706', fontSize: 14 }}>
          Navigateur non compatible — Chrome ou Edge requis pour la gestion de fichiers.
        </div>
      ) : !dirHandle ? (
        /* Pas de dossier lié */
        <div className="fade-in" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Aucun dossier lie a ce marche
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            Liez un dossier local pour deposer et gerer les documents de ce marche.
            L'analyse utilisera automatiquement ce dossier.
          </div>
          <button className="btn btn-primary" onClick={handlePickFolder} style={{ fontSize: 14, padding: '10px 24px' }}>
            Selectionner un dossier
          </button>
        </div>
      ) : (
        /* Dossier lié — file manager */
        <div className="fade-in">
          {/* Toolbar */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16,
            padding: '10px 16px', borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb',
            flexWrap: 'wrap',
          }}>
            <FolderIcon />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{dirName}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {countFiles(tree)} fichiers, {countDirs(tree)} dossiers
              </div>
            </div>

            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={refreshTree}>
              Actualiser
            </button>
            <label className="btn btn-outline btn-sm" style={{ fontSize: 11, cursor: 'pointer' }}>
              Ajouter fichier
              <input type="file" multiple hidden onChange={async (e) => {
                if (e.target.files.length) await handleUpload([...e.target.files]);
                e.target.value = '';
              }} />
            </label>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }}
              onClick={() => setShowNewFolder(!showNewFolder)}>
              Nouveau dossier
            </button>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
              onClick={() => navigate('/marche/' + id + '/analyse')}>
              Lancer l'analyse
            </button>
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: '#dc2626', borderColor: '#fecaca' }}
              onClick={handleUnlink}>
              Delier
            </button>
          </div>

          {/* New folder input */}
          {showNewFolder && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <input type="text" placeholder="Nom du dossier..." value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                style={{ flex: 1, maxWidth: 300, padding: '6px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none' }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={handleCreateFolder}>Creer</button>
              <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>Annuler</button>
            </div>
          )}

          {/* File tree */}
          <div
            style={{
              borderRadius: 12, overflow: 'hidden', border: dragOver ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
              background: dragOver ? '#eff6ff' : '#fff', transition: 'all .15s', minHeight: 200,
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleRootDrop}
          >
            {loading ? (
              <div style={{ padding: 30, textAlign: 'center' }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                {progress && progress.phase === 'load' && progress.total > 0 ? (
                  <>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>
                      {Math.round(progress.scanned / progress.total * 100)}%
                    </div>
                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 10 }}>
                      {progress.scanned} / {progress.total} elements importes
                    </div>
                    <div style={{
                      width: '100%', maxWidth: 420, height: 10, borderRadius: 5,
                      background: '#e5e7eb', overflow: 'hidden', margin: '0 auto 10px',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 5,
                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        width: Math.round(progress.scanned / progress.total * 100) + '%',
                        transition: 'width 0.1s',
                      }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {progress.currentName}
                    </div>
                  </>
                ) : progress && progress.phase === 'count' ? (
                  <>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #f59e0b', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#d97706', marginBottom: 4 }}>
                      Scan du dossier...
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {progress.currentName}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Initialisation...</div>
                  </>
                )}
              </div>
            ) : tree.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Le dossier semble vide ou la permission a expire</div>
                <div style={{ fontSize: 12, marginBottom: 16 }}>Glissez des fichiers ici ou cliquez ci-dessous pour recharger</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleReauthorize}>
                    Recharger le dossier
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={handlePickFolder}>
                    Changer de dossier
                  </button>
                </div>
              </div>
            ) : (
              <FileTree items={tree} onDownload={handleDownload}
                onDelete={handleDelete} onRename={handleRename}
                expandedDirs={expandedDirs} toggleDir={toggleDir}
                dragOverPath={dragOverPath}
                onDragOver={p => setDragOverPath(p)}
                onDragLeave={() => setDragOverPath(null)}
                onDrop={handleSubDrop}
              />
            )}

            {dragOver && (
              <div style={{
                padding: 20, textAlign: 'center', color: '#3b82f6', fontSize: 13, fontWeight: 600,
                borderTop: '1px dashed #93c5fd',
              }}>
                Deposez vos fichiers ici
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
