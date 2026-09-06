import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pdfExportMetadata } from '../src/pdf.js';

const root = resolve(import.meta.dirname, '..');

describe('DMN PDF filename', () => {
  it('uses the DMN model title instead of the opened filename', () => {
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');

    expect(app).toContain("const metadata = pdfExportMetadata(documentation.title || tabTitle || path || 'dmn-documentation', date);");
    expect(pdfExportMetadata('Sales price decision', new Date(2026, 7, 28, 9, 10, 11)).filename).toBe('Sales_price_decision_20260828-091011.pdf');
  });
});
