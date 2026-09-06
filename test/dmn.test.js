import { describe, expect, it } from 'vitest';
import { dmnSummary, includeDmnModels, removeDmnModelImports } from '../src/dmn.js';

const xml = `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">
  <inputData id="age" name="Alter"><variable name="Alter" typeRef="number"/><allowedValues><text>[18..120]</text></allowedValues></inputData>
  <decision id="price" name="Preis bestimmen"><variable name="Preis" typeRef="number"/>
    <context><contextEntry><variable name="Basis"/><literalExpression><text>100</text></literalExpression></contextEntry><contextEntry><literalExpression><text>Basis * 1.19</text></literalExpression></contextEntry></context>
  </decision>
  <businessKnowledgeModel id="rate" name="Tarif"><variable name="Tarif" typeRef="function"/><functionDefinition><literalExpression><text>rate</text></literalExpression></functionDefinition></businessKnowledgeModel>
</definitions>`;

describe('DMN PDF report extraction', () => {
  it('exports input name, type and allowed values', () => {
    expect(dmnSummary(xml).inputs).toMatchObject([{ name: 'Alter', type: 'number', allowed: '[18..120]' }]);
  });

  it('exports decision logic type, return type and nested boxed-expression text', () => {
    const [decision, bkm] = dmnSummary(xml).decisions;
    expect(decision).toMatchObject({ name: 'Preis bestimmen', kind: 'decision', type: 'number' });
    expect(decision.expression).toContain('[1] {');
    expect(decision.expression).toContain('Basis * 1.19');
    expect(bkm).toMatchObject({ name: 'Tarif', kind: 'businessKnowledgeModel', type: 'function' });
    expect(bkm.expression).toContain('[1] function() rate');
  });

  it('uses the DMN definitions name and numbers nested boxed expressions', () => {
    const summary = dmnSummary(xml);
    expect(summary.title).toBe('');
    expect(summary.decisions[0].expression).toContain('[2] 100');
  });

  it('extracts decision-table rules and the hit policy without exposing XML markup', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" name="VAT"><decision name="Rate"><variable typeRef="number"/><decisionTable hitPolicy="UNIQUE"><input><inputExpression><text>Product group</text></inputExpression></input><output name="VAT"/><rule><inputEntry><text>\"SERVICE\"</text></inputEntry><outputEntry><text>0.19</text></outputEntry></rule></decisionTable></decision></definitions>`);
    expect(summary.decisions[0]).toMatchObject({ expressionKind: 'decisionTable', decisionTable: { hitPolicy: 'UNIQUE', labels: ['Product group', 'VAT'], rows: [['"SERVICE"', '0.19']] } });
    expect(summary.decisions[0].expression).toContain('[1] decisionTable (UNIQUE)');
  });

  it('extracts a BKM encapsulated logic as a function from its XML kind, parameters and body', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><businessKnowledgeModel name="Total Day calculation"><variable typeRef="number"/><encapsulatedLogic kind="FEEL"><formalParameter name="pStartDate" typeRef="date"/><formalParameter name="pEndDate" typeRef="date"/><literalExpression><text>((pEndDate-pStartDate).days)+1</text></literalExpression></encapsulatedLogic></businessKnowledgeModel></definitions>`);
    expect(summary.decisions[0]).toMatchObject({ kind: 'businessKnowledgeModel', expressionKind: 'functionDefinition', expression: '[1] function(pStartDate, pEndDate) ((pEndDate-pStartDate).days)+1', expressionTree: { functionKind: 'FEEL', parameters: ['pStartDate', 'pEndDate'], body: { kind: 'literalExpression', text: '((pEndDate-pStartDate).days)+1' } } });
  });

  it('extracts optional Knowledge Source fields without assigning a result type', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><knowledgeSource name="Tax Act" source="Federal law" locationURI="https://example.test/tax"><description>Current tax law</description></knowledgeSource><knowledgeSource name="No metadata"/></definitions>`);
    expect(summary.decisions).toMatchObject([{ kind: 'knowledgeSource', name: 'Tax Act', source: 'Federal law', locationUri: 'https://example.test/tax', description: 'Current tax law', type: '' }, { kind: 'knowledgeSource', name: 'No metadata', source: '', locationUri: '', description: '', type: '' }]);
  });

  it('skips absent optional description and decision-table children without failing', () => {
    expect(() => dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><decision name="Incomplete"><decisionTable><input/><output/><rule/></decisionTable></decision></definitions>`)).not.toThrow();
    expect(dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><decision name="Incomplete"><decisionTable><input/><output/><rule/></decisionTable></decision></definitions>`).decisions[0].decisionTable).toMatchObject({ labels: ['Input 1', 'Output 1'], rows: [[]] });
  });

  it('extracts custom data types, included models and an expression tree for visual rendering', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><itemDefinition name="tProducts" isCollection="true"><typeRef>string</typeRef><allowedValues><text>"BOOK", "SERVICE"</text></allowedValues></itemDefinition><import name="Taxes" locationURI="taxes.dmn"/><decision name="Price"><context><contextEntry><variable name="Net"/><literalExpression><text>100</text></literalExpression></contextEntry></context></decision></definitions>`);
    expect(summary.dataTypes).toEqual([{ name: 'tProducts', isCollection: true, type: 'string', allowed: '"BOOK", "SERVICE"' }]);
    expect(summary.includedModels).toEqual([{ name: 'Taxes', filename: 'taxes.dmn' }]);
    expect(summary.decisions[0].expressionTree).toMatchObject({ kind: 'context', entries: [{ name: 'Net', expression: { kind: 'literalExpression', text: '100' } }] });
  });

  it('creates durable DMN imports for selected external models and keeps their resource filenames', () => {
    const main = '<?xml version="1.0"?><dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20191111/MODEL/" name="Main" namespace="https://example.test/main"><dmn:decision name="Result"/></dmn:definitions>';
    const external = '<?xml version="1.0"?><dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20191111/MODEL/" name="Tax rates" namespace="https://example.test/taxes"><dmn:decision name="VAT"/></dmn:definitions>';
    const included = includeDmnModels(main, [{ name: 'tax-rates.dmn', content: external }]);
    expect(dmnSummary(included).includedModels).toEqual([{ name: 'Tax rates', filename: 'tax-rates.dmn' }]);
    expect(included).toContain('<dmn:import id="import_tax-rates.dmn" name="Tax rates" namespace="https://example.test/taxes" locationURI="tax-rates.dmn"');
    expect(includeDmnModels(included, [{ name: 'tax-rates.dmn', content: external }])).toBe(included);
  });

  it('removes the matching durable import when an external model is removed', () => {
    const xml = '<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><import name="Tax rates" locationURI="tax-rates.dmn"/><import name="Prices" locationURI="prices.dmn"/></definitions>';
    expect(removeDmnModelImports(xml, ['tax-rates.dmn'])).not.toContain('tax-rates.dmn');
    expect(removeDmnModelImports(xml, ['tax-rates.dmn'])).toContain('prices.dmn');
  });

  it('extracts relation columns, their data types, and ordered rows for the PDF table', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><decision name="Relation"><relation><column name="column-1" typeRef="context"/><column name="column-2" typeRef="date"/><row><literalExpression><text>{ a: 1 }</text></literalExpression><literalExpression><text>date("2026-08-24")</text></literalExpression></row></relation></decision></definitions>`);
    expect(summary.decisions[0].expressionTree).toMatchObject({ kind: 'relation', columns: ['column-1', 'column-2'], columnTypes: ['context', 'date'], rows: [['{ a: 1 }', 'date("2026-08-24")']] });
  });

  it('extracts the XML function kind, parameters and formal FEEL function expression', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><decision name="Calculate"><functionDefinition kind="FEEL"><formalParameter name="net"/><formalParameter name="rate"/><literalExpression><text>net * rate</text></literalExpression></functionDefinition></decision></definitions>`);
    expect(summary.decisions[0].expressionTree).toMatchObject({ kind: 'functionDefinition', functionKind: 'FEEL', parameters: ['net', 'rate'], body: { kind: 'literalExpression', text: 'net * rate' } });
    expect(summary.decisions[0].expression).toBe('[1] function(net, rate) net * rate');
  });

  it('retains a nested boxed expression in a BKM function body', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><businessKnowledgeModel name="Period"><encapsulatedLogic kind="FEEL"><formalParameter name="start"/><formalParameter name="end"/><context><contextEntry><variable name="days"/><literalExpression><text>(end - start).days</text></literalExpression></contextEntry><contextEntry><literalExpression><text>days + 1</text></literalExpression></contextEntry></context></encapsulatedLogic></businessKnowledgeModel></definitions>`);
    expect(summary.decisions[0].expressionTree).toMatchObject({ kind: 'functionDefinition', parameters: ['start', 'end'], body: { kind: 'context', entries: [{ name: 'days', expression: { kind: 'literalExpression', text: '(end - start).days' } }, { name: '<result>', expression: { kind: 'literalExpression', text: 'days + 1' } }] } });
    expect(summary.decisions[0].expression).toBe('[1] function(start, end) [2] {\n  days:     [3] (end - start).days,\n  <result>: [4] days + 1\n}');
  });

  it('aligns Context values after their keys in the formal FEEL text', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><businessKnowledgeModel name="Aligned"><encapsulatedLogic kind="FEEL"><context><contextEntry><variable name="short"/><literalExpression><text>if A
then B</text></literalExpression></contextEntry><contextEntry><variable name="longerKey"/><literalExpression><text>if C
then D</text></literalExpression></contextEntry><contextEntry><literalExpression><text>longerKey</text></literalExpression></contextEntry></context></encapsulatedLogic></businessKnowledgeModel></definitions>`);
    expect(summary.decisions[0].expression).toBe('[1] function() [2] {\n  short:     [3] if A\n             then B,\n  longerKey: [4] if C\n             then D,\n  <result>:  [5] longerKey\n}');
  });

  it('documents a boxed list in its formal FEEL form', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><decision name="Fruit"><list><literalExpression><text>Apple</text></literalExpression><literalExpression><text>Birnen</text></literalExpression></list></decision></definitions>`);
    expect(summary.decisions[0].expression).toBe('[1] [Apple, Birnen]');
  });

  it('extracts the function-valued expression and bindings of a boxed invocation', () => {
    const summary = dmnSummary(`<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"><businessKnowledgeModel name="Total Day calculation"><encapsulatedLogic kind="FEEL"><formalParameter name="pStartDate"/><formalParameter name="pEndDate"/><literalExpression><text>((pEndDate-pStartDate).days)+1</text></literalExpression></encapsulatedLogic></businessKnowledgeModel><decision name="Determine Total Days"><invocation><literalExpression><text>Total Day calculation</text></literalExpression><binding><parameter name="pStartDate"/><literalExpression><text>Start Date</text></literalExpression></binding><binding><parameter name="pEndDate"/><literalExpression><text>End Date</text></literalExpression></binding></invocation></decision></definitions>`);
    expect(summary.decisions.find(item => item.name === 'Determine Total Days')).toMatchObject({ expressionTree: { kind: 'invocation', target: 'Total Day calculation', bindings: [{ name: 'pStartDate', expression: { kind: 'literalExpression', text: 'Start Date' } }, { name: 'pEndDate', expression: { kind: 'literalExpression', text: 'End Date' } }] } });
  });
});
