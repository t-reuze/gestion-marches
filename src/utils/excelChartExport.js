import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const CHART_COLORS_HEX = [
  '2563EB', '16A34A', 'DC2626', '9333EA', 'F59E0B',
  '0891B2', 'DB2777', '0D9488', 'EA580C', '4F46E5',
  '059669', 'E11D48', '7C3AED', 'D97706', '0284C7',
];

/**
 * Crée un fichier Excel avec données + graphique natif éditable.
 *
 * @param {string} title - Titre du graphique
 * @param {Array} data - [{label: string, value: number}]
 * @param {'bar'|'line'|'pie'} chartType
 * @param {string} labelCol - Nom de la colonne labels (ex: "Fournisseur")
 * @param {string} valueCol - Nom de la colonne valeurs (ex: "CA TTC (EUR)")
 */
export async function exportExcelWithChart(title, data, chartType = 'bar', labelCol = 'Label', valueCol = 'Valeur') {
  // 1. Créer le classeur avec les données
  const sheetData = data.map(d => ({ [labelCol]: d.label || d.name, [valueCol]: d.value }));
  const ws = XLSX.utils.json_to_sheet(sheetData);

  // Largeur colonnes auto
  ws['!cols'] = [{ wch: Math.max(labelCol.length, ...data.map(d => String(d.label || d.name || '').length)) + 2 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Données');

  // 2. Générer le xlsx en mémoire
  const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  // 3. Ouvrir avec JSZip et injecter le graphique
  const zip = await JSZip.loadAsync(xlsxBuffer);

  const rowCount = data.length;
  const sheetRef = 'Données';

  // Ajouter le chart XML
  zip.file('xl/charts/chart1.xml', buildChartXml(chartType, sheetRef, rowCount, labelCol, valueCol, title));

  // Ajouter le drawing XML (ancrage du graphique dans la feuille)
  zip.file('xl/drawings/drawing1.xml', buildDrawingXml());

  // Relations drawing → chart
  zip.file('xl/drawings/_rels/drawing1.xml.rels', buildDrawingRels());

  // Relations sheet → drawing
  const sheetRelsPath = 'xl/worksheets/_rels/sheet1.xml.rels';
  zip.file(sheetRelsPath, buildSheetRels());

  // Mettre à jour Content_Types
  const contentTypes = await zip.file('[Content_Types].xml').async('string');
  const newContentTypes = contentTypes.replace(
    '</Types>',
    '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' +
    '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' +
    '</Types>'
  );
  zip.file('[Content_Types].xml', newContentTypes);

  // Mettre à jour la feuille pour référencer le drawing
  const sheetPath = 'xl/worksheets/sheet1.xml';
  let sheetXml = await zip.file(sheetPath).async('string');
  sheetXml = sheetXml.replace(
    '</worksheet>',
    '<drawing r:id="rId1"/></worksheet>'
  );
  zip.file(sheetPath, sheetXml);

  // 4. Télécharger
  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = (title || 'graphique').replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÉ\s-]/g, '') + '.xlsx';
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildChartXml(chartType, sheetName, rowCount, labelCol, valueCol, title) {
  const catRef = `'${sheetName}'!$A$2:$A$${rowCount + 1}`;
  const valRef = `'${sheetName}'!$B$2:$B$${rowCount + 1}`;

  const colorEntries = Array.from({ length: rowCount }, (_, i) => {
    const hex = CHART_COLORS_HEX[i % CHART_COLORS_HEX.length];
    return `<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${hex}"/></a:solidFill></c:spPr></c:dPt>`;
  }).join('');

  const series = `
    <c:ser>
      <c:idx val="0"/>
      <c:order val="0"/>
      <c:tx><c:strRef><c:f>'${sheetName}'!$B$1</c:f></c:strRef></c:tx>
      ${chartType === 'pie' || chartType === 'bar' ? colorEntries : ''}
      ${chartType === 'line' ? '<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="2563EB"/></a:solidFill></a:ln></c:spPr>' : ''}
      <c:cat><c:strRef><c:f>${catRef}</c:f></c:strRef></c:cat>
      <c:val><c:numRef><c:f>${valRef}</c:f></c:numRef></c:val>
    </c:ser>`;

  let plotArea;
  if (chartType === 'bar') {
    plotArea = `
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="1"/>
        ${series}
        <c:axId val="1"/>
        <c:axId val="2"/>
      </c:barChart>
      <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="2"/></c:catAx>
      <c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="1"/><c:numFmt formatCode="#,##0" sourceLinked="0"/></c:valAx>`;
  } else if (chartType === 'line') {
    plotArea = `
      <c:lineChart>
        <c:grouping val="standard"/>
        <c:varyColors val="0"/>
        ${series}
        <c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>
        <c:axId val="1"/>
        <c:axId val="2"/>
      </c:lineChart>
      <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="2"/></c:catAx>
      <c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="1"/><c:numFmt formatCode="#,##0" sourceLinked="0"/></c:valAx>`;
  } else {
    plotArea = `
      <c:pieChart>
        <c:varyColors val="1"/>
        ${series}
      </c:pieChart>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="fr-FR" sz="1200" b="1"/><a:t>${title || ''}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      ${plotArea}
    </c:plotArea>
    <c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function buildDrawingXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
          xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>22</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="2" name="Chart 1"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

function buildDrawingRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`;
}

function buildSheetRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
}
