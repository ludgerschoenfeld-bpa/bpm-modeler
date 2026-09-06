// cmmn-js 0.20 ships its browserified modeler bundle; using it avoids its
// legacy CommonJS source tree being interpreted as native ESM by Vite.
import CmmnModeler from 'cmmn-js/dist/cmmn-modeler.development.js';
import 'cmmn-js/dist/assets/diagram-js.css';
import 'cmmn-js/dist/assets/cmmn-font/css/cmmn.css';

const colors = { red: '#F8D7DA', blue: '#DCEEFF', green: '#DDF3E4', yellow: '#FFF5C2', orange: '#FFE2C2' };
const modelerExtension = { name: 'BPM Modeler CMMN extension', uri: 'https://bpm-modeler.local/schema/cmmn-link/1.0', prefix: 'bpml', xml: { tagAlias: 'lowerCase' }, types: [
  { name: 'ModelLink', superClass: ['Element'], properties: [{ name: 'path', type: 'String', isAttr: true }, { name: 'type', type: 'String', isAttr: true }] },
  { name: 'Color', superClass: ['Element'], properties: [{ name: 'value', type: 'String', isAttr: true }] }
] };
const emptyCmmn = `<?xml version="1.0" encoding="UTF-8"?><cmmn:definitions xmlns:dc="http://www.omg.org/spec/CMMN/20151109/DC" xmlns:cmmndi="http://www.omg.org/spec/CMMN/20151109/CMMNDI" xmlns:cmmn="http://www.omg.org/spec/CMMN/20151109/MODEL" id="Definitions_1" name="New case" targetNamespace="http://bpm-modeler.local"><cmmn:case id="Case_1" name="New case"><cmmn:casePlanModel id="CasePlanModel_1" name="New case"/></cmmn:case><cmmndi:CMMNDI><cmmndi:CMMNDiagram id="CMMNDiagram_1"><cmmndi:Size width="800" height="500"/><cmmndi:CMMNShape id="CasePlanModel_1_di" cmmnElementRef="CasePlanModel_1"><dc:Bounds x="80" y="60" width="600" height="360"/><cmmndi:CMMNLabel/></cmmndi:CMMNShape></cmmndi:CMMNDiagram></cmmndi:CMMNDI></cmmn:definitions>`;
const promise = (fn, options) => new Promise((resolve, reject) => fn(options, (error, value) => error ? reject(error) : resolve(value)));
const definitionFor = element => element?.businessObject?.definitionRef || element?.businessObject;
const typeFor = definition => ({ 'cmmn:ProcessTask': 'bpmn', 'cmmn:DecisionTask': 'dmn', 'cmmn:CaseTask': 'cmmn' })[definition?.$type];

