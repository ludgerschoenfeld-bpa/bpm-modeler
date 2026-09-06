import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const eventBus = { on: vi.fn(), off: vi.fn() };
  const canvas = { getRootElement: vi.fn(), getRootElements: vi.fn(), setRootElement: vi.fn() };
  const modeler = {
    get: vi.fn(service => ({ eventBus, canvas }[service])),
    saveSVG: vi.fn(),
    destroy: vi.fn()
  };
  return { eventBus, canvas, modeler, BpmnModeler: vi.fn(function () { return modeler; }) };
});

vi.mock('bpmn-js/lib/Modeler', () => ({ default: mocks.BpmnModeler }));

import { bpmnIoPlugin } from '../src/plugins/bpmnIoPlugin.js';

describe('BPMN modeler plugin', () => {
  it('listens for model changes through the bpmn.io event bus', async () => {
    const onContentChanged = vi.fn();
    const editor = await bpmnIoPlugin.createEditor(document.createElement('div'), { onContentChanged });

    expect(mocks.eventBus.on).toHaveBeenCalledWith('commandStack.changed', expect.any(Function));
    mocks.eventBus.on.mock.calls[0][1]();
    expect(onContentChanged).toHaveBeenCalledOnce();
    editor.destroy();
    expect(mocks.eventBus.off).toHaveBeenCalledWith('commandStack.changed', expect.any(Function));
  });

  it('declares a BPMN extension for interoperable color persistence', async () => {
    await bpmnIoPlugin.createEditor(document.createElement('div'));

    expect(mocks.BpmnModeler).toHaveBeenCalledWith(expect.objectContaining({
      moddleExtensions: expect.objectContaining({ bpmModelerColor: expect.objectContaining({ prefix: 'bpmc' }) })
    }));
  });

  it('keeps the legacy bpml namespace so stored Call Activity links remain exportable', async () => {
    await bpmnIoPlugin.createEditor(document.createElement('div'));

    expect(mocks.BpmnModeler).toHaveBeenCalledWith(expect.objectContaining({
      moddleExtensions: expect.objectContaining({ bpmModelerCallLink: expect.objectContaining({ prefix: 'bpml', uri: 'https://bpm-modeler.local/schema/call-link/1.0' }) })
    }));
  });

  it('collects the top-level process and every subprocess diagram for PDF documentation', async () => {
    const process = { businessObject: { $type: 'bpmn:Process', id: 'Process_1', name: 'Order' } };
    const subprocess = { businessObject: { $type: 'bpmn:SubProcess', id: 'SubProcess_1', name: 'Check order', flowElements: [{}] } };
    mocks.canvas.getRootElement.mockReturnValue(subprocess);
    mocks.canvas.getRootElements.mockReturnValue([process, subprocess]);
    mocks.modeler.saveSVG.mockImplementation(async () => ({ svg: `<svg>${mocks.canvas.setRootElement.mock.calls.at(-1)[0].businessObject.id}</svg>` }));
    const editor = await bpmnIoPlugin.createEditor(document.createElement('div'));

    await expect(editor.previewDocumentationSvgs()).resolves.toEqual({
      process: '<svg>Process_1</svg>',
      subprocesses: [{ name: 'Check order', svg: '<svg>SubProcess_1</svg>' }]
    });
    expect(mocks.canvas.setRootElement).toHaveBeenLastCalledWith(subprocess);
  });
});
