// This adapter hides the Kogito standalone editor API from the rest of the app.
const emptyDmn = `<?xml version="1.0" encoding="UTF-8"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" id="definitions_1" name="Neues Entscheidungsmodell" namespace="https://bpm-modeler.local/dmn"><inputData id="InputData_1" name="Eingabe"><variable id="InputData_1_var" name="Eingabe" typeRef="string"/></inputData><decision id="Decision_1" name="Entscheidung"><variable id="Decision_1_var" name="Entscheidung" typeRef="string"/><literalExpression id="LiteralExpression_1"><text></text></literalExpression></decision><dmndi:DMNDI><dmndi:DMNDiagram id="DRD_1" name="DRD"><dmndi:DMNShape id="InputData_1_di" dmnElementRef="InputData_1"><dc:Bounds x="100" y="100" width="125" height="50"/></dmndi:DMNShape><dmndi:DMNShape id="Decision_1_di" dmnElementRef="Decision_1"><dc:Bounds x="350" y="100" width="125" height="50"/></dmndi:DMNShape></dmndi:DMNDiagram></dmndi:DMNDI></definitions>`;

export const kogitoDmnPlugin = {
  createEmptyModel: () => emptyDmn,
  async createEditor(container, { initialContent, resources = [], onContentChanged, onError } = {}) {
    const Dmn = await import('@kie-tools/dmn-editor-standalone/dist');
    // Packaged Electron applications use file:// and therefore have no usable
    // browser origin. Kogito expects "*" in this case, on every desktop OS.
    const origin = window.location.protocol === 'file:' ? '*' : window.location.origin;
    // The current standalone API resolves relative imports against this path.
    // All sibling resources are keyed with their portable POSIX file names.
    const includedResources = new Map(resources.filter(resource => resource?.name && typeof resource.content === 'string').map(resource => [resource.name, { contentType: 'text', content: Promise.resolve(resource.content) }]));
    const editor = Dmn.open({ container, initialContent: Promise.resolve(initialContent || emptyDmn), initialFileNormalizedPosixPathRelativeToTheWorkspaceRoot: 'model.dmn', readOnly: false, origin, resources: includedResources, onError: () => onError?.(new Error('The DMN editor rejected its content.')) });
    const callback = () => editor.getContent().then(onContentChanged).catch(error => onError?.(error));
    if (onContentChanged) editor.subscribeToContentChanges(callback);
    return {
      load: async xml => editor.setContent('model.dmn', xml),
      serialize: async () => editor.getContent(),
      previewSvg: async () => editor.getPreview(),
      fitViewport: () => {},
      destroy: async () => {
        // Kogito performs part of its teardown asynchronously. A rejected
        // teardown must not break another open document when this tab closes.
        try { if (onContentChanged) editor.unsubscribeToContentChanges(callback); } catch { /* The editor may already be disposed. */ }
        try { await editor.close(); } catch { /* Closing an already disposed editor is harmless. */ }
      },
      markAsSaved: () => editor.markAsSaved()
    };
  }
};
