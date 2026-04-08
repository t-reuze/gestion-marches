import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { exportExcelWithChart } from '../../utils/excelChartExport';

/**
 * Bouton d'export pour graphiques. Se place dans le card-header.
 * Utilise une ref vers le conteneur du graphique pour le PNG/clipboard.
 */
export function ChartExportButton({ title, data, chartType = 'bar', labelCol = 'Label', valueCol = 'Valeur', chartRef }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  function showFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2000);
  }

  function getSvgElement() {
    if (!chartRef?.current) return null;
    return chartRef.current.querySelector('svg');
  }

  function svgToCanvas(svg) {
    return new Promise((resolve) => {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const rect = svg.getBoundingClientRect();
      const scale = 2;
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  }

  async function handleExportPng() {
    setOpen(false);
    const svg = getSvgElement();
    if (!svg) return showFeedback('Graphique introuvable');
    const canvas = await svgToCanvas(svg);
    const link = document.createElement('a');
    link.download = (title || 'graphique').replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÉ\s-]/g, '') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showFeedback('PNG téléchargé');
  }

  async function handleCopyClipboard() {
    setOpen(false);
    const svg = getSvgElement();
    if (!svg) return showFeedback('Graphique introuvable');
    try {
      const canvas = await svgToCanvas(svg);
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showFeedback('Copié');
      }, 'image/png');
    } catch { showFeedback('Erreur de copie'); }
  }

  async function handleExportExcel() {
    setOpen(false);
    if (!data || data.length === 0) return showFeedback('Pas de données');
    try {
      await exportExcelWithChart(title, data, chartType, labelCol, valueCol);
      showFeedback('Excel téléchargé');
    } catch (err) {
      console.error('Export Excel error:', err);
      showFeedback('Erreur export');
    }
  }

  return (
    <div className="chart-export-zone">
      <button className="chart-export-btn" onClick={() => setOpen(!open)} title="Exporter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      {feedback && <span className="chart-export-feedback">{feedback}</span>}
      {open && (
        <>
          <div className="chart-export-overlay" onClick={() => setOpen(false)} />
          <div className="chart-export-dropdown">
            <button onClick={handleExportExcel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Excel avec graphique
            </button>
            <button onClick={handleExportPng}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Télécharger PNG
            </button>
            <button onClick={handleCopyClipboard}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copier l'image
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Keep default export for backward compat
export default ChartExportButton;
