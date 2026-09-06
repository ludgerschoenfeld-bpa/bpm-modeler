import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tokenSimulationPlugin, tokenSimulationVisibilityModule } from '../src/plugins/tokenSimulationPlugin.js';
import { bpmnIoPlugin } from '../src/plugins/bpmnIoPlugin.js';

const root = resolve(import.meta.dirname, '..');

const seminarRegistrationProcess = readFileSync(resolve(root, 'test/bpmn/seminaranmeldung-abwickeln.bpmn'), 'utf8');

describe('BPMN token simulation plugin', () => {
  it('starts disabled and contributes no bpmn-js modules', () => {
    const session = tokenSimulationPlugin.createSession();
    expect(session.isEnabled()).toBe(false);
    expect(session.getAdditionalModules()).toEqual([]);
  });

  it('enables and disables the simulator without retaining technical state in the UI', () => {
    const session = tokenSimulationPlugin.createSession();
    session.setEnabled(true);
    expect(session.isEnabled()).toBe(true);
    expect(session.getAdditionalModules()).toEqual(expect.arrayContaining([tokenSimulationVisibilityModule]));
    expect(session.getAdditionalModules()).toHaveLength(2);
    session.setEnabled(false);
    expect(session.isEnabled()).toBe(false);
    expect(session.getAdditionalModules()).toEqual([]);
  });

  it('keeps simulator controls visible when a large model is fitted below 50 percent zoom', () => {
    // Regression: bpmn-js-token-simulation sets minZoom: 0.5 for these
    // overlays. The wide seminar-registration collaboration is fitted below
    // that threshold, previously hiding its message-start play control.
    const additions = [];
    const overlays = { add: (...args) => additions.push(args) };
    const install = tokenSimulationVisibilityModule.tokenSimulationOverlayVisibility[1];

    install(overlays);
    overlays.add({ id: 'MessageStart' }, 'bts-context-menu', { show: { minZoom: 0.5 } });
    overlays.add({ id: 'Task_1' }, 'bts-token-count', { show: { minZoom: 0.5 } });
    overlays.add({ id: 'Other' }, 'other-overlay', { show: { minZoom: 0.5 } });

    expect(additions[0][2].show.minZoom).toBe(0);
    expect(additions[1][2].show.minZoom).toBe(0);
    expect(additions[2][2].show.minZoom).toBe(0.5);
  });

  it('enters simulation mode immediately after the BPMN editor enables the plugin', () => {
    const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');

    expect(app).toContain('if (nextEnabled) modeler.current?.activateSimulation?.();');
  });

  it('adds a visible play button to the message start event in the seminar registration collaboration', async () => {
    // jsdom does not currently provide CSS.escape, while diagram-js uses it
    // to construct palette selectors during model import.
    window.CSS ??= {};
    window.CSS.escape ??= value => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\_');
    SVGElement.prototype.getBBox ??= () => ({ x: 0, y: 0, width: 500, height: 300 });
    globalThis.SVGMatrix ??= class SVGMatrix { constructor() { Object.assign(this, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }); } translate() { return new globalThis.SVGMatrix(); } scale() { return new globalThis.SVGMatrix(); } multiply() { return new globalThis.SVGMatrix(); } inverse() { return new globalThis.SVGMatrix(); } };
    const matrix = () => new globalThis.SVGMatrix();
    const transform = () => ({ matrix: matrix(), setTranslate(x, y) { this.matrix.e = x; this.matrix.f = y; }, setScale(value) { this.matrix.a = value; this.matrix.d = value; }, setRotate: () => {}, setMatrix(value) { this.matrix = value; } });
    SVGSVGElement.prototype.createSVGMatrix ??= matrix;
    SVGSVGElement.prototype.createSVGTransform ??= transform;
    SVGSVGElement.prototype.createSVGTransformFromMatrix ??= value => ({ ...transform(), matrix: value });
    SVGSVGElement.prototype.createSVGPoint ??= () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) });
    SVGElement.prototype.getTotalLength ??= () => 100;
    SVGElement.prototype.getPointAtLength ??= length => ({ x: length, y: length });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => ({ measureText: text => ({ width: String(text).length * 7, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }) }) });
    globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} unobserve() {} };
    // diagram-js reads the browser-only SVGTransformList while positioning
    // simulator overlays. JSDOM deliberately omits it, so provide only the
    // identity transform needed by this visual integration test.
    const transformLists = new WeakMap();
    Object.defineProperty(SVGElement.prototype, 'transform', { configurable: true, get() {
      if (!transformLists.has(this)) transformLists.set(this, { baseVal: { clear: () => {}, appendItem: () => {}, createSVGTransformFromMatrix: value => ({ ...transform(), matrix: value }), consolidate: () => ({ matrix: matrix() }) } });
      return transformLists.get(this);
    } });
    const host = document.createElement('div');
    document.body.append(host);
    const session = tokenSimulationPlugin.createSession();
    session.setEnabled(true);
    const editor = await bpmnIoPlugin.createEditor(host, { featureSessions: [session] });
    try {
      await editor.load(seminarRegistrationProcess);
      editor.activateSimulation();
      const playButton = host.querySelector('[data-container-id="Event_196cg4n"] .bts-context-pad[title="Trigger Event"]');
      expect(playButton).not.toBeNull();
      expect(playButton.classList.contains('hidden')).toBe(false);
      expect(playButton.querySelector('svg')).not.toBeNull();
      playButton.click();
      expect(host.querySelector('[data-container-id="Gateway_04ity1f"] .bts-context-pad')).not.toBeNull();
    } finally {
      editor.destroy();
      host.remove();
    }
  });
});
