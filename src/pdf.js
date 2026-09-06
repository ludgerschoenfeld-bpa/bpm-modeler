import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

const margin = 16;
const diagramMargin = 12;
const pxToMm = 25.4 / 96;
export const documentSpacing = Object.freeze({ separatorBefore: 3, separatorAfter: 8, section: 8 });

function contentSize(pdf, top = diagramMargin, bottom = margin) {
  return {
    width: pdf.internal.pageSize.getWidth() - diagramMargin * 2,
    height: pdf.internal.pageSize.getHeight() - top - bottom
  };
}

function svgDimensions(svg) {
  const node = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  const viewBox = (node.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (viewBox.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
    return { node, width: viewBox[2], height: viewBox[3] };
  }
  const width = Number.parseFloat(node.getAttribute('width'));
  const height = Number.parseFloat(node.getAttribute('height'));
  return { node, width, height };
}

// BPMN SVG coordinates are CSS pixels. This determines whether its unscaled
// (100 %) diagram bounds fit the printable area of a portrait DIN A4 page.
export function diagramFitsPortrait(svg) {
  const { width, height } = svgDimensions(svg);
  const portraitWidth = 210 - diagramMargin * 2;
  const portraitHeight = 297 - diagramMargin - margin;
  return Number.isFinite(width) && Number.isFinite(height)
    && width * pxToMm <= portraitWidth && height * pxToMm <= portraitHeight;
}

export function messageFlowTitle(message, language = 'en') {
  const pool = message.sourcePool || message.source || '—';
  return language === 'de'
    ? `${message.name} (ausgehend von Pool "${pool}")`
    : `${message.name} (outgoing from pool "${pool}")`;
}

function addDiagram(pdf, svg, top = diagramMargin) {
  const { node, width, height } = svgDimensions(svg);
  const area = contentSize(pdf, top);
  const scale = Math.min(area.width / width, area.height / height, 1);
  return pdf.svg(node, { x: diagramMargin, y: top, width: width * scale, height: height * scale });
}

function ensureTextLine(pdf, lineHeight) {
  if (pdf.internal.pageSize.getHeight() - pdf.lastY < lineHeight + margin) { pdf.addPage(); pdf.lastY = margin; }
}

function addPlainText(pdf, value, size = 10) {
  pdf.setFontSize(size);
  const lines = pdf.splitTextToSize(value || '—', pdf.internal.pageSize.getWidth() - margin * 2);
  for (const line of lines) { ensureTextLine(pdf, size * .55); pdf.text(line, margin, pdf.lastY); pdf.lastY += size * .55; }
}

export function parseInlineMarkdown(value) {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^\s)]+\)|\*[^*]+\*|_[^_]+_)/g;
  return String(value || '—').split(pattern).filter(Boolean).map(part => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return { text: part.slice(2, -2), style: 'bold' };
    if (part.startsWith('`') && part.endsWith('`')) return { text: part.slice(1, -1), style: 'code' };
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/); if (link) return { text: link[1], style: 'link', url: link[2] };
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) return { text: part.slice(1, -1), style: 'italic' };
    return { text: part, style: 'normal' };
  });
}

export function filenameBase(value, fallback = 'diagram') {
  return String(value || fallback).replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^[_ .-]+|[_ .-]+$/g, '') || fallback;
}

export function svgExportMetadata(tabName, date = new Date()) {
  const stamp = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('') + '-' + [date.getHours(), date.getMinutes(), date.getSeconds()].map(value => String(value).padStart(2, '0')).join('');
  const safeName = filenameBase(tabName, 'diagram');
  return { stamp, filename: `${safeName}_${stamp}.svg` };
}

export function addCallActivitySvgLinks(svg, links) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  for (const { id, path } of links) {
    const target = document.querySelector(`[data-element-id="${String(id).replace(/"/g, '\\"')}"]`);
    if (!target || !path) continue;
    const link = document.createElementNS('http://www.w3.org/2000/svg', 'a'); link.setAttribute('href', String(path).replace(/\.(bpmn|xml)$/i, '.svg').split(/[\\/]/).pop());
    target.parentNode?.replaceChild(link, target); link.appendChild(target);
  }
  return new XMLSerializer().serializeToString(document);
}

function wrappedInlineLines(pdf, segments, width) {
  const lines = [[]]; let lineWidth = 0;
  for (const segment of segments) {
    for (const token of segment.text.split(/(\s+)/).filter(Boolean)) {
      pdf.setFont(segment.style === 'code' ? 'courier' : 'helvetica', segment.style === 'code' || segment.style === 'link' ? 'normal' : segment.style); const tokenWidth = pdf.getTextWidth(token);
      if (lineWidth && lineWidth + tokenWidth > width) { lines.push([]); lineWidth = 0; }
      if (!lineWidth && /^\s+$/.test(token)) continue;
      lines.at(-1).push({ text: token, style: segment.style }); lineWidth += tokenWidth;
    }
  }
  return lines.filter(line => line.length);
}

