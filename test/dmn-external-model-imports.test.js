import { describe, expect, it } from 'vitest';
import { dmnSummary, includeDmnModels, removeDmnModelImports } from '../src/dmn.js';

const mainModel = `<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20191111/MODEL/" id="main" name="Main decision" namespace="https://example.test/main">
  <dmn:extensionElements><vendor:metadata xmlns:vendor="https://example.test/vendor"/></dmn:extensionElements>
  <dmn:decision id="result" name="Result"/>
</dmn:definitions>`;

const externalModel = `<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20191111/MODEL/" id="taxes" name="Tax rates" namespace="https://example.test/taxes">
  <dmn:decision id="vat" name="VAT"/>
</dmn:definitions>`;

describe('DMN external-model import regression', () => {
  it('creates one durable, usable import while preserving the existing main-model XML', () => {
    const included = includeDmnModels(mainModel, [{ name: 'tax-rates.dmn', content: externalModel }]);

    expect(included).toContain('<dmn:extensionElements><vendor:metadata');
    expect(included).toContain('<dmn:import id="import_tax-rates.dmn" name="Tax rates" namespace="https://example.test/taxes" locationURI="tax-rates.dmn" importType="https://www.omg.org/spec/DMN/20191111/MODEL/"/>');
    expect(included).toContain('<dmn:decision id="result" name="Result"/>');
    expect(includeDmnModels(included, [{ name: 'tax-rates.dmn', content: externalModel }])).toBe(included);
  });

  it('exposes the persisted import to the PDF documentation with its name and file reference', () => {
    const included = includeDmnModels(mainModel, [{ name: 'tax-rates.dmn', content: externalModel }]);

    expect(dmnSummary(included).includedModels).toEqual([
      { name: 'Tax rates', filename: 'tax-rates.dmn' }
    ]);
  });

  it('removes only the selected external model import', () => {
    const secondModel = externalModel.replace('Tax rates', 'Pricing').replace('https://example.test/taxes', 'https://example.test/pricing');
    const included = includeDmnModels(mainModel, [
      { name: 'tax-rates.dmn', content: externalModel },
      { name: 'pricing.dmn', content: secondModel }
    ]);
    const removed = removeDmnModelImports(included, ['tax-rates.dmn']);

    expect(dmnSummary(removed).includedModels).toEqual([
      { name: 'Pricing', filename: 'pricing.dmn' }
    ]);
  });

  it('gives generated imports a stable, unique DMN id', () => {
    const withExistingId = mainModel.replace('<dmn:decision id="result"', '<dmn:decision id="import_tax-rates.dmn"/><dmn:decision id="result"');
    const included = includeDmnModels(withExistingId, [{ name: 'tax-rates.dmn', content: externalModel }]);

    expect(included).toContain('<dmn:import id="import_tax-rates.dmn_2"');
  });
});