export const cmmnIoPlugin = {
  createEmptyModel: () => emptyCmmn,
  async createEditor(container, { onContentChanged, onSelectionChanged, onModelLinkEditRequested, linkControlLabel = 'Manage link' } = {}) {
    const modeler = new CmmnModeler({ container, moddleExtensions: { bpmModeler: modelerExtension } });
    const eventBus = modeler.get('eventBus');
    const extension = (definition, name) => definition?.extensionElements?.values?.find(value => value.$type === `bpml:${name}`);
    const linkDetails = element => { const definition = definitionFor(element); const type = typeFor(definition); return type ? { id: definition.id, name: definition.name || definition.id, path: extension(definition, 'ModelLink')?.path || '', type } : null; };
    const overlays = modeler.get('overlays'); const linkOverlayIds = new Map();
    const removeLinkControl = id => { const overlay = linkOverlayIds.get(id); if (overlay) overlays.remove(overlay); linkOverlayIds.delete(id); };
    const addLinkControl = element => {
      const details = linkDetails(element); if (!details || linkOverlayIds.has(element.id)) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'cmmn-link-control'; button.title = linkControlLabel; button.setAttribute('aria-label', linkControlLabel); button.textContent = '↗';
      button.addEventListener('mousedown', event => event.stopPropagation()); button.addEventListener('click', event => { event.stopPropagation(); onModelLinkEditRequested?.(details); });
      linkOverlayIds.set(element.id, overlays.add(element, { position: { bottom: -22, right: 2 }, html: button }));
    };
    const refreshLinkControls = () => { modeler.get('elementRegistry').getAll().forEach(element => { removeLinkControl(element.id); addLinkControl(element); }); };
    const selectionChanged = event => { const selected = event.newSelection || []; onSelectionChanged?.(selected.length > 0); };
    const selectedElements = () => modeler.get('selection').get();
    const paint = (element, color) => { const gfx = modeler.get('elementRegistry').getGraphics(element); gfx?.querySelectorAll('.djs-visual > rect').forEach(node => node.style.fill = color || '#fff'); };
    const colorExtension = definition => extension(definition, 'Color');
    const restoreExtensionColors = () => modeler.get('elementRegistry').getAll().forEach(element => paint(element, colors[colorExtension(definitionFor(element))?.value]));
    const contentChanged = () => { refreshLinkControls(); onContentChanged?.(); };
    eventBus.on('commandStack.changed', contentChanged); eventBus.on('selection.changed', selectionChanged);
    return {
      load: xml => promise(modeler.importXML.bind(modeler), xml).then(() => { restoreExtensionColors(); refreshLinkControls(); modeler.get('commandStack').clear(); modeler.get('canvas').zoom('fit-viewport'); }),
      serialize: () => promise(modeler.saveXML.bind(modeler), { format: true }), previewSvg: () => promise(modeler.saveSVG.bind(modeler), {}), fitViewport: () => modeler.get('canvas').zoom('fit-viewport'),
      hasElements: () => modeler.get('elementRegistry').getAll().some(element => element.businessObject?.$type === 'cmmn:PlanItem'),
      setModelLink: async (id, path, type) => { const item = modeler.get('elementRegistry').getAll().find(element => definitionFor(element)?.id === id); const definition = definitionFor(item); if (!definition || !item) return; const moddle = modeler.get('moddle'); const modeling = modeler.get('modeling'); const previous = extension(definition, 'ModelLink'); const extensions = moddle.create('cmmn:ExtensionElements', { values: [...(definition.extensionElements?.values || []).filter(value => value !== previous), ...(path ? [moddle.create('bpml:ModelLink', { path: String(path).trim(), type })] : [])] }); modeling.updateProperties(definition, { extensionElements: extensions }, [item]); refreshLinkControls(); },
      colorSelected: async color => { if (!colors[color]) return false; const moddle = modeler.get('moddle'); const modeling = modeler.get('modeling'); const selected = selectedElements().filter(element => definitionFor(element)); selected.forEach(element => { const definition = definitionFor(element); const previous = colorExtension(definition); const extensions = definition.extensionElements || moddle.create('cmmn:ExtensionElements', { values: [] }); if (!definition.extensionElements) modeling.updateProperties(definition, { extensionElements: extensions }); extensions.values = [...extensions.values.filter(value => value !== previous), moddle.create('bpml:Color', { value: color })]; paint(element, colors[color]); }); return selected.length > 0; },
      restoreSelectedColor: async () => { const selected = selectedElements().filter(element => definitionFor(element)); selected.forEach(element => { const definition = definitionFor(element); const previous = colorExtension(definition); if (previous && definition.extensionElements) definition.extensionElements.values = definition.extensionElements.values.filter(value => value !== previous); paint(element); }); return selected.length > 0; },
      copySelected: () => modeler.get('copyPaste').copy(selectedElements()), cutSelected: () => { const selected = selectedElements(); modeler.get('copyPaste').copy(selected); modeler.get('modeling').removeElements(selected); }, paste: () => modeler.get('copyPaste').paste(), destroy: () => { eventBus.off('commandStack.changed', contentChanged); eventBus.off('selection.changed', selectionChanged); linkOverlayIds.forEach(id => overlays.remove(id)); modeler.destroy(); }
    };
  }
};
