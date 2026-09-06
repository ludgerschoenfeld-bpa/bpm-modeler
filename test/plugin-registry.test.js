import { describe, expect, it } from 'vitest';
import { extensionPoints } from '../src/core/contracts.js';
import { registerPlugin, resolvePlugin } from '../src/plugins/registry.js';

describe('plugin registry', () => {
  it('allows a BPMN modeler implementation to be replaced through its business port', () => {
    const original = resolvePlugin(extensionPoints.BPMN_MODELER);
    const replacement = {
      createEmptyModel: () => '<definitions />',
      createEditor: async () => ({ load: async () => {}, serialize: async () => '<definitions />', previewSvg: async () => '<svg/>', fitViewport: () => {}, destroy: () => {} })
    };
    registerPlugin(extensionPoints.BPMN_MODELER, replacement);
    expect(resolvePlugin(extensionPoints.BPMN_MODELER)).toBe(replacement);
    registerPlugin(extensionPoints.BPMN_MODELER, original);
  });

  it('rejects plugins that do not fulfill the declared port', () => {
    expect(() => registerPlugin(extensionPoints.DMN_DOCUMENTATION, {})).toThrow('missing: extract');
    expect(() => registerPlugin(extensionPoints.DMN_EVALUATOR, { evaluate: async () => ({}) })).toThrow('missing: activate');
  });
});