function addInlineMarkdown(pdf, value, size = 10, indent = 0) {
  pdf.setFontSize(size);
  const lines = wrappedInlineLines(pdf, parseInlineMarkdown(value), pdf.internal.pageSize.getWidth() - margin * 2 - indent);
  for (const line of lines) {
    const lineHeight = size * .55; ensureTextLine(pdf, lineHeight);
    let x = margin + indent;
    for (const segment of line) { const font = segment.style === 'code' ? 'courier' : 'helvetica'; const style = segment.style === 'code' || segment.style === 'link' ? 'normal' : segment.style; pdf.setFont(font, style); if (segment.url) { pdf.setTextColor(0, 80, 180); pdf.textWithLink(segment.text, x, pdf.lastY, { url: segment.url }); pdf.setTextColor(0); } else pdf.text(segment.text, x, pdf.lastY); x += pdf.getTextWidth(segment.text); }
    pdf.lastY += lineHeight;
  }
  pdf.setFont('helvetica', 'normal');
}

// Render the Markdown used in BPMN documentation without leaking its syntax
// into PDFs. The supported CommonMark subset covers headings, paragraphs,
// ordered/unordered lists and inline emphasis/code.
function addText(pdf, value, size = 10) {
  const lines = String(value || '—').split(/\r?\n/);
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (!line.trim()) { addSectionGap(pdf, size * .35); continue; }
    if (headingMatch) {
      const headingSize = Math.max(10, 16 - (headingMatch[1].length - 1) * 1.5);
      pdf.setFont('helvetica', 'bold'); addPlainText(pdf, headingMatch[2], headingSize); pdf.setFont('helvetica', 'normal'); addSectionGap(pdf, 2); continue;
    }
    if (listMatch) {
      const indent = listMatch[1].length * 1.5;
      addInlineMarkdown(pdf, `${listMatch[2] === '-' || listMatch[2] === '*' || listMatch[2] === '+' ? '•' : listMatch[2]} ${listMatch[3]}`, size, indent);
      continue;
    }
    addInlineMarkdown(pdf, line, size);
  }
}

// Kogito's DRD SVG uses browser-rendered labels that svg2pdf cannot always
// preserve. Rasterizing the editor-produced SVG keeps its visible labels intact.
async function addDmnDiagram(pdf, svg, top = diagramMargin) {
  const { width, height } = svgDimensions(svg); const area = contentSize(pdf, top); const scale = Math.min(area.width / width, area.height / height, 1);
  const image = new Image(); const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = blobUrl; });
    const factor = Math.min(2, 4096 / Math.max(width, height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * factor)); canvas.height = Math.max(1, Math.round(height * factor));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', diagramMargin, top, width * scale, height * scale);
  } finally { URL.revokeObjectURL(blobUrl); }
}

function addCodeBlock(pdf, value) {
  const width = pdf.internal.pageSize.getWidth() - margin * 2; const lineHeight = 4.5;
  pdf.setFont('courier', 'normal'); pdf.setFontSize(8);
  for (const line of String(value || '—').split(/\r?\n/)) {
    const lines = pdf.splitTextToSize(line || ' ', width - 6);
    for (const text of lines) { ensureTextLine(pdf, lineHeight); pdf.setFillColor(245); pdf.rect(margin, pdf.lastY - 3.3, width, lineHeight, 'F'); pdf.text(text, margin + 3, pdf.lastY); pdf.lastY += lineHeight; }
  }
  pdf.setFont('helvetica', 'normal');
}

export function expressionCodeSegments(value) {
  return String(value || '').split(/(\[\d+\])/g).filter(Boolean).map(text => ({ text, lineNumber: /^\[\d+\]$/.test(text) }));
}

function addExpressionCodeBlock(pdf, value) {
  const width = pdf.internal.pageSize.getWidth() - margin * 2; const lineHeight = 4.5;
  pdf.setFont('courier', 'normal'); pdf.setFontSize(8);
  const lines = String(value || '—').split(/\r?\n/).flatMap(line => pdf.splitTextToSize(line || ' ', width - 6));
  const availableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  if (lines.length * lineHeight <= availableHeight && pdf.internal.pageSize.getHeight() - pdf.lastY < lines.length * lineHeight + margin) { pdf.addPage(); pdf.lastY = margin; }
  for (const text of lines) {
    ensureTextLine(pdf, lineHeight); pdf.setFillColor(245); pdf.rect(margin, pdf.lastY - 3.3, width, lineHeight, 'F');
    let x = margin + 3;
    for (const segment of expressionCodeSegments(text)) { pdf.setTextColor(segment.lineNumber ? 100 : 35, segment.lineNumber ? 135 : 35, segment.lineNumber ? 150 : 35); pdf.text(segment.text, x, pdf.lastY); x += pdf.getTextWidth(segment.text); }
    pdf.lastY += lineHeight;
  }
  pdf.setTextColor(0); pdf.setFont('helvetica', 'normal');
}

// Leave room for the next section without ever creating a page that contains
// only whitespace; the following heading performs pagination when necessary.
function addSectionGap(pdf, amount = documentSpacing.section) {
  const remaining = pdf.internal.pageSize.getHeight() - margin - pdf.lastY;
  pdf.lastY += Math.min(amount, Math.max(0, remaining));
}

