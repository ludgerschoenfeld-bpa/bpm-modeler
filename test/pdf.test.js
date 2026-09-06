import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { dmnSummary } from '../src/dmn.js';
import { addCallActivitySvgLinks, boxedExpressionCellStyle, boxedExpressionChildren, boxedExpressionOrientation, boxedExpressionRows, diagramFitsPortrait, dmnElementHeading, documentSpacing, exportDmnPdf, expressionCodeSegments, filenameBase, messageFlowTitle, parseInlineMarkdown, pdfExportMetadata, svgExportMetadata } from '../src/pdf.js';

const svg = (width, height) => `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"/>`;

describe('BPMN PDF layout', () => {
  it('keeps only diagrams that fit at 100 percent on a portrait DIN A4 page', () => {
    expect(diagramFitsPortrait(svg(600, 500))).toBe(true);
    expect(diagramFitsPortrait(svg(1300, 500))).toBe(false);
    expect(diagramFitsPortrait(svg(600, 1200))).toBe(false);
  });

  it('creates localized Message Flow titles with the source pool', () => {
    const message = { name: 'Status anfordern', sourcePool: 'Antragsteller' };
    expect(messageFlowTitle(message, 'de')).toBe('Status anfordern (ausgehend von Pool "Antragsteller")');
    expect(messageFlowTitle(message, 'en')).toBe('Status anfordern (outgoing from pool "Antragsteller")');
  });

  it('retains every title component when it wraps for DIN A4', () => {
    const title = messageFlowTitle({ name: 'Sehr langer Message Flow Name mit fachlicher Beschreibung', sourcePool: 'Pool mit einem sehr langen fachlichen Namen' }, 'de');
    expect(title).toContain('Sehr langer Message Flow Name mit fachlicher Beschreibung');
    expect(title).toContain('(ausgehend von Pool "Pool mit einem sehr langen fachlichen Namen")');
  });

  it('uses consistent breathing room between entries and sections', () => {
    expect(documentSpacing).toEqual({ separatorBefore: 3, separatorAfter: 8, section: 8 });
  });

  it('parses inline Markdown without retaining markup characters', () => {
    expect(parseInlineMarkdown('**Fett** und *kursiv* sowie `Code`')).toEqual([
      { text: 'Fett', style: 'bold' }, { text: ' und ', style: 'normal' },
      { text: 'kursiv', style: 'italic' }, { text: ' sowie ', style: 'normal' },
      { text: 'Code', style: 'code' }
    ]);
  });

  it('creates portable PDF filenames from tab names and a single timestamp', () => {
    expect(pdfExportMetadata('Ärger / Preis?.dmn', new Date(2026, 7, 19, 8, 5, 3))).toEqual({ stamp: '20260819-080503', filename: 'Arger_Preis_20260819-080503.pdf' });
  });

  it('creates safe base names for save and export dialogs', () => {
    expect(filenameBase('TEST Case: ÄÖÜ ß', 'case')).toBe('TEST_Case_AOU_ss');
  });

  it('creates timestamped SVG names and adds only available Call Activity links', () => {
    const date = new Date(2026, 7, 19, 8, 5, 3);
    expect(svgExportMetadata('Ärger / Preis?.bpmn', date).filename).toBe('Arger_Preis_20260819-080503.svg');
    expect(addCallActivitySvgLinks('<svg xmlns="http://www.w3.org/2000/svg"><g data-element-id="Call_1"/></svg>', [{ id: 'Call_1', path: 'C:\\models\\child.bpmn' }])).toContain('href="child.svg"');
  });

  it('labels the decision-logic heading with its top-level type only', () => {
    expect(dmnElementHeading({ name: 'Price', kind: 'decision', expressionKind: 'context' }, 'en')).toBe('Price (Context)');
    expect(dmnElementHeading({ name: 'Rate table', kind: 'decision', expressionKind: 'decisionTable' }, 'de')).toBe('Rate table (Decision Table)');
    expect(dmnElementHeading({ name: 'Rule', kind: 'businessKnowledgeModel', expressionKind: 'literalExpression' }, 'en')).toBe('Rule (BKM)');
    expect(dmnElementHeading({ name: 'Law', kind: 'knowledgeSource' }, 'en')).toBe('Law (Knowledge Source)');
  });

  it('uses a process name for an SVG filename', () => {
    expect(svgExportMetadata('PDA Seminaranmeldung abwickeln', new Date(2026, 7, 24, 12, 33, 23)).filename).toBe('PDA_Seminaranmeldung_abwickeln_20260824-123323.svg');
  });

  it('visually separates expression line numbers from FEEL code', () => {
    expect(expressionCodeSegments('eligible: [2] date > start')).toEqual([
      { text: 'eligible: ', lineNumber: false }, { text: '[2]', lineNumber: true }, { text: ' date > start', lineNumber: false }
    ]);
  });

  it('renders nested boxed expressions as their own tables while keeping literals in cells', () => {
    const nested = { kind: 'context', line: 2, entries: [] };
    const literal = { kind: 'literalExpression', line: 3, text: '42' };
    expect(boxedExpressionChildren({ kind: 'context', entries: [{ expression: literal }, { expression: nested }] })).toEqual([literal, nested]);
    expect(boxedExpressionChildren({ kind: 'functionDefinition', body: nested })).toEqual([nested]);
    expect(boxedExpressionRows({ kind: 'functionDefinition', line: 1, functionKind: 'FEEL', parameters: ['start', 'end'], body: nested })).toEqual([
      ['(start, end)'], ['Context [2]']
    ]);
    expect(boxedExpressionRows({ kind: 'context', line: 1, entries: [{ name: 'nested', expression: nested }, { name: 'literal', expression: literal }] })).toEqual([
      ['2', 'nested', 'Context [2]'], ['3', 'literal', '42']
    ]);
    expect(boxedExpressionRows({ kind: 'context', line: 1, entries: [{ name: 'table', expression: { kind: 'decisionTable', line: 8, hitPolicy: 'UNIQUE', labels: [], rows: [] } }] })).toEqual([
      ['8', 'table', 'Decision Table [8] (UNIQUE)']
    ]);
    expect(boxedExpressionRows({ kind: 'functionDefinition', line: 4, functionKind: 'FEEL', parameters: ['net', 'rate'], body: { kind: 'literalExpression', line: 5, text: 'net * rate' } })).toEqual([
      ['(net, rate)'], ['net * rate']
    ]);
    expect(boxedExpressionRows({ kind: 'functionDefinition', line: 4, functionKind: 'Java', parameters: ['input'], body: { kind: 'literalExpression', line: 5, text: 'return input;' } })).toEqual([
      ['J', '(input)'], ['return input;']
    ]);
    expect(boxedExpressionRows({ kind: 'list', items: [{ kind: 'literalExpression', line: 3, text: 'Apple' }, { kind: 'literalExpression', line: 4, text: 'Birnen' }] })).toEqual([
      ['3', 'Apple'], ['4', 'Birnen']
    ]);
    expect(boxedExpressionRows({ kind: 'invocation', line: 2, target: 'Total Day calculation', bindings: [{ name: 'pStartDate', expression: { kind: 'literalExpression', line: 3, text: 'Start Date' } }, { name: 'pEndDate', expression: { kind: 'literalExpression', line: 4, text: 'End Date' } }] })).toEqual([
      ['Name'], ['Total Day calculation'], ['pStartDate', 'Start Date'], ['pEndDate', 'End Date']
    ]);
    expect(boxedExpressionCellStyle({ kind: 'context', entries: [{ expression: literal }] }, 0, 1)).toEqual({ code: false, italic: true, lineNumber: false });
    expect(boxedExpressionCellStyle({ kind: 'functionDefinition', body: literal }, 1, 0)).toEqual({ code: true, italic: false, lineNumber: false });
    expect(boxedExpressionCellStyle({ kind: 'list', items: [literal] }, 0, 1)).toEqual({ code: true, italic: false, lineNumber: false });
    expect(boxedExpressionCellStyle({ kind: 'invocation', bindings: [{ expression: literal }] }, 2, 1)).toEqual({ code: true, italic: false, lineNumber: false });
    expect(boxedExpressionCellStyle({ kind: 'decisionTable' }, 1, 0)).toEqual({ code: true, italic: false, lineNumber: false });
    expect(boxedExpressionCellStyle({ kind: 'relation' }, 1, 0)).toEqual({ code: false, italic: false, lineNumber: false });
    expect(boxedExpressionOrientation({ kind: 'decisionTable' }, 6)).toBe('portrait');
    expect(boxedExpressionOrientation({ kind: 'decisionTable' }, 8)).toBe('landscape');
  });

  it('exports an invocation with single-cell heading rows in the large working-days model', async () => {
    const xml = await readFile('test/dmn/Determine number of working days in the vacation period_090423.dmn', 'utf8');

    await expect(exportDmnPdf(null, dmnSummary(xml))).resolves.toBeUndefined();
  });

});
