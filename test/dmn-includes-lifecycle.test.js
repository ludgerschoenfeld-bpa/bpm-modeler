import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(import.meta.dirname, '../src/App.jsx'), 'utf8');

describe('DMN included-model editor lifecycle', () => {
  it('serializes Kogito resource replacements instead of overlapping iframe teardown and startup', () => {
    expect(source).toContain('function DmnEditorHost({ modelerPlugin, initialContent, resources, reloadKey, onContentChanged, onReady, onLoading, onError })');
    expect(source).toContain('const host = useRef(); const instance = useRef(); const queue = useRef(Promise.resolve());');
    expect(source).toContain('if (previous) await previous.destroy();');
    expect(source).toContain('host.current?.replaceChildren();');
    expect(source).toContain('onLoading={() => { editor.current = undefined; setStatus(message(\'status.dmnLoading\')); }}');
    expect(source).toContain('queue.current = queue.current.then(initialize, initialize)');
    expect(source).toContain('}, [resources, reloadKey]);');
    expect(source).toContain('const next = await modelerPlugin.createEditor(host.current, { initialContent, resources, onContentChanged: value => !disposed && onContentChanged(value), onError: error => !disposed && onError(error) });');
    expect(source).not.toContain('<DmnEditorHost key={resourceKey}');
  });

  it('writes the import directly and reopens Kogito so each checkbox can be selected or cleared', () => {
    expect(source).toContain('const toggleExternalModel = (model, include) => {');
    expect(source).toContain('include ? includeDmnModels(xml, [model]) : removeDmnModelImports(xml, [model.name])');
    expect(source).toContain('const [editorReload, setEditorReload] = useState(0);');
    expect(source).toContain('setEditorReload(revision => revision + 1);');
    expect(source).toContain('reloadKey={editorReload}');
    expect(source).toContain('importedFilenames={importedFilenames}');
    expect(source).toContain('onToggleImport={toggleExternalModel}');
  });

  it('keeps a changed XML buffer saveable while Kogito replaces its resources', () => {
    expect(source).toContain('const changeQueue = useRef(Promise.resolve());');
    expect(source).toContain('changeQueue.current = changeQueue.current.then(change, change);');
  });

  it('loads sibling resources before opening a saved model that can already contain imports', () => {
    expect(source).toContain('const [resourcesReady, setResourcesReady]');
    expect(source).toContain('loadSiblingResources(initialPath).catch(() => {}).finally(() => { if (!disposed) setResourcesReady(true); });');
    expect(source).toContain('{resourcesReady ? <DmnEditorHost');
    expect(source).toContain('const siblingResources = await api.loadDmnResources?.(file.path) || [];');
  });
});
