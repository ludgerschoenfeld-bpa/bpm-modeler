import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const editor = {
    getContent: vi.fn().mockResolvedValue('<definitions />'),
    getPreview: vi.fn(), setContent: vi.fn(), subscribeToContentChanges: vi.fn(),
    unsubscribeToContentChanges: vi.fn(), close: vi.fn(), markAsSaved: vi.fn()
  };
  return { editor, open: vi.fn(() => editor) };
});

vi.mock('@kie-tools/dmn-editor-standalone/dist', () => ({ open: mocks.open }));

import { kogitoDmnPlugin } from '../src/plugins/kogitoDmnPlugin.js';
import { includeDmnModels } from '../src/dmn.js';

describe('Kogito DMN modeler plugin', () => {
  it('initializes the editor with an opened model instead of the empty template', async () => {
    const xml = '<definitions name="Opened model" />';
    await kogitoDmnPlugin.createEditor(document.createElement('div'), { initialContent: xml });

    expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ initialContent: expect.any(Promise), initialFileNormalizedPosixPathRelativeToTheWorkspaceRoot: 'model.dmn' }));
    await expect(mocks.open.mock.calls[0][0].initialContent).resolves.toBe(xml);
  });

  it('returns the Kogito SVG preview through the modeler port', async () => {
    mocks.editor.getPreview.mockResolvedValue('<svg><text>Decision</text></svg>');
    const editor = await kogitoDmnPlugin.createEditor(document.createElement('div'));

    await expect(editor.previewSvg()).resolves.toBe('<svg><text>Decision</text></svg>');
    expect(mocks.editor.getPreview).toHaveBeenCalledOnce();
  });

  it('passes sibling DMN models to Kogito as named text resources', async () => {
    await kogitoDmnPlugin.createEditor(document.createElement('div'), { resources: [{ name: 'taxes.dmn', content: '<definitions name="Taxes" />' }] });

    const resources = mocks.open.mock.calls.at(-1)[0].resources;
    expect(resources.get('taxes.dmn')).toMatchObject({ contentType: 'text', content: expect.any(Promise) });
    await expect(resources.get('taxes.dmn').content).resolves.toContain('Taxes');
  });

  it('reports an asynchronous editor load failure through the modeler port', async () => {
    const onError = vi.fn();
    await kogitoDmnPlugin.createEditor(document.createElement('div'), { onError });

    mocks.open.mock.calls.at(-1)[0].onError();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'The DMN editor rejected its content.' }));
  });

  it('keeps the persisted external-import filename identical to the Kogito resource key', async () => {
    const external = '<definitions name="Taxes" namespace="https://example.test/taxes" />';
    const main = '<definitions name="Main" namespace="https://example.test/main" />';
    const includedMain = includeDmnModels(main, [{ name: 'taxes.dmn', content: external }]);

    await kogitoDmnPlugin.createEditor(document.createElement('div'), { initialContent: includedMain, resources: [{ name: 'taxes.dmn', content: external }] });

    const options = mocks.open.mock.calls.at(-1)[0];
    await expect(options.initialContent).resolves.toContain('locationURI="taxes.dmn"');
    await expect(options.resources.get('taxes.dmn').content).resolves.toBe(external);
  });

  it('waits for Kogito to close before a replacement editor is created', async () => {
    mocks.editor.close.mockResolvedValueOnce(undefined);
    const editor = await kogitoDmnPlugin.createEditor(document.createElement('div'));

    await expect(editor.destroy()).resolves.toBeUndefined();
    expect(mocks.editor.close).toHaveBeenCalled();
  });
});