function addEntrySeparator(pdf) {
  addSectionGap(pdf, documentSpacing.separatorBefore);
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  pdf.setDrawColor(190); pdf.setLineWidth(0.2);
  pdf.line(margin, pdf.lastY, margin + width, pdf.lastY);
  pdf.setDrawColor(0); pdf.setLineWidth(0.2);
  addSectionGap(pdf, documentSpacing.separatorAfter);
}

function addDocumentedEntries(pdf, entries, title) {
  entries.forEach((entry, index) => {
    heading(pdf, title(entry), 3);
    if (entry.callActivityFile) { pdf.setFont('helvetica', 'italic'); addPlainText(pdf, entry.callActivityFile, 9); pdf.setFont('helvetica', 'normal'); addSectionGap(pdf, 2); }
    addText(pdf, entry.documentation);
    if (index < entries.length - 1) addEntrySeparator(pdf);
  });
}

function heading(pdf, value, level = 1) {
  const size = [22, 16, 12][level - 1] || 10;
  if (pdf.internal.pageSize.getHeight() - pdf.lastY < size * .8 + 14) { pdf.addPage(); pdf.lastY = margin; }
  if (pdf.collectTableOfContents && (level === 2 || level === 3)) pdf.tableOfContents.push({ title: String(value), level, page: pdf.getCurrentPageInfo().pageNumber });
  addSectionGap(pdf, level === 1 ? 6 : 4); pdf.setFont('helvetica', 'bold'); addPlainText(pdf, value, size); pdf.setFont('helvetica', 'normal'); pdf.lastY += level === 1 ? 7 : 5;
}
// Preserve Markdown line breaks and simple unordered lists inside PDF table cells.
function wrapCellText(pdf, value, width) {
  const lines = [];
  for (const sourceLine of String(value || '—').split(/\r?\n/)) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean); let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || pdf.getTextWidth(candidate) <= width) { current = candidate; continue; }
      lines.push(current); current = word;
      while (pdf.getTextWidth(current) > width && current.length > 1) { let cut = current.length - 1; while (cut > 1 && pdf.getTextWidth(current.slice(0, cut)) > width) cut -= 1; lines.push(current.slice(0, cut)); current = current.slice(cut); }
    }
    lines.push(current || ' ');
  }
  return lines;
}
function markdownCellLines(pdf, value, width) {
  return String(value || '—').split(/\r?\n/).flatMap(line => {
    const listItem = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const indentation = (listItem ? listItem[1] : line.match(/^\s*/)[0]).length * 1.5;
    const text = listItem ? `• ${listItem[2]}` : line.trimStart();
    const wrapped = wrapCellText(pdf, text || ' ', width - indentation);
    return wrapped.map(part => ({ text: part, indentation }));
  });
}
function addFooter(pdf, text) {
  const pageCount = pdf.getNumberOfPages(); const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) { pdf.setPage(page); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100); pdf.text(text, pageWidth / 2, pageHeight - 8, { align: 'center' }); pdf.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' }); }
  pdf.setTextColor(0);
}
function addTableOfContents(pdf, language) {
  const entries = pdf.tableOfContents || []; if (!entries.length) return;
  const perPage = 32; const pages = Math.ceil(entries.length / perPage);
  for (let index = 0; index < pages; index += 1) pdf.insertPage(2 + index, 'a4', 'portrait');
  const title = language === 'de' ? 'Inhaltsverzeichnis' : 'Table of Contents';
  entries.forEach((entry, index) => {
    const tocPage = 2 + Math.floor(index / perPage); const row = index % perPage;
    pdf.setPage(tocPage); pdf.setFont('helvetica', row === 0 ? 'bold' : 'normal'); pdf.setFontSize(row === 0 ? 16 : 10);
    if (row === 0) pdf.text(title, margin, margin + 3);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    const y = margin + 16 + row * 7; const targetPage = entry.page + pages; const indent = entry.level === 3 ? 8 : 0;
    const label = pdf.splitTextToSize(entry.title, 145 - indent)[0]; pdf.text(label, margin + indent, y); pdf.text(String(targetPage), pdf.internal.pageSize.getWidth() - margin, y, { align: 'right' });
    pdf.link(margin + indent, y - 4, 175 - indent, 6, { pageNumber: targetPage });
    if (pdf.outline?.add) pdf.outline.add(null, entry.title, { pageNumber: targetPage });
  });
}
// Draw the scope as a two-column table. Keeping a complete row on one page avoids split or overlapping content.
function addProcessScopeTable(pdf, scope, questions = scope.questions, { boldValues = false } = {}) {
  const questionWidth = 70; const answerWidth = 108; const lineHeight = 5; const pageHeight = pdf.internal.pageSize.getHeight();
  Object.values(scope.scope).forEach((answer, index) => {
    pdf.setFont('helvetica', 'bold'); const question = markdownCellLines(pdf, questions[index], questionWidth - 6);
    pdf.setFont('helvetica', boldValues ? 'bold' : 'normal'); const value = markdownCellLines(pdf, answer, answerWidth - 6);
    const height = Math.max(question.length, value.length) * lineHeight + 6;
    if (pageHeight - pdf.lastY < height + margin) { pdf.addPage(); pdf.lastY = margin; }
    pdf.rect(margin, pdf.lastY, questionWidth, height); pdf.rect(margin + questionWidth, pdf.lastY, answerWidth, height);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    question.forEach((line, lineIndex) => pdf.text(line.text, margin + 3 + line.indentation, pdf.lastY + 5 + lineIndex * lineHeight));
    pdf.setFont('helvetica', boldValues ? 'bold' : 'normal');
    value.forEach((line, lineIndex) => pdf.text(line.text, margin + questionWidth + 3 + line.indentation, pdf.lastY + 5 + lineIndex * lineHeight));
    pdf.lastY += height;
  });
  pdf.lastY += 5;
}
function addHighLevelActivities(pdf, activities, labels) {
  for (const activity of activities) {
    heading(pdf, activity.name || labels.unnamed, 3);
    if (activity.description) addPlainText(pdf, activity.description, 10);
    const endings = activity.endings.filter(ending => ending.endEvent || ending.next);
    if (!endings.length) continue;
    addProcessScopeTable(pdf, { scope: { header: labels.next } }, [labels.endEvent], { boldValues: true });
    addProcessScopeTable(pdf, { scope: Object.fromEntries(endings.map((ending, index) => [index, ending.next])) }, endings.map(ending => ending.endEvent));
  }
}
// Adjust this function when the BPMN report needs additional sections or corporate layout rules.
export async function exportBpmnPdf(svg, docs, language = 'en', footer = 'BPM Modeler', processScopeTitle, processScopeQuestions, timestamp, lastUpdateLabel, filename, subprocesses = [], subprocessLabel, highLevelActivityLabels = {}) {
  const labels = language === 'de'
    ? { fallbackTitle: 'BPMN-Dokumentation', scope: 'Prozessumfang', process: 'Prozess', collaboration: 'Zusammenarbeit', tasks: 'Aktivitäten', messages: 'Nachrichtenflüsse', subprocess: 'Subprozess' }
    : { fallbackTitle: 'BPMN Documentation', scope: 'Process scope', process: 'Process', collaboration: 'Collaboration', tasks: 'Activities', messages: 'Message flows', subprocess: 'Subprocess' };
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }); pdf.lastY = margin;
  heading(pdf, docs.title || labels.fallbackTitle);
  if (timestamp) { addPlainText(pdf, `${lastUpdateLabel || (language === 'de' ? 'Stand' : 'Last Update')}: ${timestamp}`, 10); addSectionGap(pdf, 5); }
  pdf.collectTableOfContents = true; pdf.tableOfContents = [];
  pdf.addPage('a4', 'portrait'); pdf.lastY = margin;
  // The process description introduces the documentation. Process-scope data
  // is stored in the same BPMN documentation field and is rendered as its
  // dedicated table below instead of duplicating its Markdown source here.
  const processDescription = docs.scope.find(entry => entry.type === 'Prozess')?.documentation;
  if (processDescription && !docs.processScope && !docs.highLevelActivities) { addText(pdf, processDescription); addSectionGap(pdf); }
  if (docs.processScope) {
    heading(pdf, processScopeTitle || labels.scope, 2);
    addProcessScopeTable(pdf, docs.processScope, processScopeQuestions || docs.processScope.questions);
  }
  if (docs.highLevelActivities?.length) {
    heading(pdf, highLevelActivityLabels.title || (language === 'de' ? 'Hauptaktivitäten im Top-Level' : 'Top-Level Main Activities'), 2);
    addHighLevelActivities(pdf, docs.highLevelActivities, { unnamed: highLevelActivityLabels.unnamed || (language === 'de' ? 'Ohne Bezeichnung' : 'Unnamed activity'), endEvent: highLevelActivityLabels.endEvent || (language === 'de' ? 'Endereignis' : 'End event'), next: highLevelActivityLabels.next || (language === 'de' ? 'Nächste Top-Level-Aktivität/Endereignis' : 'Next top-level activity/end event') });
  }
  if (svg) {
    if (diagramFitsPortrait(svg)) {
      // Preserve a complete process-scope table above a portrait diagram.
      if (docs.processScope) { pdf.addPage('a4', 'portrait'); pdf.lastY = margin; }
      await addDiagram(pdf, svg, Math.max(pdf.lastY + 6, diagramMargin));
      pdf.addPage('a4', 'portrait'); pdf.lastY = margin;
    } else {
      // A wide or tall BPMN canvas gets its own landscape sheet and is scaled
      // uniformly, so neither its bounds nor labels are clipped.
      pdf.addPage('a4', 'landscape');
      await addDiagram(pdf, svg);
      pdf.addPage('a4', 'portrait'); pdf.lastY = margin;
    }
  }
  for (const x of docs.scope.filter(entry => entry.type !== 'Prozess')) { heading(pdf, `${labels.collaboration}: ${x.name}`, 3); addText(pdf, x.documentation); }
  if (docs.scope.some(entry => entry.type !== 'Prozess')) addSectionGap(pdf);
  heading(pdf, labels.tasks, 2);
  if (subprocesses.length) {
    for (const subprocess of subprocesses) {
      heading(pdf, `${subprocess.name} (${subprocessLabel || labels.subprocess})`, 3);
      // Every subprocess is a self-contained diagram. Use landscape only when
      // its original bounds cannot fit the printable portrait area.
      if (diagramFitsPortrait(subprocess.svg)) {
        await addDiagram(pdf, subprocess.svg, Math.max(pdf.lastY + 6, diagramMargin));
      } else {
        pdf.addPage('a4', 'landscape'); pdf.lastY = diagramMargin;
        await addDiagram(pdf, subprocess.svg);
        pdf.addPage('a4', 'portrait'); pdf.lastY = margin;
      }
      addSectionGap(pdf);
    }
  }
  addDocumentedEntries(pdf, docs.tasks, x => `${x.order}. ${x.name} (${x.type === 'callActivity' ? 'Call Activity' : x.type})`);
  if (docs.messages.length) {
    addSectionGap(pdf);
    heading(pdf, labels.messages, 2);
    addDocumentedEntries(pdf, docs.messages, x => messageFlowTitle(x, language));
  }
  addTableOfContents(pdf, language); addFooter(pdf, footer); pdf.save(filename || 'bpmn-dokumentation.pdf');
}
function addKeyValueTable(pdf, entries) {
  const scope = { scope: Object.fromEntries(entries) };
  addProcessScopeTable(pdf, scope, entries.map(([label]) => label));
}
function addDecisionTable(pdf, table, labels) {
  if (!table.labels.length) return;
  if (table.hitPolicy) addText(pdf, `${labels.hitPolicy}: ${table.hitPolicy}`);
  const available = pdf.internal.pageSize.getWidth() - margin * 2; const columnWidth = available / table.labels.length; const lineHeight = 4.5;
  const drawRow = (cells, header = false) => {
    const lines = cells.map(cell => pdf.splitTextToSize(cell || ' ', columnWidth - 4)); const height = Math.max(...lines.map(cell => cell.length), 1) * lineHeight + 5;
    if (pdf.internal.pageSize.getHeight() - pdf.lastY < height + margin) { pdf.addPage(); pdf.lastY = margin; }
    lines.forEach((cellLines, index) => { const x = margin + index * columnWidth; if (header) { pdf.setFillColor(230, 236, 242); pdf.rect(x, pdf.lastY, columnWidth, height, 'F'); } pdf.rect(x, pdf.lastY, columnWidth, height); pdf.setFont('helvetica', header ? 'bold' : 'normal'); pdf.setFontSize(8); cellLines.forEach((line, lineIndex) => pdf.text(line, x + 2, pdf.lastY + 4 + lineIndex * lineHeight)); });
    pdf.lastY += height;
  };
  drawRow(table.labels, true); table.rows.forEach(row => drawRow(row)); pdf.setFont('helvetica', 'normal'); pdf.lastY += 4;
  const needsDetails = table.rows.some(row => row.some((cell, index) => pdf.getTextWidth(cell || '') > columnWidth - 4));
  if (needsDetails) { addText(pdf, labels.tableDetails); table.rows.forEach((row, rowIndex) => addCodeBlock(pdf, row.map((cell, index) => `${table.labels[index]}: ${cell || '—'}`).join('\n'))); }
}
// Render the DMN boxed-expression hierarchy itself instead of exporting a
// screenshot from Kogito. The light blue header is based on BPM Modeler's UI.
function addBoxedExpression(pdf, node, labels) {
  if (!node) return;
  const rows = boxedExpressionRows(node);
  const columnCount = Math.max(...rows.map(row => row.length), 1);
  // Keep tables in portrait whenever their structure has usable columns there.
  // Landscape is reserved for tables whose number of columns cannot fit at the
  // minimum readable cell width; cell contents always wrap within their column.
  const orientation = boxedExpressionOrientation(node, columnCount);
  if ((orientation === 'landscape') !== (pdf.internal.pageSize.getWidth() > 250)) { pdf.addPage('a4', orientation); pdf.lastY = margin; }
  const width = pdf.internal.pageSize.getWidth() - margin * 2; const lineHeight = 4.5; const columnWidth = width / columnCount;
  const header = node.kind === 'decisionTable' ? (node.hitPolicy ? `${node.kind} (${node.hitPolicy})` : node.kind) : node.kind === 'functionDefinition' ? 'Function Definition' : node.kind;
  const tableHeader = node.kind === 'decisionTable' || node.kind === 'relation';
  const layouts = rows.map((row, rowIndex) => ({ row, rowIndex, lines: row.map((value, index) => { const style = boxedExpressionCellStyle(node, rowIndex, index); const spansColumns = (node.kind === 'functionDefinition' && rowIndex === 1) || (node.kind === 'invocation' && rowIndex === 1); const cellWidth = spansColumns ? width : columnWidth; pdf.setFont(style.code ? 'courier' : 'helvetica', tableHeader && rowIndex === 0 ? 'bold' : style.italic ? 'italic' : 'normal'); pdf.setFontSize(8); return pdf.splitTextToSize(String(value || '—'), cellWidth - 4); }) }));
  const drawBoxHeader = () => { const startY = pdf.lastY; pdf.setFillColor(216, 237, 248); pdf.rect(margin, startY, width, 9, 'F'); pdf.rect(margin, startY, width, 9); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.text(header, margin + 3, startY + 5.8); const headerWidth = pdf.getTextWidth(header); pdf.setTextColor(100, 135, 150); pdf.text(`[${node.line}]`, margin + 5 + headerWidth, startY + 5.8); pdf.setTextColor(0); pdf.lastY += 9; };
  const drawRowPart = (layout, offset, count, isHeader) => { const height = count * lineHeight + 5; const spansColumns = (node.kind === 'functionDefinition' && layout.rowIndex === 1) || (node.kind === 'invocation' && layout.rowIndex === 1); const cells = spansColumns ? 1 : columnCount; for (let index = 0; index < cells; index += 1) { const x = margin + index * columnWidth; const cellWidth = spansColumns ? width : columnWidth; const style = boxedExpressionCellStyle(node, layout.rowIndex, index); if (isHeader && (node.kind !== 'relation' || index > 0)) { pdf.setFillColor(216, 237, 248); pdf.rect(x, pdf.lastY, cellWidth, height, 'F'); } else if (style.code) { pdf.setFillColor(249, 250, 251); pdf.rect(x, pdf.lastY, cellWidth, height, 'F'); } pdf.rect(x, pdf.lastY, cellWidth, height); pdf.setFont(style.code ? 'courier' : 'helvetica', isHeader ? 'bold' : style.italic ? 'italic' : 'normal'); pdf.setFontSize(8); pdf.setTextColor(style.lineNumber ? 100 : 0, style.lineNumber ? 135 : 0, style.lineNumber ? 150 : 0); (layout.lines[index] || []).slice(offset, offset + count).forEach((line, lineIndex) => pdf.text(line, x + 2, pdf.lastY + 4 + lineIndex * lineHeight)); pdf.setTextColor(0); if (node.kind === 'relation' && isHeader && index > 0 && node.columnTypes[index - 1]) { const type = `(${node.columnTypes[index - 1]})`; pdf.setFont('helvetica', 'italic'); pdf.text(type, x + columnWidth / 2, pdf.lastY + height - 4, { align: 'center' }); } } pdf.lastY += height; };
  const columnHeader = tableHeader ? layouts[0] : undefined;
  const beginPage = () => { pdf.addPage('a4', orientation); pdf.lastY = margin; drawBoxHeader(); if (columnHeader) drawRowPart(columnHeader, 0, Math.max(...columnHeader.lines.map(lines => lines.length)), true); };
  const layoutHeight = layout => Math.max(...layout.lines.map(lines => lines.length), 1) * lineHeight + 5;
  const firstContent = layouts[tableHeader ? 1 : 0];
  const minimumInitialHeight = 9 + (columnHeader ? layoutHeight(columnHeader) : 0) + (firstContent ? layoutHeight(firstContent) : 0);
  if (firstContent && pdf.internal.pageSize.getHeight() - margin - pdf.lastY < minimumInitialHeight) { pdf.addPage('a4', orientation); pdf.lastY = margin; }
  const drawLayout = (layout, isHeader = false) => { const lineCount = Math.max(...layout.lines.map(lines => lines.length), 1); let offset = 0; while (offset < lineCount) { const remaining = pdf.internal.pageSize.getHeight() - margin - pdf.lastY - 5; const fullHeight = lineCount * lineHeight + 5; if (offset === 0 && remaining < fullHeight && fullHeight <= pdf.internal.pageSize.getHeight() - margin * 2 - 9) { beginPage(); continue; } if (remaining < lineHeight) { beginPage(); continue; } const count = Math.min(lineCount - offset, Math.max(1, Math.floor(remaining / lineHeight))); drawRowPart(layout, offset, count, isHeader); offset += count; } };
  drawBoxHeader(); if (columnHeader) drawLayout(columnHeader, true); layouts.slice(tableHeader ? 1 : 0).forEach(layout => drawLayout(layout));
  pdf.lastY += 6; pdf.setFont('helvetica', 'normal');
  boxedExpressionChildren(node).filter(child => child.kind !== 'literalExpression').forEach(child => addBoxedExpression(pdf, child, labels));
}
export function boxedExpressionRows(node) {
  if (!node) return [];
  if (node.kind === 'context') return node.entries.map(entry => [`${entry.expression?.line ?? node.line}`, entry.name, expressionLabel(entry.expression)]);
  if (node.kind === 'invocation') return [['Name'], [node.target || '—'], ...node.bindings.map(binding => [binding.name, expressionLabel(binding.expression)])];
  if (node.kind === 'list') return node.items.map(item => [`${item.line}`, expressionLabel(item)]);
  if (node.kind === 'functionDefinition') { const parameters = `(${node.parameters.join(', ')})`; const kind = String(node.functionKind || '').toUpperCase(); const kindCell = kind && kind !== 'FEEL' ? kind[0] : ''; const header = kindCell ? [kindCell, parameters] : [parameters]; return [header, [expressionLabel(node.body)]]; }
  if (node.kind === 'relation') return [['#', ...node.columns], ...node.rows.map((row, index) => [String(index + 1), ...row])];
  if (node.kind === 'decisionTable') return [node.labels, ...node.rows];
  return [[String(node.line), expressionLabel(node)]];
}
export function boxedExpressionChildren(node) {
  if (!node) return [];
  if (node.kind === 'context') return node.entries.map(entry => entry.expression).filter(Boolean);
  if (node.kind === 'invocation') return node.bindings.map(binding => binding.expression).filter(Boolean);
  if (node.kind === 'functionDefinition') return node.body ? [node.body] : [];
  if (node.kind === 'list') return node.items.filter(Boolean);
  return node.children || [];
}
export function boxedExpressionCellStyle(node, rowIndex, index) {
  if (node.kind === 'decisionTable') return { code: rowIndex > 0, italic: false, lineNumber: false };
  if (node.kind === 'relation') return { code: rowIndex > 0 && index > 0, italic: false, lineNumber: false };
  const code = node.kind === 'context' ? index === 2 && node.entries[rowIndex]?.expression?.kind === 'literalExpression'
    : node.kind === 'invocation' ? rowIndex >= 2 && index === 1 && node.bindings[rowIndex - 2]?.expression?.kind === 'literalExpression'
      : node.kind === 'list' ? index === 1 && node.items[rowIndex]?.kind === 'literalExpression'
        : node.kind === 'functionDefinition' ? rowIndex === 1 && index === 0 && node.body?.kind === 'literalExpression'
          : node.kind === 'literalExpression' && index === 1;
  return { code, italic: node.kind === 'context' && index === 1, lineNumber: index === 0 && ['context', 'list', 'literalExpression'].includes(node.kind) };
}
export function boxedExpressionOrientation(node, columnCount) {
  const portraitContentWidth = 210 - margin * 2;
  const minimumColumnWidth = tableNeedsColumnHeader(node) ? 24 : 30;
  return columnCount * minimumColumnWidth > portraitContentWidth ? 'landscape' : 'portrait';
}
function tableNeedsColumnHeader(node) {
  return node.kind === 'decisionTable' || node.kind === 'relation';
}
function expressionLabel(node) {
  if (!node) return '—';
  if (node.kind === 'literalExpression') return node.text || '—';
  if (node.kind === 'functionDefinition') return `Function [${node.line}] (${node.parameters.join(', ')})`;
  if (node.kind === 'decisionTable') return `Decision Table [${node.line}]${node.hitPolicy ? ` (${node.hitPolicy})` : ''}`;
  if (node.kind === 'context') return `Context [${node.line}]`;
  if (node.kind === 'invocation') return `Invocation [${node.line}]`;
  if (node.kind === 'list') return `List [${node.line}]`;
  if (node.kind === 'relation') return `Relation [${node.line}]`;
  return `${node.kind} [${node.line}]`;
}
function addTestCaseTable(pdf, labels, testCase) {
  const entries = Object.entries(testCase.inputs || {}); const expected = Object.entries(testCase.expectedOutputs || {}).filter(([, value]) => value !== null);
  const rows = [...entries.map(([name, value]) => [labels.input, name, JSON.stringify(value)]), ...expected.map(([name, value]) => [labels.expected, name, JSON.stringify(value)])];
  if (!rows.length) return addKeyValueTable(pdf, [[labels.input, '—']]);
  const widths = [34, 62, pdf.internal.pageSize.getWidth() - margin * 2 - 96]; const lineHeight = 4.5;
  for (const [group, name, value] of rows) { const lines = [group, name, value].map((cell, index) => pdf.splitTextToSize(cell || '—', widths[index] - 5)); const height = Math.max(...lines.map(cell => cell.length)) * lineHeight + 6; if (pdf.internal.pageSize.getHeight() - pdf.lastY < height + margin) { pdf.addPage(); pdf.lastY = margin; } let x = margin; lines.forEach((cell, index) => { pdf.rect(x, pdf.lastY, widths[index], height); pdf.setFont('helvetica', index === 0 ? 'bold' : index === 1 && group === labels.input ? 'italic' : 'normal'); pdf.setFontSize(9); cell.forEach((line, lineIndex) => pdf.text(line, x + 2, pdf.lastY + 4.5 + lineIndex * lineHeight)); x += widths[index]; }); pdf.lastY += height; }
  pdf.lastY += 5; pdf.setFont('helvetica', 'normal');
}
export function dmnElementHeading(element, language = 'en') {
  const elementType = element.kind === 'businessKnowledgeModel' ? 'BKM'
    : element.kind === 'knowledgeSource' ? 'Knowledge Source'
      : element.kind === 'decisionService' ? 'Decision Service'
        : ({ decisionTable: 'Decision Table', context: 'Context', literalExpression: 'Literal Expression', functionDefinition: 'Function Definition', invocation: 'Invocation', relation: 'Relation', list: 'List' }[element.expressionKind] || 'Decision');
  return `${element.name} (${elementType})`;
}
export async function exportDmnPdf(svg, model, language = 'en', footer = 'BPM Modeler', timestamp, lastUpdateLabel, filename, testSuite, localizedLabels) {
  const fallbackLabels = language === 'de'
    ? { fallbackTitle: 'DMN-Dokumentation', modelTitle: 'Entscheidungsmodell', drd: 'Decision Requirements Diagram (DRD)', inputs: 'Input Data', logic: 'Entscheidungslogik-Ebene', type: 'Datentyp', values: 'Format/Werte', result: 'Ergebnistyp', source: 'Quelle', locationUri: 'Location URI', boxed: 'Boxed Expression', description: 'Beschreibung', question: 'Frage', allowedAnswers: 'Erlaubte Antworten', hitPolicy: 'Hit Policy', tableDetails: 'Ausführliche Regeln', tests: 'Testfälle', test: 'Testfall', input: 'Eingabe', expected: 'Erwartetes Ergebnis', dataTypes: 'Datentypen', isCollection: 'Ist Liste', yes: 'Ja', no: 'Nein', includedModels: 'Eingebundene DMN Entscheidungsmodelle' }
    : { fallbackTitle: 'DMN Documentation', modelTitle: 'Decision Model', drd: 'Decision Requirements Diagram (DRD)', inputs: 'Input Data', logic: 'Decision Logic Level', type: 'Type', values: 'Format/values', result: 'Result type', source: 'Source', locationUri: 'Location URI', boxed: 'Boxed expression', description: 'Description', question: 'Question', allowedAnswers: 'Allowed answers', hitPolicy: 'Hit policy', tableDetails: 'Detailed rules', tests: 'Test cases', test: 'Test case', input: 'Input', expected: 'Expected result', dataTypes: 'Data Type', isCollection: 'Is Collection?', yes: 'Yes', no: 'No', includedModels: 'Included Decision Models' };
  const labels = { ...fallbackLabels, ...localizedLabels };
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }); pdf.lastY = margin;
  const inputs = Array.isArray(model.inputs) ? model.inputs : []; const decisions = Array.isArray(model.decisions) ? model.decisions : [];
  heading(pdf, model.title ? `${labels.modelTitle}: ${model.title}` : labels.fallbackTitle); if (timestamp) { addPlainText(pdf, `${lastUpdateLabel || (language === 'de' ? 'Stand' : 'Last Update')}: ${timestamp}`, 10); addSectionGap(pdf, 5); }
  pdf.collectTableOfContents = true; pdf.tableOfContents = []; pdf.addPage('a4', 'portrait'); pdf.lastY = margin;
  if (model.description) addText(pdf, model.description);
  if (svg) { heading(pdf, labels.drd, 2); if (diagramFitsPortrait(svg)) { await addDmnDiagram(pdf, svg, Math.max(pdf.lastY + 6, diagramMargin)); } else { pdf.addPage('a4', 'landscape'); pdf.lastY = diagramMargin; await addDmnDiagram(pdf, svg); pdf.addPage('a4', 'portrait'); pdf.lastY = margin; } addSectionGap(pdf); }
  if (inputs.length) { heading(pdf, labels.inputs, 2); for (const input of inputs) { heading(pdf, input.name, 3); addInlineMarkdown(pdf, `${labels.type}: *${input.type}*`); if (input.allowed) addText(pdf, `${labels.values}: ${input.allowed}`); if (input.description) addText(pdf, input.description); if (input.question) addText(pdf, `${labels.question}: ${input.question}`); if (input.allowedAnswers) addText(pdf, `${labels.allowedAnswers}: ${input.allowedAnswers}`); } }
  if (model.dataTypes?.length) { heading(pdf, labels.dataTypes, 2); for (const dataType of model.dataTypes) { heading(pdf, dataType.name, 3); addKeyValueTable(pdf, [[labels.isCollection, dataType.isCollection ? labels.yes : labels.no], [labels.type, dataType.type], ...(dataType.allowed ? [[labels.values, dataType.allowed]] : [])]); } }
  if (decisions.length) { addSectionGap(pdf); heading(pdf, labels.logic, 2); for (const decision of decisions) { heading(pdf, dmnElementHeading(decision, language), 3); const metadata = [[labels.result, decision.kind !== 'knowledgeSource' ? decision.type : ''], [labels.source, decision.source], [labels.locationUri, decision.locationUri], [labels.question, decision.question], [labels.allowedAnswers, decision.allowedAnswers]].filter(([, value]) => value); if (metadata.length) addKeyValueTable(pdf, metadata); if (decision.description) { addText(pdf, `${labels.description}:`); addText(pdf, decision.description); } if (decision.expressionTree) { addBoxedExpression(pdf, decision.expressionTree, labels); addExpressionCodeBlock(pdf, decision.expression); } } }
  if (model.includedModels?.length) { heading(pdf, labels.includedModels, 2); for (const included of model.includedModels) { heading(pdf, included.name || included.filename, 3); if (included.filename) { pdf.setFont('helvetica', 'italic'); addPlainText(pdf, included.filename, 9); pdf.setFont('helvetica', 'normal'); } } }
  const cases = testSuite?.testCases; if (Array.isArray(cases) && cases.length) { addSectionGap(pdf); heading(pdf, labels.tests, 2); for (const testCase of cases) { heading(pdf, testCase.name || labels.test, 3); addTestCaseTable(pdf, labels, testCase); } }
  addTableOfContents(pdf, language); addFooter(pdf, footer); pdf.save(filename || 'dmn-dokumentation.pdf');
}

export function pdfExportMetadata(tabName, date = new Date()) {
  const stamp = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('') + '-' + [date.getHours(), date.getMinutes(), date.getSeconds()].map(value => String(value).padStart(2, '0')).join('');
  const safeName = filenameBase(tabName, 'dmn-documentation');
  return { stamp, filename: `${safeName}_${stamp}.pdf` };
}
